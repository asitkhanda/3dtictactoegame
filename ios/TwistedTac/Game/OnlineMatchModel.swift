import Foundation
import Observation
import TwistedTacKit

enum ConnectionStatus: Equatable {
    case synced, reconnecting
}

/// One online match from the player's seat: the authoritative row from the
/// server, kept fresh by realtime, plus optimistic moves, presence and the
/// sound cues. Mirrors useMatch.ts and OnlineGamePage.tsx.
@Observable
final class OnlineMatchModel: BoardGameSource {
    let matchID: String
    let userID: String
    let config: GameRulesConfig

    private(set) var match: MatchRow
    private(set) var connection: ConnectionStatus = .synced
    private(set) var opponentName = "Opponent"
    private(set) var pendingMove: Int?
    private(set) var lastMove: Int?
    private(set) var layerEvent: LayerEvent?
    /// A one-line problem to surface (failed move, lost connection).
    var errorMessage: String?

    @ObservationIgnored private let backend: MatchBackend
    @ObservationIgnored private(set) var inFlight: Task<Void, Never>?
    @ObservationIgnored private var tasks: [Task<Void, Never>] = []
    @ObservationIgnored private var reportedFinish = false

    init?(match: MatchRow, userID: String, backend: MatchBackend = LiveMatchBackend()) {
        guard let config = match.config.rulesConfig else { return nil }
        self.backend = backend
        self.match = match
        self.matchID = match.id
        self.userID = userID
        self.config = config
        reportedFinish = match.status == .finished
    }

    // MARK: Derived state

    var state: GameState { GameState(board: match.board, layerWinners: match.layerWinners) }
    var mySymbol: Player { match.symbol(for: userID) }
    var isHost: Bool { userID == match.hostId }
    var isMyTurn: Bool { match.currentTurnUserId == userID }
    var isPlaying: Bool { match.status == .active && match.winner == nil && !match.draw }
    var acceptsInput: Bool { isPlaying && isMyTurn && pendingMove == nil }
    var xName: String { mySymbol == .x ? "You" : opponentName }
    var oName: String { mySymbol == .o ? "You" : opponentName }

    var outcome: GameOutcome? {
        if let winner = match.winner { return .win(winner) }
        return match.draw ? .draw : nil
    }

    var rankOutcome: RankOutcome? {
        switch outcome {
        case let .win(player): player == mySymbol ? .win : .loss
        case .draw: .draw
        case nil: nil
        }
    }

    /// The pieces that won it, so the board can show how it was done. A forfeit or a
    /// disconnect decides the match without a line on the board.
    var winningLine: [Int]? {
        guard match.abandonReason == nil else { return nil }
        return findWinningCells(config, match.board, match.layerWinners, winner: match.winner)
    }

    var opponentDisconnectedAt: String? {
        isHost ? match.guestDisconnectedAt : match.hostDisconnectedAt
    }

    var opponentDisconnected: Bool { opponentDisconnectedAt != nil }

    // MARK: Lifecycle

    func start() {
        guard tasks.isEmpty else { return }
        tasks.append(Task { await subscribe() })
        tasks.append(Task { await heartbeat() })
        tasks.append(Task { await pollWhileWaiting() })
        tasks.append(Task { await loadOpponentName() })
    }

    func stop() {
        tasks.forEach { $0.cancel() }
        tasks.removeAll()
        let id = matchID
        let backend = backend
        Task { await backend.setPresence(id: id, connected: false) }
    }

    /// The app moved between foreground and background.
    func appBecameActive(_ active: Bool) {
        let id = matchID
        Task {
            await backend.setPresence(id: id, connected: active)
            if active { await refresh() }
        }
    }

    private var opponentID: String? { isHost ? match.guestId : match.hostId }

    private func loadOpponentName() async {
        if let id = opponentID, let name = await backend.username(of: id) { opponentName = name }
    }

    func refresh() async {
        do {
            guard let row = try await backend.fetch(id: matchID) else { return }
            // A fetch is authoritative, so it also undoes a failed optimistic move.
            apply(row, force: row.revision >= match.revision && pendingMove == nil)
            connection = .synced
        } catch {
            connection = .reconnecting
        }
    }

    private func subscribe() async {
        for await event in backend.events(for: matchID) {
            if Task.isCancelled { return }
            switch event {
            case .subscribed:
                connection = .synced
                // After (re)subscribing, fetch once so nothing sent in the gap is missed.
                await refresh()
            case let .row(row):
                apply(row)
                connection = .synced
            case .lost:
                connection = .reconnecting
            }
        }
    }

