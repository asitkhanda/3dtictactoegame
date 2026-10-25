import Foundation
import Testing
@testable import TwistedTacKit

// Replays vectors generated from the canonical TypeScript engine
// (scripts/gen-parity-vectors.ts). Regenerate with:
//   npx vite-node scripts/gen-parity-vectors.ts

private struct Vectors: Decodable {
    struct Step: Decodable {
        let move: Int
        let isXNext: Bool
        let illegal: [Int]
        let board: String
        let layerWinners: [LayerResult]
        let winner: Player?
        let draw: Bool
        let crossLayerWinningLine: [Int]?
        let winningLine: [Int]?
        let nextIsXNext: Bool
        let terminal: Player?
        let hasLegalMoves: Bool
    }
    struct Snapshot: Decodable {
        let board: String
        let layerWinners: [LayerResult]
        let evalX: Double
        let evalO: Double
        let threatsX: [Int]
        let threatsO: [Int]
    }
    struct Game: Decodable {
        let steps: [Step]
        let snapshots: [Snapshot]
    }
    struct ConfigVectors: Decodable {
        let size: Int
        let viewMode: ViewMode
        let winLength: Int
        let layerCount: Int
        let matchWinThreshold: Int
        let cellCount: Int
        let cellsPerLayer: Int
        let layerLines: [[[Int]]]
        let crossLines: [[Int]]
        let games: [Game]
    }
    let configs: [ConfigVectors]
}

private func decodeBoard(_ text: String) -> Board {
    text.map { character in
        switch character {
        case "X": Player.x
        case "O": Player.o
        default: nil
        }
    }
}

private func loadVectors() throws -> Vectors {
    let url = try #require(Bundle.module.url(forResource: "parity-vectors", withExtension: "json"))
    return try JSONDecoder().decode(Vectors.self, from: Data(contentsOf: url))
}

@Suite("Parity with the TypeScript rules engine")
struct ParityTests {
    @Test("config values and line tables match")
    func configs() throws {
        for vector in try loadVectors().configs {
            let label = "\(vector.size) \(vector.viewMode.rawValue)"
            let config = try #require(GameRulesConfig(size: vector.size, viewMode: vector.viewMode))
            #expect(config.winLength == vector.winLength, "\(label) winLength")
            #expect(config.layerCount == vector.layerCount, "\(label) layerCount")
            #expect(config.matchWinThreshold == vector.matchWinThreshold, "\(label) threshold")
            #expect(config.cellCount == vector.cellCount, "\(label) cellCount")
            #expect(config.cellsPerLayer == vector.cellsPerLayer, "\(label) cellsPerLayer")
            #expect(config.layerLines == vector.layerLines, "\(label) layer lines")
            #expect(config.crossLayerLines == vector.crossLines, "\(label) cross lines")
        }
    }

    @Test("every replayed move produces the same result")
    func replay() throws {
        var steps = 0
        for vector in try loadVectors().configs {
            let label = "\(vector.size) \(vector.viewMode.rawValue)"
            let config = try #require(GameRulesConfig(size: vector.size, viewMode: vector.viewMode))

            for (gameNumber, game) in vector.games.enumerated() {
                var state = GameState(config: config)
                for (stepNumber, step) in game.steps.enumerated() {
                    let context = "\(label) game \(gameNumber) step \(stepNumber)"

                    for bad in step.illegal {
                        #expect(
                            applyMove(config, board: state.board, layerWinners: state.layerWinners, index: bad, isXNext: step.isXNext) == nil,
                            "\(context): move \(bad) should be illegal"
                        )
                    }

                    let result = try #require(
                        applyMove(config, board: state.board, layerWinners: state.layerWinners, index: step.move, isXNext: step.isXNext),
                        "\(context): move \(step.move) should be legal"
                    )
                    #expect(result.board == decodeBoard(step.board), "\(context) board")
                    #expect(result.layerWinners == step.layerWinners, "\(context) layer winners")
                    #expect(result.winner == step.winner, "\(context) winner")
                    #expect(result.draw == step.draw, "\(context) draw")
                    #expect(result.crossLayerWinningLine == step.crossLayerWinningLine, "\(context) cross line")
                    #expect(result.winningLine == step.winningLine, "\(context) winning line")
                    #expect(result.isXNext == step.nextIsXNext, "\(context) next turn")
                    #expect(getTerminalWinner(config, result.board, result.layerWinners) == step.terminal, "\(context) terminal")
                    #expect(hasLegalMoves(config, result.board, result.layerWinners) == step.hasLegalMoves, "\(context) legal moves")

                    state = GameState(config: config)
                    state.board = result.board
                    state.layerWinners = result.layerWinners
                    steps += 1
                }
            }
        }
        #expect(steps > 2000)
    }

    @Test("AI evaluation and threat detection match")
    func evaluation() throws {
        var snapshots = 0
        for vector in try loadVectors().configs {
            let label = "\(vector.size) \(vector.viewMode.rawValue)"
            let config = try #require(GameRulesConfig(size: vector.size, viewMode: vector.viewMode))

            for game in vector.games {
                for snapshot in game.snapshots {
                    let board = decodeBoard(snapshot.board)
                    let evalX = evaluatePositionFor(config, board, snapshot.layerWinners, player: .x)
                    let evalO = evaluatePositionFor(config, board, snapshot.layerWinners, player: .o)
                    #expect(abs(evalX - snapshot.evalX) < 1e-9, "\(label) evalX \(evalX) vs \(snapshot.evalX)")
                    #expect(abs(evalO - snapshot.evalO) < 1e-9, "\(label) evalO \(evalO) vs \(snapshot.evalO)")
                    #expect(getImmediateWinningMoves(config, board, snapshot.layerWinners, player: .x) == snapshot.threatsX, "\(label) threats X")
                    #expect(getImmediateWinningMoves(config, board, snapshot.layerWinners, player: .o) == snapshot.threatsO, "\(label) threats O")
                    snapshots += 1
                }
            }
        }
        #expect(snapshots > 100)
    }
}
