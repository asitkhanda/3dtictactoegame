import Foundation
import Testing
@testable import TwistedTacKit

// Ported from src/utils/gameAi.test.ts.

private func config(_ size: Int, _ mode: ViewMode) -> GameRulesConfig {
    GameRulesConfig(size: size, viewMode: mode)!
}

/// Places marks directly for tactical set-ups, bypassing turn order.
private func seed(_ config: GameRulesConfig, _ marks: [Int: Player]) -> GameState {
    var state = GameState(config: config)
    for (index, mark) in marks { state.board[index] = mark }
    return state
}

private typealias Agent = @Sendable (GameRulesConfig, Board, [LayerResult], Player) -> Int?

private let aiAgent: Agent = { config, board, layers, player in
    getComputerMove(config, board, layers, player: player)
}

/// Casual-player proxy: takes a win, blocks a loss, otherwise plays randomly.
private let greedyAgent: Agent = { config, board, layers, player in
    let moves = legalMoves(config, board, layers)
    if moves.isEmpty { return nil }
    for move in moves {
        if applyMove(config, board: board, layerWinners: layers, index: move, isXNext: player == .x)?.winner == player {
            return move
        }
    }
    for move in moves {
        if applyMove(config, board: board, layerWinners: layers, index: move, isXNext: player.opponent == .x)?.winner == player.opponent {
            return move
        }
    }
    return moves.randomElement()
}

private enum Outcome { case x, o, draw }

/// Plays a full game. Fails the test if either side moves illegally.
private func playGame(_ config: GameRulesConfig, x: Agent, o: Agent) -> Outcome {
    var state = GameState(config: config)
    var isXNext = true
    for _ in 0...config.cellCount {
        let agent = isXNext ? x : o
        guard let move = agent(config, state.board, state.layerWinners, isXNext ? .x : .o) else { return .draw }
        guard let result = applyMove(config, board: state.board, layerWinners: state.layerWinners, index: move, isXNext: isXNext) else {
            Issue.record("illegal move \(move)")
            return .draw
        }
        state.board = result.board
        state.layerWinners = result.layerWinners
        isXNext = result.isXNext
        if let winner = result.winner { return winner == .x ? .x : .o }
        if result.draw { return .draw }
    }
    return .draw
}

private func tally(_ config: GameRulesConfig, opponent: Agent, games: Int) -> (win: Int, loss: Int, draw: Int) {
    var score = (win: 0, loss: 0, draw: 0)
    for _ in 0..<games {
        switch playGame(config, x: opponent, o: aiAgent) {
        case .o: score.win += 1
        case .x: score.loss += 1
        case .draw: score.draw += 1
        }
    }
    return score
}

@Suite("Computer opponent — tactics")
struct ComputerTacticsTests {
    @Test("completes a winning line when one is available")
    func takesWin() {
        let c = config(3, .flat)
        let state = seed(c, [0: .o, 1: .o, 3: .x, 4: .x])
        #expect(getComputerMove(c, state.board, state.layerWinners) == 2)
    }

    @Test("blocks the opponent instead of building its own line")
    func blocks() {
        let c = config(3, .flat)
        let state = seed(c, [0: .x, 1: .x, 4: .o])
        #expect(getComputerMove(c, state.board, state.layerWinners) == 2)
    }

    @Test("completes a line through the stack in 3D")
    func stackWin() {
        let c = config(3, .cube)
        let state = seed(c, [0: .o, 9: .o, 4: .x, 13: .x])
        #expect(getComputerMove(c, state.board, state.layerWinners) == 18)
    }

    @Test("refuses the corner trap that would let the opponent fork")
    func avoidsFork() {
        let c = config(3, .flat)
        let state = seed(c, [0: .x, 8: .x, 4: .o])
        let move = getComputerMove(c, state.board, state.layerWinners)
        #expect([1, 3, 5, 7].contains(move ?? -1))
    }

    @Test("returns nil when the board offers no legal move")
    func noMoves() {
        let c = config(3, .flat)
        let state = seed(c, [0: .x, 1: .o, 2: .x, 3: .x, 4: .o, 5: .o, 6: .o, 7: .x, 8: .x])
        #expect(getComputerMove(c, state.board, state.layerWinners) == nil)
    }

    @Test("a seeded generator makes the tie-break reproducible")
    func seededPick() {
        let c = config(3, .flat)
        let state = GameState(config: c)
        var a = SeededGenerator(seed: 7)
        var b = SeededGenerator(seed: 7)
        let first = getComputerMove(c, state.board, state.layerWinners, player: .x, using: &a)
        let second = getComputerMove(c, state.board, state.layerWinners, player: .x, using: &b)
        #expect(first == second)
    }
}

@Suite("Computer opponent — strength")
struct ComputerStrengthTests {
    // 3x3 is small enough to search exhaustively, so perfect play is expected.
    @Test("never loses the classic 3x3 board", .timeLimit(.minutes(2)))
    func neverLoses() {
        let score = tally(config(3, .flat), opponent: greedyAgent, games: 40)
        #expect(score.loss == 0)
    }

    @Test("always draws against itself on 3x3", .timeLimit(.minutes(2)))
    func selfPlayDraws() {
        let c = config(3, .flat)
        for _ in 0..<10 {
            #expect(playGame(c, x: aiAgent, o: aiAgent) == .draw)
        }
    }

    @Test("dominates a casual opponent on 3x3x3", .timeLimit(.minutes(3)))
    func dominates() {
        let games = 40
        let score = tally(config(3, .cube), opponent: greedyAgent, games: games)
        #expect(Double(score.win) / Double(games) >= 0.85)
    }

    @Test("stays responsive on the largest secret board", .timeLimit(.minutes(1)))
    func largestBoard() {
        let c = config(8, .cube)
        let state = GameState(config: c)
        let started = Date()
        let move = getComputerMove(c, state.board, state.layerWinners)
        let elapsed = Date().timeIntervalSince(started) * 1000

        #expect((move ?? -1) >= 0)
        // The search is time-bounded. Debug builds are far slower per node, so
        // the ceiling is looser there; release must stay well inside a frame budget.
        #if DEBUG
        #expect(elapsed < 2000)
        #else
        #expect(elapsed < 400)
        #endif
    }
}

/// Small deterministic generator (SplitMix64) for reproducible tests.
struct SeededGenerator: RandomNumberGenerator {
    private var state: UInt64
    init(seed: UInt64) { state = seed }
    mutating func next() -> UInt64 {
        state &+= 0x9E37_79B9_7F4A_7C15
        var z = state
        z = (z ^ (z >> 30)) &* 0xBF58_476D_1CE4_E5B9
        z = (z ^ (z >> 27)) &* 0x94D0_49BB_1331_11EB
        return z ^ (z >> 31)
    }
}
