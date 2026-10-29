import Testing
@testable import TwistedTacKit

// Ported from src/utils/gameLogic.test.ts.

private func config(_ size: Int, _ mode: ViewMode) -> GameRulesConfig {
    GameRulesConfig(size: size, viewMode: mode)!
}

@Suite("Rules")
struct RulesTests {
    @Test("sizes outside 1...8 are rejected")
    func invalidSizes() {
        #expect(GameRulesConfig(size: 0, viewMode: .cube) == nil)
        #expect(GameRulesConfig(size: 9, viewMode: .flat) == nil)
        #expect(GameRulesConfig(size: -3, viewMode: .cube) == nil)
    }

    @Test("3x3 layer has 8 lines of 3")
    func layerLines() {
        let lines = config(3, .cube).layerLines[0]
        #expect(lines.count == 8)
        #expect(lines.allSatisfy { $0.count == 3 })
    }

    @Test("detects a layer row win")
    func layerRowWin() {
        let c = config(3, .cube)
        var board = GameState(config: c).board
        board[0] = .x; board[1] = .x; board[2] = .x
        let result = checkLayerWinner(c, board, layer: 0)
        #expect(result.winner == .x)
        #expect(result.line == [0, 1, 2])
    }

    @Test("detects a cross-layer column win")
    func crossLayerWin() {
        let c = config(3, .cube)
        var board = GameState(config: c).board
        board[0] = .o; board[9] = .o; board[18] = .o
        let result = checkCrossLayerWinner(c, board)
        #expect(result.winner == .o)
        #expect(result.line == [0, 9, 18])
    }

    @Test("two claimed layers win a 3x3x3 match")
    func matchWinByLayers() throws {
        let c = config(3, .cube)
        var state = GameState(config: c)
        state.board[0] = .x; state.board[1] = .x; state.board[2] = .x
        state.layerWinners[0] = LayerResult(winner: .x, line: [0, 1, 2])
        state.board[9] = .x; state.board[10] = .x

        let result = try #require(applyMove(c, board: state.board, layerWinners: state.layerWinners, index: 11, isXNext: true))
        #expect(result.winner == .x)
        #expect(result.layerWinners[1].winner == .x)
    }

    @Test("4x4x4 needs 3 of 4 layers and has length-4 cross lines")
    func fourByFour() {
        let c = config(4, .cube)
        #expect(c.matchWinThreshold == 3)
        #expect(!c.crossLayerLines.isEmpty)
        #expect(c.crossLayerLines.allSatisfy { $0.count == 4 })
    }

    @Test("flat 4x4 resolves a row win without layer logic")
    func flatWin() throws {
        let c = config(4, .flat)
        var state = GameState(config: c)
        state.board[0] = .x; state.board[1] = .x; state.board[2] = .x
        let result = try #require(applyMove(c, board: state.board, layerWinners: state.layerWinners, index: 3, isXNext: true))
        #expect(result.winner == .x)
        #expect(result.crossLayerWinningLine == nil)
    }

    @Test("1x1 is an instant win")
    func voidBoard() throws {
        let c = config(1, .cube)
        let state = GameState(config: c)
        let result = try #require(applyMove(c, board: state.board, layerWinners: state.layerWinners, index: 0, isXNext: true))
        #expect(result.winner == .x)
        #expect(result.winningLine == [0])
    }

    @Test("2x2x2 has 2 layers and a threshold of 1")
    func twoByTwo() {
        let c = config(2, .cube)
        #expect(c.layerCount == 2)
        #expect(c.cellCount == 8)
        #expect(c.matchWinThreshold == 1)
        #expect(c.is3D)
    }

    @Test("a full flat board with no line is a draw")
    func fullBoardDraw() {
        let c = config(3, .flat)
        let marks: [Player] = [.x, .o, .x, .x, .o, .o, .o, .x, .x]
        let board: Board = marks
        let layers = GameState(config: c).layerWinners
        #expect(!hasLegalMoves(c, board, layers))
        #expect(checkBoardWinner(c, board).winner == nil)
    }

