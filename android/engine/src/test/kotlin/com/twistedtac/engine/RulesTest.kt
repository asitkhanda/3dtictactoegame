package com.twistedtac.engine

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

// Ported from src/utils/gameLogic.test.ts.

private fun config(size: Int, mode: ViewMode) = GameRulesConfig.of(size, mode)!!

private fun GameState.withMarks(vararg marks: Pair<Int, Player>): GameState =
    copy(board = board.toMutableList().also { b -> marks.forEach { (i, p) -> b[i] = p } })

class RulesTest {
    @Test
    fun `sizes outside 1 to 8 are rejected`() {
        assertNull(GameRulesConfig.of(0, ViewMode.CUBE))
        assertNull(GameRulesConfig.of(9, ViewMode.FLAT))
        assertNull(GameRulesConfig.of(-3, ViewMode.CUBE))
    }

    @Test
    fun `3x3 layer has 8 lines of 3`() {
        val lines = config(3, ViewMode.CUBE).layerLines[0]
        assertEquals(8, lines.size)
        assertTrue(lines.all { it.size == 3 })
    }

    @Test
    fun `detects a layer row win`() {
        val c = config(3, ViewMode.CUBE)
        val board = GameState(c).withMarks(0 to Player.X, 1 to Player.X, 2 to Player.X).board
        val result = checkLayerWinner(c, board, 0)
        assertEquals(Player.X, result.winner)
        assertEquals(listOf(0, 1, 2), result.line)
    }

    @Test
    fun `detects a cross-layer column win`() {
        val c = config(3, ViewMode.CUBE)
        val board = GameState(c).withMarks(0 to Player.O, 9 to Player.O, 18 to Player.O).board
        val result = checkCrossLayerWinner(c, board)
        assertEquals(Player.O, result.winner)
        assertEquals(listOf(0, 9, 18), result.line)
    }

    @Test
    fun `two claimed layers win a 3x3x3 match`() {
        val c = config(3, ViewMode.CUBE)
        var state = GameState(c).withMarks(0 to Player.X, 1 to Player.X, 2 to Player.X, 9 to Player.X, 10 to Player.X)
        state = state.copy(
            layerWinners = state.layerWinners.toMutableList().also { it[0] = LayerResult(Player.X, listOf(0, 1, 2)) },
        )
        val result = assertNotNull(applyMove(c, state.board, state.layerWinners, 11, isXNext = true))
        assertEquals(Player.X, result.winner)
        assertEquals(Player.X, result.layerWinners[1].winner)
    }

    @Test
    fun `4x4x4 needs 3 of 4 layers and has length-4 cross lines`() {
        val c = config(4, ViewMode.CUBE)
        assertEquals(3, c.matchWinThreshold)
        assertTrue(c.crossLayerLines.isNotEmpty())
        assertTrue(c.crossLayerLines.all { it.size == 4 })
    }

    @Test
    fun `flat 4x4 resolves a row win without layer logic`() {
        val c = config(4, ViewMode.FLAT)
        val state = GameState(c).withMarks(0 to Player.X, 1 to Player.X, 2 to Player.X)
        val result = assertNotNull(applyMove(c, state.board, state.layerWinners, 3, isXNext = true))
        assertEquals(Player.X, result.winner)
        assertNull(result.crossLayerWinningLine)
    }

    @Test
    fun `1x1 is an instant win`() {
        val c = config(1, ViewMode.CUBE)
        val state = GameState(c)
        val result = assertNotNull(applyMove(c, state.board, state.layerWinners, 0, isXNext = true))
        assertEquals(Player.X, result.winner)
        assertEquals(listOf(0), result.winningLine)
    }

    @Test
    fun `2x2x2 has 2 layers and a threshold of 1`() {
        val c = config(2, ViewMode.CUBE)
        assertEquals(2, c.layerCount)
        assertEquals(8, c.cellCount)
        assertEquals(1, c.matchWinThreshold)
        assertTrue(c.is3D)
    }

    @Test
    fun `a full flat board with no line is a draw`() {
        val c = config(3, ViewMode.FLAT)
        val x = Player.X
        val o = Player.O
        val board: Board = listOf(x, o, x, x, o, o, o, x, x)
        val layers = GameState(c).layerWinners
        assertFalse(hasLegalMoves(c, board, layers))
        assertNull(checkBoardWinner(c, board).winner)
    }

