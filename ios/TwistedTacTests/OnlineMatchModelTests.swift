import Foundation
import Testing
import TwistedTacKit
@testable import TwistedTac

/// Drives OnlineMatchModel against a scripted server: "me" hosts and plays X,
/// "rival" is the guest and plays O.
@MainActor
struct OnlineMatchModelTests {
    private func make(
        _ configure: (inout MatchRow) -> Void = { _ in },
        moveError: String? = nil
    ) -> (model: OnlineMatchModel, backend: FakeMatchBackend) {
        var row = MatchRow.sample(status: .active, host: "me", guest: "rival")
        configure(&row)
        let backend = FakeMatchBackend(row: row)
        backend.moveError = moveError
        return (OnlineMatchModel(match: row, userID: "me", backend: backend)!, backend)
    }

    private func settle() async { try? await Task.sleep(for: .milliseconds(80)) }

    @Test("I am X as host, and it is my turn")
    func seats() {
        let (model, _) = make()
        #expect(model.mySymbol == .x)
        #expect(model.isMyTurn)
        #expect(model.acceptsInput)
        #expect(model.xName == "You")
    }

    @Test("my move appears at once and the server confirms it")
    func optimisticMove() async {
        let (model, backend) = make()
        model.humanTap(13)
        #expect(model.match.board[13] == .x)
        #expect(model.pendingMove == 13)
        #expect(!model.acceptsInput)

        await model.inFlight?.value
        #expect(model.pendingMove == nil)
        #expect(model.match.revision == 2)
        #expect(model.match.currentTurnUserId == "rival")
        #expect(backend.submittedMoves == [13])
    }

    @Test("taps are ignored when it is the opponent's turn")
    func notMyTurn() {
        let (model, backend) = make { $0.currentTurnUserId = "rival"; $0.isXNext = false }
        model.humanTap(13)
        #expect(model.match.board[13] == nil)
        #expect(backend.submittedMoves.isEmpty)
    }

    @Test("a second tap while a move is in flight is ignored")
    func noDoubleSubmit() async {
        let (model, backend) = make()
        model.humanTap(13)
        model.humanTap(4)
        await model.inFlight?.value
        #expect(backend.submittedMoves == [13])
    }

    @Test("a rejected move is rolled back and reported")
    func failedMove() async {
        let (model, _) = make(moveError: "Not your turn")
        model.humanTap(13)
        await model.inFlight?.value
        #expect(model.errorMessage == "Not your turn")
        #expect(model.match.board[13] == nil)
        #expect(model.pendingMove == nil)
        #expect(model.acceptsInput)
    }

    @Test("an illegal tap never reaches the server")
    func illegalTap() {
        let (model, backend) = make { row in
            row.board[13] = .o
            row.layerWinners[2] = LayerResult(winner: .o, line: [18, 19, 20])
        }
        model.humanTap(13)   // occupied
        model.humanTap(22)   // locked layer
        #expect(backend.submittedMoves.isEmpty)
    }

    @Test("claiming a layer raises the layer banner")
    func layerClaim() async {
        let (model, _) = make { row in
            row.board[0] = .x; row.board[1] = .x
            row.board[3] = .o; row.board[4] = .o
        }
        model.humanTap(2)
        #expect(model.layerEvent?.layerNumber == 1)
        #expect(model.layerEvent?.winner == .x)
        await model.inFlight?.value
        #expect(model.match.layerWinners[0].winner == .x)
    }

    @Test("a winning move ends the match with me as the winner")
    func winningMove() async {
        let (model, _) = make { row in
            row.board[0] = .x; row.board[9] = .x
            row.board[3] = .o; row.board[4] = .o
        }
        model.humanTap(18)   // completes the 0-9-18 column through the stack
        await model.inFlight?.value
        #expect(model.outcome == .win(.x))
        #expect(model.rankOutcome == .win)
        #expect(model.winningLine == [0, 9, 18])
        #expect(!model.isPlaying)
    }

    @Test("the opponent's realtime move updates the board and hands me the turn")
    func opponentMove() async {
        let (model, backend) = make { $0.currentTurnUserId = "rival"; $0.isXNext = false }
        model.start()
        await settle()

        var next = model.match
        next.board[4] = .o
        next.isXNext = true
        next.currentTurnUserId = "me"
        next.revision = 2
        backend.push(next)
        await settle()

        #expect(model.match.board[4] == .o)
        #expect(model.isMyTurn)
        #expect(model.lastMove == 4)
        model.stop()
    }

    @Test("a stale realtime row is ignored")
    func staleRow() async {
        let (model, backend) = make { $0.revision = 5 }
        model.start()
        await settle()
        var old = model.match
        old.board[0] = .o
        old.revision = 3
        backend.push(old)
        await settle()
        #expect(model.match.board[0] == nil)
        model.stop()
    }

    @Test("a disconnect update shows without disturbing my pending move")
    func presenceMerge() async {
        let (model, backend) = make()
        model.start()
        await settle()
        #expect(!model.opponentDisconnected)

        var presence = model.match
        presence.guestDisconnectedAt = "2026-10-25T10:00:00+00:00"
        backend.push(presence)   // same revision: presence only
        await settle()
        #expect(model.opponentDisconnected)
        #expect(model.opponentDisconnectedAt == "2026-10-25T10:00:00+00:00")
        model.stop()
    }

    @Test("forfeiting hands the win to the opponent")
    func forfeit() async {
        let (model, backend) = make()
        backend.forfeitWinner = .o
        let ok = await model.forfeit()
        #expect(ok)
        #expect(model.match.status == .finished)
        #expect(model.outcome == .win(.o))
        #expect(model.rankOutcome == .loss)
        #expect(model.match.abandonReason == "voluntary_forfeit")
    }

    @Test("cancelling a waiting room abandons it")
    func cancelRoom() async {
        let (model, _) = make { row in
            row.status = .waiting; row.guestId = nil
        }
        #expect(await model.forfeit())
        #expect(model.match.status == .abandoned)
    }

    @Test("the guest joining is picked up while waiting")
    func guestJoins() async {
        let (model, backend) = make { row in
            row.status = .waiting; row.guestId = nil
        }
        model.start()
        await settle()
        #expect(model.match.status == .waiting)

        var joined = model.match
        joined.status = .active
        joined.guestId = "rival"
        joined.revision = 2
        backend.push(joined)
        await settle()
        #expect(model.match.status == .active)
        #expect(model.opponentName == "Rival")
        model.stop()
    }

    @Test("presence heartbeats start on launch and stop on exit")
    func presence() async {
        let (model, backend) = make()
        model.start()
        await settle()
        #expect(backend.presenceCalls.first == true)
        model.stop()
        await settle()
        #expect(backend.presenceCalls.last == false)
    }

    @Test("a draw on the last cell is reported as a draw")
    func draw() async {
        // 2x2x2: X claims nothing, the board fills with no line.
        let (model, _) = make { row in
            let config = MatchConfig(size: 3, viewMode: .flat)
            row.config = config
            let state = GameState(config: config.rulesConfig!)
            row.board = state.board
            row.layerWinners = state.layerWinners
            // X O X / X O O / O X _ — X to move on the last cell, no line results.
            let marks: [Player?] = [.x, .o, .x, .x, .o, .o, .o, .x, nil]
            row.board = marks
        }
        model.humanTap(8)
        await model.inFlight?.value
        #expect(model.outcome == .draw)
        #expect(model.rankOutcome == .draw)
    }
}
