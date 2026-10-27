import SwiftUI
import TwistedTacKit

#if DEBUG
/// `-previewOnline <scenario>` opens an online screen backed by a fake server:
/// waiting, active, midgame, theirturn, disconnected, win, loss, forfeit, abandoned.
enum DebugOnlinePreview {
    static var scenario: String? {
        let args = ProcessInfo.processInfo.arguments
        guard let i = args.firstIndex(of: "-previewOnline"), args.indices.contains(i + 1) else { return nil }
        return args[i + 1]
    }

    /// `-previewBoard 5` opens a 5x5x5 two-player game part-way through; `-previewBoard 5f`
    /// is the flat 5x5 board. The moves come from a fixed seed, so every launch matches.
    static var boardSpec: String? {
        let args = ProcessInfo.processInfo.arguments
        guard let i = args.firstIndex(of: "-previewBoard"), args.indices.contains(i + 1) else { return nil }
        return args[i + 1]
    }

    @MainActor
    static func boardView(for spec: String) -> some View {
        let flat = spec.hasSuffix("f")
        let size = Int(spec.filter(\.isNumber)) ?? 3
        let config = GameRulesConfig(size: size, viewMode: flat ? .flat : .cube)!
        let model = LocalGameModel(config: config, mode: .twoPlayer)
        var seed: UInt64 = 0x9E3779B97F4A7C15
        func next() -> Int {
            seed = seed &* 6364136223846793005 &+ 1442695040888963407
            return Int(seed >> 33)
        }
        let target = max(4, config.cellCount * 3 / 10)
        var placed = 0
        while placed < target, !model.isFinished {
            let open = (0..<config.cellCount).filter { model.state.board[$0] == nil }
            guard !open.isEmpty else { break }
            model.humanTap(open[next() % open.count])
            placed += 1
        }
        return GameView(model: model)
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
        case "midgame":
            // X has claimed layer 1; O is building on layer 2. Used for store screenshots.
            play([0, 9, 1, 10, 2, 13, 11, 4, 22, 17, 5, 14])
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
