import SwiftUI
import TwistedTacKit

#if DEBUG
/// `-previewOnline <scenario>` opens an online screen backed by a fake server:
/// waiting, active, theirturn, disconnected, win, loss, draw, forfeit, abandoned.
enum DebugOnlinePreview {
    static var scenario: String? {
        let args = ProcessInfo.processInfo.arguments
        guard let i = args.firstIndex(of: "-previewOnline"), args.indices.contains(i + 1) else { return nil }
        return args[i + 1]
    }

    @MainActor
    static func view(for name: String) -> some View {
        let me = "me", rival = "rival"
        var row = MatchRow.sample(status: .active, host: me, guest: rival)
        let config = row.config.rulesConfig!

        func play(_ moves: [Int]) {
            var state = GameState(config: config)
            var isXNext = true
            for move in moves {
                guard let r = applyMove(config, board: state.board, layerWinners: state.layerWinners, index: move, isXNext: isXNext) else { continue }
                state.board = r.board; state.layerWinners = r.layerWinners; isXNext = r.isXNext
                row.winner = r.winner; row.draw = r.draw
            }
            row.board = state.board; row.layerWinners = state.layerWinners; row.isXNext = isXNext
            row.currentTurnUserId = row.winner != nil || row.draw ? nil : (isXNext ? me : rival)
            if row.winner != nil || row.draw { row.status = .finished }
        }

        switch name {
        case "waiting":
            row = .sample(status: .waiting, host: me, guest: nil)
        case "theirturn":
            play([13, 4, 22])
        case "disconnected":
            play([13, 4])
            row.guestDisconnectedAt = ISO8601DateFormatter().string(from: Date().addingTimeInterval(-95))
        case "win":
            play([0, 3, 9, 4, 18])  // X completes the 0-9-18 column through the stack
        case "loss":
            play([1, 0, 4, 9, 13, 18])  // O completes the 0-9-18 column
        case "forfeit":
            play([13, 4]); row.status = .finished; row.winner = .x; row.currentTurnUserId = nil
            row.abandonReason = "voluntary_forfeit"
        case "abandoned":
            row.status = .abandoned; row.abandonReason = "mutual_disconnect"
        default:
            play([13, 4])
        }
        let backend = FakeMatchBackend(row: row)
        let model = OnlineMatchModel(match: row, userID: me, backend: backend)!
        return OnlineGameView(model: model)
    }
}
#endif