    @Test("claimed layers lock their empty cells into a stalemate")
    func lockedStalemate() throws {
        let c = config(3, .cube)
        var state = GameState(config: c)
        state.board[6] = .x; state.board[7] = .x; state.board[8] = .x
        state.layerWinners[0] = LayerResult(winner: .x, line: [6, 7, 8])

        let layer1: [Player?] = [.x, .o, .x, .x, .o, .o, .o, .x, nil]
        for (i, mark) in layer1.enumerated() { state.board[9 + i] = mark }

        state.board[18] = .o; state.board[19] = .o; state.board[20] = .o
        state.layerWinners[2] = LayerResult(winner: .o, line: [18, 19, 20])

        #expect(hasLegalMoves(c, state.board, state.layerWinners))
        let result = try #require(applyMove(c, board: state.board, layerWinners: state.layerWinners, index: 17, isXNext: true))
        #expect(result.draw)
        #expect(result.winner == nil)
        #expect(!hasLegalMoves(c, result.board, result.layerWinners))
    }

    @Test("rejects out-of-range, occupied and locked-layer moves")
    func illegalMoves() {
        let c = config(3, .cube)
        var state = GameState(config: c)
        #expect(applyMove(c, board: state.board, layerWinners: state.layerWinners, index: -1, isXNext: true) == nil)
        #expect(applyMove(c, board: state.board, layerWinners: state.layerWinners, index: 27, isXNext: true) == nil)

        state.board[4] = .x
        #expect(applyMove(c, board: state.board, layerWinners: state.layerWinners, index: 4, isXNext: false) == nil)

        state.layerWinners[1] = LayerResult(winner: .o, line: [9, 10, 11])
        #expect(applyMove(c, board: state.board, layerWinners: state.layerWinners, index: 13, isXNext: false) == nil)
    }
}

@Suite("Winning cells")
struct WinningCellsTests {
    private func config(_ size: Int, _ mode: ViewMode) -> GameRulesConfig { GameRulesConfig(size: size, viewMode: mode)! }
    private func board(_ cells: Int, _ marks: [Int: Player]) -> Board {
        var board = Board(repeating: nil, count: cells)
        for (index, mark) in marks { board[index] = mark }
        return board
    }

    @Test("a line through the stack is the winning line")
    func crossLayer() {
        let c = config(3, .cube)
        let cells = findWinningCells(c, board(27, [0: .x, 9: .x, 18: .x]), GameState(config: c).layerWinners, winner: .x)
        #expect(cells == [0, 9, 18])
    }

    @Test("winning by claiming layers shows the lines that claimed them")
    func layerClaims() {
        let c = config(3, .cube)
        let layers = [
            LayerResult(winner: .x, line: [0, 1, 2]), LayerResult(winner: .x, line: [9, 10, 11]), LayerResult(),
        ]
        let cells = findWinningCells(c, board(27, [0: .x, 1: .x, 2: .x, 9: .x, 10: .x, 11: .x]), layers, winner: .x)
        #expect(cells == [0, 1, 2, 9, 10, 11])
    }

    @Test("a layer the loser claimed is not part of the winning pieces")
    func loserLayerExcluded() {
        let c = config(4, .cube)
        let layers = [
            LayerResult(winner: .x, line: [0, 1, 2, 3]), LayerResult(winner: .o, line: [16, 17, 18, 19]),
            LayerResult(winner: .x, line: [32, 33, 34, 35]), LayerResult(winner: .x, line: [48, 49, 50, 51]),
        ]
        let cells = findWinningCells(c, board(64, [:]), layers, winner: .x)
        #expect(cells == [0, 1, 2, 3, 32, 33, 34, 35, 48, 49, 50, 51])
    }

    @Test("a flat board shows its line and the void shows its only cell")
    func flatAndVoid() {
        let flat = config(3, .flat)
        #expect(findWinningCells(flat, board(9, [3: .o, 4: .o, 5: .o]), GameState(config: flat).layerWinners, winner: .o) == [3, 4, 5])
        let void = config(1, .cube)
        #expect(findWinningCells(void, board(1, [0: .x]), GameState(config: void).layerWinners, winner: .x) == [0])
    }

    @Test("no winner or no line gives nothing")
    func nothing() {
        let c = config(3, .cube)
        #expect(findWinningCells(c, board(27, [:]), GameState(config: c).layerWinners, winner: nil) == nil)
        #expect(findWinningCells(c, board(27, [:]), GameState(config: c).layerWinners, winner: .x) == nil)
    }
}
