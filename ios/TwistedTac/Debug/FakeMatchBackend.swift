import Foundation
import TwistedTacKit

#if DEBUG
/// A scripted stand-in for the server, used by unit tests and by the
/// `-previewOnline` debug launch argument so every online screen can be
/// exercised without an account or a second player.
final class FakeMatchBackend: MatchBackend {
    var row: MatchRow?
    var opponentName: String? = "Rival"
    /// When set, `submitMove` throws this message instead of succeeding.
    var moveError: String?
    private(set) var presenceCalls: [Bool] = []
    private(set) var submittedMoves: [Int] = []
    private var continuation: AsyncStream<MatchEvent>.Continuation?

    init(row: MatchRow?) { self.row = row }

    func fetch(id: String) async throws -> MatchRow? { row }

    func submitMove(id: String, cellIndex: Int) async throws -> MatchRow {
        submittedMoves.append(cellIndex)
        if let moveError { throw MatchService.ServiceError(message: moveError) }
        guard var current = row, let config = current.config.rulesConfig,
              let result = applyMove(config, board: current.board, layerWinners: current.layerWinners,
                                     index: cellIndex, isXNext: current.isXNext)
        else { throw MatchService.ServiceError(message: "Invalid move") }
        current.board = result.board
        current.layerWinners = result.layerWinners
        current.isXNext = result.isXNext
        current.winner = result.winner
        current.draw = result.draw
        let finished = result.winner != nil || result.draw
        current.status = finished ? .finished : .active
        current.currentTurnUserId = finished ? nil : current.userId(for: result.isXNext ? .x : .o)
        current.revision += 1
        row = current
        return current
    }

    func forfeit(id: String) async throws -> MatchRow {
        guard var current = row else { throw MatchService.ServiceError(message: "Match not found") }
        if current.status == .waiting {
            current.status = .abandoned
            current.abandonReason = "cancelled"
        } else {
            // The caller is whoever the test says; tests set `forfeitingUserID`.
            current.status = .finished
            current.winner = forfeitWinner
            current.abandonReason = "voluntary_forfeit"
            current.currentTurnUserId = nil
        }
        current.revision += 1
        row = current
        return current
    }

    var forfeitWinner: Player? = .o

    func setPresence(id: String, connected: Bool) async { presenceCalls.append(connected) }
    func username(of userID: String) async -> String? { opponentName }

    func events(for id: String) -> AsyncStream<MatchEvent> {
        AsyncStream { continuation in
            self.continuation = continuation
            continuation.yield(.subscribed)
        }
    }

    /// Pushes a realtime update, as the server would.
    func push(_ row: MatchRow) {
        self.row = row
        continuation?.yield(.row(row))
    }
}

extension MatchRow {
    /// A sample row for tests and previews. Host plays X.
    static func sample(
        status: MatchStatus = .active,
        size: Int = 3,
        viewMode: ViewMode = .cube,
        host: String = "host",
        guest: String? = "guest",
        revision: Int = 1
    ) -> MatchRow {
        let config = MatchConfig(size: size, viewMode: viewMode).rulesConfig!
        let state = GameState(config: config)
        return MatchRow(
            id: "match-1", roomCode: "K7M2QX", hostId: host, guestId: guest, status: status,
            config: MatchConfig(size: size, viewMode: viewMode),
            board: state.board, layerWinners: state.layerWinners,
            isXNext: true, hostPlaysX: true, winner: nil, draw: false,
            currentTurnUserId: status == .active ? host : host,
            hostDisconnectedAt: nil, guestDisconnectedAt: nil,
            hostLastSeenAt: nil, guestLastSeenAt: nil, abandonReason: nil,
            createdAt: "2026-10-25T10:00:00+00:00", updatedAt: "2026-10-25T10:00:00+00:00",
            revision: revision
        )
    }
}
#endif
