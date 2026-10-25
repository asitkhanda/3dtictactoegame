import Foundation
import Observation
import TwistedTacKit

enum LocalMode: String, Hashable {
    case vsAI, twoPlayer
}

struct LayerEvent: Equatable, Identifiable {
    let id = UUID()
    let layerNumber: Int
    let winner: Player
}

enum GameOutcome: Equatable {
    case win(Player)
    case draw
}

/// One local game (vs the AI, or pass-and-play). Local games are casual and
/// never touch the leaderboard, same as the web app.
@Observable
final class LocalGameModel {
    let config: GameRulesConfig
    let mode: LocalMode
    let gameID = UUID()

    private(set) var state: GameState
    private(set) var isXNext = true
    private(set) var outcome: GameOutcome?
    private(set) var winningLine: [Int]?
    private(set) var crossLayerLine: [Int]?
    private(set) var lastMove: Int?
    private(set) var layerEvent: LayerEvent?
    private(set) var thinking = false

    private var aiTask: Task<Void, Never>?
    private var clearTask: Task<Void, Never>?

    init(config: GameRulesConfig, mode: LocalMode) {
        self.config = config
        self.mode = mode
        state = GameState(config: config)
    }

    var winner: Player? {
        if case let .win(player) = outcome { player } else { nil }
    }

    var isFinished: Bool { outcome != nil }
    var xLayers: Int { state.layerWinners.filter { $0.winner == .x }.count }
    var oLayers: Int { state.layerWinners.filter { $0.winner == .o }.count }
    /// Whether the board accepts a tap from the person holding the phone.
    var acceptsInput: Bool { !isFinished && !(mode == .vsAI && !isXNext) }

    /// A tap on cell `index`. Illegal taps get the "invalid" cue and nothing else.
    func humanTap(_ index: Int) {
        guard acceptsInput else { return }
        if !apply(index) { ArcadeFeedback.shared.play(.invalid) }
    }

    func restart() {
        aiTask?.cancel()
        clearTask?.cancel()
        state = GameState(config: config)
        isXNext = true
        outcome = nil
        winningLine = nil
        crossLayerLine = nil
        lastMove = nil
        layerEvent = nil
        thinking = false
    }

    func clearLayerEvent() { layerEvent = nil }

    func stop() {
        aiTask?.cancel()
        clearTask?.cancel()
    }

    // MARK: Moves

    @discardableResult
    private func apply(_ index: Int) -> Bool {
        guard let result = applyMove(config, board: state.board, layerWinners: state.layerWinners,
                                     index: index, isXNext: isXNext)
        else { return false }

        let mover: Player = isXNext ? .x : .o
        ArcadeFeedback.shared.play(mover == .x ? .placeX : .placeO)

        let claimed = result.layerWinners.indices.first {
            result.layerWinners[$0].winner != nil && state.layerWinners[$0].winner == nil
        }

        state.board = result.board
        state.layerWinners = result.layerWinners
        isXNext = result.isXNext
        lastMove = index
        winningLine = result.winningLine
        crossLayerLine = result.crossLayerWinningLine
        scheduleLastMoveClear()

        if let winner = result.winner {
            outcome = .win(winner)
            let youWon = mode == .twoPlayer || winner == .x
            ArcadeFeedback.shared.play(youWon ? .victory : .defeat)
            return true
        }
        if result.draw {
            outcome = .draw
            ArcadeFeedback.shared.play(.draw)
            return true
        }

        if let claimed, let owner = result.layerWinners[claimed].winner {
            layerEvent = LayerEvent(layerNumber: claimed + 1, winner: owner)
            let lost = mode == .vsAI && owner == .o
            ArcadeFeedback.shared.play(lost ? .layerLost : .layerWin)
        } else if mode == .vsAI, isXNext {
            ArcadeFeedback.shared.play(.yourTurn)
        }

        if mode == .vsAI, !isXNext { scheduleAIMove() }
        return true
    }

    private func scheduleAIMove() {
        thinking = true
        let config = config
        let snapshot = state
        aiTask?.cancel()
        aiTask = Task {
            // A beat of "thinking", shorter on the big boards.
            try? await Task.sleep(for: .milliseconds(config.size >= 6 ? 400 : 750))
            if Task.isCancelled { return }
            let move = await Task.detached(priority: .userInitiated) {
                getComputerMove(config, snapshot.board, snapshot.layerWinners, player: .o)
            }.value
            if Task.isCancelled { return }
            thinking = false
            if let move { apply(move) }
        }
    }

    private func scheduleLastMoveClear() {
        clearTask?.cancel()
        clearTask = Task {
            try? await Task.sleep(for: .milliseconds(1500))
            if Task.isCancelled { return }
            lastMove = nil
        }
    }
}