    @Test
    fun `claimed layers lock their empty cells into a stalemate`() {
        val c = config(3, ViewMode.CUBE)
        val x = Player.X
        val o = Player.O
        val board = MutableList<Player?>(27) { null }
        board[6] = x; board[7] = x; board[8] = x
        val layer1: List<Player?> = listOf(x, o, x, x, o, o, o, x, null)
        layer1.forEachIndexed { i, mark -> board[9 + i] = mark }
        board[18] = o; board[19] = o; board[20] = o
        val layers = GameState(c).layerWinners.toMutableList()
        layers[0] = LayerResult(x, listOf(6, 7, 8))
        layers[2] = LayerResult(o, listOf(18, 19, 20))

        assertTrue(hasLegalMoves(c, board, layers))
        val result = assertNotNull(applyMove(c, board, layers, 17, isXNext = true))
        assertTrue(result.draw)
        assertNull(result.winner)
        assertFalse(hasLegalMoves(c, result.board, result.layerWinners))
    }

    @Test
    fun `rejects out-of-range, occupied and locked-layer moves`() {
        val c = config(3, ViewMode.CUBE)
        var state = GameState(c)
        assertNull(applyMove(c, state.board, state.layerWinners, -1, isXNext = true))
        assertNull(applyMove(c, state.board, state.layerWinners, 27, isXNext = true))

        state = state.withMarks(4 to Player.X)
        assertNull(applyMove(c, state.board, state.layerWinners, 4, isXNext = false))

        val layers = state.layerWinners.toMutableList().also { it[1] = LayerResult(Player.O, listOf(9, 10, 11)) }
        assertNull(applyMove(c, state.board, layers, 13, isXNext = false))
    }
}

class WinningCellsTest {
    private fun config(size: Int, mode: ViewMode) = GameRulesConfig.of(size, mode)!!
    private fun boardOf(cells: Int, vararg marks: Pair<Int, Player>): Board =
        MutableList<Player?>(cells) { null }.also { b -> marks.forEach { (i, p) -> b[i] = p } }

    @Test
    fun `a line through the stack is the winning line`() {
        val c = config(3, ViewMode.CUBE)
        val board = boardOf(27, 0 to Player.X, 9 to Player.X, 18 to Player.X)
        assertEquals(listOf(0, 9, 18), findWinningCells(c, board, GameState(c).layerWinners, Player.X))
    }

    @Test
    fun `winning by claiming layers shows the lines that claimed them`() {
        val c = config(3, ViewMode.CUBE)
        val board = boardOf(
            27, 0 to Player.X, 1 to Player.X, 2 to Player.X, 9 to Player.X, 10 to Player.X, 11 to Player.X,
            3 to Player.O, 4 to Player.O, 12 to Player.O,
        )
        val layers = listOf(LayerResult(Player.X, listOf(0, 1, 2)), LayerResult(Player.X, listOf(9, 10, 11)), LayerResult())
        assertEquals(listOf(0, 1, 2, 9, 10, 11), findWinningCells(c, board, layers, Player.X))
    }

    @Test
    fun `a layer the loser claimed is not part of the winning pieces`() {
        val c = config(4, ViewMode.CUBE)
        val layers = listOf(
            LayerResult(Player.X, listOf(0, 1, 2, 3)),
            LayerResult(Player.O, listOf(16, 17, 18, 19)),
            LayerResult(Player.X, listOf(32, 33, 34, 35)),
            LayerResult(Player.X, listOf(48, 49, 50, 51)),
        )
        val cells = findWinningCells(c, boardOf(64), layers, Player.X)
        assertEquals(listOf(0, 1, 2, 3, 32, 33, 34, 35, 48, 49, 50, 51), cells)
    }

    @Test
    fun `a flat board shows its line and the void shows its only cell`() {
        val flat = config(3, ViewMode.FLAT)
        assertEquals(listOf(3, 4, 5), findWinningCells(flat, boardOf(9, 3 to Player.O, 4 to Player.O, 5 to Player.O), GameState(flat).layerWinners, Player.O))
        val void = config(1, ViewMode.CUBE)
        assertEquals(listOf(0), findWinningCells(void, boardOf(1, 0 to Player.X), GameState(void).layerWinners, Player.X))
    }

    @Test
    fun `no winner or no line gives nothing`() {
        val c = config(3, ViewMode.CUBE)
        assertNull(findWinningCells(c, boardOf(27), GameState(c).layerWinners, null))
        assertNull(findWinningCells(c, boardOf(27), GameState(c).layerWinners, Player.X))
    }
}
