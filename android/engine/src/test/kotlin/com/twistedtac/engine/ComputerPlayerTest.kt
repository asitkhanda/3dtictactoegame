package com.twistedtac.engine

import java.util.concurrent.TimeUnit
import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue
import org.junit.jupiter.api.Timeout

// Ported from src/utils/gameAi.test.ts.

private fun config(size: Int, mode: ViewMode) = GameRulesConfig.of(size, mode)!!

/** Places marks directly for tactical set-ups, bypassing turn order. */
private fun seed(config: GameRulesConfig, marks: Map<Int, Player>): GameState {
    val board = MutableList<Player?>(config.cellCount) { null }
    marks.forEach { (index, mark) -> board[index] = mark }
    return GameState(board, GameState(config).layerWinners)
}

private typealias Agent = (GameRulesConfig, Board, List<LayerResult>, Player) -> Int?

private val aiAgent: Agent = { config, board, layers, player -> getComputerMove(config, board, layers, player) }

/** Casual-player proxy: takes a win, blocks a loss, otherwise plays randomly. */
private val greedyAgent: Agent = { config, board, layers, player ->
    val moves = legalMoves(config, board, layers)
    when {
        moves.isEmpty() -> null
        else -> moves.firstOrNull { applyMove(config, board, layers, it, player == Player.X)?.winner == player }
            ?: moves.firstOrNull {
                applyMove(config, board, layers, it, player.opponent == Player.X)?.winner == player.opponent
            }
            ?: moves.random()
    }
}

private enum class Outcome { X, O, DRAW }

private fun playGame(config: GameRulesConfig, x: Agent, o: Agent): Outcome {
    var state = GameState(config)
    var isXNext = true
    repeat(config.cellCount + 1) {
        val agent = if (isXNext) x else o
        val move = agent(config, state.board, state.layerWinners, if (isXNext) Player.X else Player.O)
            ?: return Outcome.DRAW
        val result = applyMove(config, state.board, state.layerWinners, move, isXNext)
        assertNotNull(result, "illegal move $move")
        state = GameState(result.board, result.layerWinners)
        isXNext = result.isXNext
        result.winner?.let { return if (it == Player.X) Outcome.X else Outcome.O }
        if (result.draw) return Outcome.DRAW
    }
    return Outcome.DRAW
}

private class Tally(val win: Int, val loss: Int, val draw: Int)

private fun tally(config: GameRulesConfig, opponent: Agent, games: Int): Tally {
    var win = 0; var loss = 0; var draw = 0
    repeat(games) {
        when (playGame(config, opponent, aiAgent)) {
            Outcome.O -> win++
            Outcome.X -> loss++
            Outcome.DRAW -> draw++
        }
    }
    return Tally(win, loss, draw)
}

class ComputerTacticsTest {
    @Test
    fun `completes a winning line when one is available`() {
        val c = config(3, ViewMode.FLAT)
        val state = seed(c, mapOf(0 to Player.O, 1 to Player.O, 3 to Player.X, 4 to Player.X))
        assertEquals(2, getComputerMove(c, state.board, state.layerWinners))
    }

    @Test
    fun `blocks the opponent instead of building its own line`() {
        val c = config(3, ViewMode.FLAT)
        val state = seed(c, mapOf(0 to Player.X, 1 to Player.X, 4 to Player.O))
        assertEquals(2, getComputerMove(c, state.board, state.layerWinners))
    }

    @Test
    fun `completes a line through the stack in 3D`() {
        val c = config(3, ViewMode.CUBE)
        val state = seed(c, mapOf(0 to Player.O, 9 to Player.O, 4 to Player.X, 13 to Player.X))
        assertEquals(18, getComputerMove(c, state.board, state.layerWinners))
    }

    @Test
    fun `refuses the corner trap that would let the opponent fork`() {
        val c = config(3, ViewMode.FLAT)
        val state = seed(c, mapOf(0 to Player.X, 8 to Player.X, 4 to Player.O))
        val move = getComputerMove(c, state.board, state.layerWinners)
        assertTrue(move in listOf(1, 3, 5, 7), "played $move")
    }

    @Test
    fun `returns null when the board offers no legal move`() {
        val c = config(3, ViewMode.FLAT)
        val x = Player.X
        val o = Player.O
        val state = seed(c, mapOf(0 to x, 1 to o, 2 to x, 3 to x, 4 to o, 5 to o, 6 to o, 7 to x, 8 to x))
        assertNull(getComputerMove(c, state.board, state.layerWinners))
    }

    @Test
    fun `a seeded generator makes the tie-break reproducible`() {
        val c = config(3, ViewMode.FLAT)
        val state = GameState(c)
        val first = getComputerMove(c, state.board, state.layerWinners, Player.X, Random(7))
        val second = getComputerMove(c, state.board, state.layerWinners, Player.X, Random(7))
        assertEquals(first, second)
    }
}

class ComputerStrengthTest {
    // 3x3 is small enough to search exhaustively, so perfect play is expected.
    @Test
    @Timeout(2, unit = TimeUnit.MINUTES)
    fun `never loses the classic 3x3 board`() {
        val score = tally(config(3, ViewMode.FLAT), greedyAgent, games = 40)
        assertEquals(0, score.loss)
    }

    @Test
    @Timeout(2, unit = TimeUnit.MINUTES)
    fun `always draws against itself on 3x3`() {
        val c = config(3, ViewMode.FLAT)
        repeat(10) { assertEquals(Outcome.DRAW, playGame(c, aiAgent, aiAgent)) }
    }

    @Test
    @Timeout(3, unit = TimeUnit.MINUTES)
    fun `dominates a casual opponent on 3x3x3`() {
        val games = 40
        val score = tally(config(3, ViewMode.CUBE), greedyAgent, games)
        // ~99% when the machine is idle. The search is bounded by wall-clock time,
        // so a starved CPU searches shallower; the floor leaves room for that
        // while still catching a broken engine.
        assertTrue(score.win.toDouble() / games >= 0.7, "won ${score.win} of $games")
    }

    @Test
    @Timeout(1, unit = TimeUnit.MINUTES)
    fun `stays responsive on the largest secret board`() {
        val c = config(8, ViewMode.CUBE)
        val state = GameState(c)
        val started = System.nanoTime()
        val move = getComputerMove(c, state.board, state.layerWinners)
        val elapsedMs = (System.nanoTime() - started) / 1_000_000.0

        assertTrue((move ?: -1) >= 0)
        // The search is time-bounded; the ceiling is loose because a cold JVM
        // has not compiled the hot loop yet on this first call.
        assertTrue(elapsedMs < 2000, "took $elapsedMs ms")
    }
}