    /// Tells the server we're here every 30s, like the web's presence interval.
    private func heartbeat() async {
        await backend.setPresence(id: matchID, connected: true)
        while !Task.isCancelled {
            try? await Task.sleep(for: .seconds(30))
            if Task.isCancelled { return }
            await backend.setPresence(id: matchID, connected: true)
        }
    }

    /// Safety net for the waiting room if the realtime join event is missed.
    private func pollWhileWaiting() async {
        while !Task.isCancelled {
            try? await Task.sleep(for: .seconds(3))
            if Task.isCancelled { return }
            if match.status == .waiting { await refresh() }
        }
    }

    // MARK: Applying rows

    private func apply(_ incoming: MatchRow, force: Bool = false) {
        let previous = match
        let merged = force ? incoming : (mergeMatch(current: previous, next: incoming) ?? previous)
        guard merged != previous else { return }
        match = merged
        playCues(from: previous, to: merged)
        if merged.guestId != previous.guestId, merged.guestId != nil {
            Task { await loadOpponentName() }
        }
    }

    /// Sounds, haptics and banners for whatever changed — covers both my own
    /// move and the opponent's, since both arrive as a new row.
    private func playCues(from old: MatchRow, to new: MatchRow) {
        let moved = new.board != old.board
        if moved, let index = new.board.indices.first(where: { old.board[$0] == nil && new.board[$0] != nil }),
           let mark = new.board[index] {
            lastMove = index
            ArcadeFeedback.shared.play(mark == .x ? .placeX : .placeO)
            scheduleLastMoveClear()
        }

        let ongoing = new.status == .active && new.winner == nil && !new.draw
        if ongoing, moved,
           let claimed = new.layerWinners.indices.first(where: { new.layerWinners[$0].winner != nil && old.layerWinners[$0].winner == nil }),
           let owner = new.layerWinners[claimed].winner {
            layerEvent = LayerEvent(layerNumber: claimed + 1, winner: owner)
            ArcadeFeedback.shared.play(owner == mySymbol ? .layerWin : .layerLost)
            Task {
                try? await Task.sleep(for: .milliseconds(1400))
                layerEvent = nil
            }
        } else if ongoing, moved, old.currentTurnUserId != new.currentTurnUserId {
            ArcadeFeedback.shared.play(new.currentTurnUserId == userID ? .yourTurn : .opponentTurn)
        }

        if !reportedFinish, new.winner != nil || new.draw {
            reportedFinish = true
            switch rankOutcome {
            case .win: ArcadeFeedback.shared.play(.victory)
            case .loss: ArcadeFeedback.shared.play(.defeat)
            case .draw: ArcadeFeedback.shared.play(.draw)
            case nil: break
            }
        }
    }

    private func scheduleLastMoveClear() {
        Task {
            try? await Task.sleep(for: .milliseconds(1500))
            // Once the match is over, the final move stays lit so the finished board shows how it ended.
            if outcome == nil { lastMove = nil }
        }
    }

    // MARK: Actions

    func humanTap(_ index: Int) {
        guard acceptsInput else { return }
        guard let result = applyMove(config, board: match.board, layerWinners: match.layerWinners,
                                     index: index, isXNext: match.isXNext)
        else {
            ArcadeFeedback.shared.play(.invalid)
            return
        }

        // Show the move at once; the server confirms (or corrects) it below.
        var optimistic = match
        optimistic.board = result.board
        optimistic.layerWinners = result.layerWinners
        optimistic.isXNext = result.isXNext
        optimistic.winner = result.winner
        optimistic.draw = result.draw
        let finished = result.winner != nil || result.draw
        optimistic.status = finished ? .finished : .active
        optimistic.currentTurnUserId = finished ? nil : match.userId(for: result.isXNext ? .x : .o)
        pendingMove = index
        apply(optimistic, force: true)

        let id = matchID
        inFlight = Task {
            do {
                let confirmed = try await backend.submitMove(id: id, cellIndex: index)
                pendingMove = nil
                apply(confirmed)
            } catch {
                pendingMove = nil
                errorMessage = error.localizedDescription
                lastMove = nil
                await refresh()
            }
        }
    }

    /// Forfeits an active match, or cancels / leaves a waiting room.
    func forfeit() async -> Bool {
        do {
            let row = try await backend.forfeit(id: matchID)
            apply(row, force: true)
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }
}
