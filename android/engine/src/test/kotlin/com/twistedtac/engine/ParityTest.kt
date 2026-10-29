package com.twistedtac.engine

import java.io.File
import kotlin.math.abs
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

// Replays vectors generated from the canonical TypeScript engine
// (scripts/gen-parity-vectors.ts). Regenerate with:
//   npx vite-node scripts/gen-parity-vectors.ts

@Serializable
private data class Step(
    val move: Int,
    val isXNext: Boolean,
    val illegal: List<Int>,
    val board: String,
    val layerWinners: List<LayerResult>,
    val winner: Player? = null,
    val draw: Boolean,
    val crossLayerWinningLine: List<Int>? = null,
    val winningLine: List<Int>? = null,
    val nextIsXNext: Boolean,
    val terminal: Player? = null,
    val hasLegalMoves: Boolean,
)

@Serializable
private data class Snapshot(
    val board: String,
    val layerWinners: List<LayerResult>,
    val evalX: Double,
    val evalO: Double,
    val threatsX: List<Int>,
    val threatsO: List<Int>,
)

@Serializable
private data class Game(val steps: List<Step>, val snapshots: List<Snapshot>)

@Serializable
private data class ConfigVectors(
    val size: Int,
    val viewMode: ViewMode,
    val winLength: Int,
    val layerCount: Int,
    val matchWinThreshold: Int,
    val cellCount: Int,
    val cellsPerLayer: Int,
    val layerLines: List<List<List<Int>>>,
    val crossLines: List<List<Int>>,
    val games: List<Game>,
)

@Serializable
private data class Vectors(val configs: List<ConfigVectors>)

private fun decodeBoard(text: String): Board = text.map {
    when (it) {
        'X' -> Player.X
        'O' -> Player.O
        else -> null
    }
}

private val parityJson = Json { ignoreUnknownKeys = true }

private val vectors: Vectors by lazy {
    val stream = Vectors::class.java.classLoader.getResourceAsStream("parity-vectors.json")
    assertNotNull(stream, "parity-vectors.json is on the test classpath")
    parityJson.decodeFromString(stream.readBytes().decodeToString())
}

class ParityTest {
    @Test
    fun `config values and line tables match`() {
        for (vector in vectors.configs) {
            val label = "${vector.size} ${vector.viewMode}"
            val config = assertNotNull(GameRulesConfig.of(vector.size, vector.viewMode))
            assertEquals(vector.winLength, config.winLength, "$label winLength")
            assertEquals(vector.layerCount, config.layerCount, "$label layerCount")
            assertEquals(vector.matchWinThreshold, config.matchWinThreshold, "$label threshold")
            assertEquals(vector.cellCount, config.cellCount, "$label cellCount")
            assertEquals(vector.cellsPerLayer, config.cellsPerLayer, "$label cellsPerLayer")
            assertEquals(vector.layerLines, config.layerLines, "$label layer lines")
            assertEquals(vector.crossLines, config.crossLayerLines, "$label cross lines")
        }
    }

    @Test
    fun `every replayed move produces the same result`() {
        var steps = 0
        for (vector in vectors.configs) {
            val label = "${vector.size} ${vector.viewMode}"
            val config = assertNotNull(GameRulesConfig.of(vector.size, vector.viewMode))

            for ((gameNumber, game) in vector.games.withIndex()) {
                var state = GameState(config)
                for ((stepNumber, step) in game.steps.withIndex()) {
                    val context = "$label game $gameNumber step $stepNumber"

                    for (bad in step.illegal) {
                        assertNull(
                            applyMove(config, state.board, state.layerWinners, bad, step.isXNext),
                            "$context: move $bad should be illegal",
                        )
                    }

                    val result = assertNotNull(
                        applyMove(config, state.board, state.layerWinners, step.move, step.isXNext),
                        "$context: move ${step.move} should be legal",
                    )
                    assertEquals(decodeBoard(step.board), result.board, "$context board")
                    assertEquals(step.layerWinners, result.layerWinners, "$context layer winners")
                    assertEquals(step.winner, result.winner, "$context winner")
                    assertEquals(step.draw, result.draw, "$context draw")
                    assertEquals(step.crossLayerWinningLine, result.crossLayerWinningLine, "$context cross line")
                    assertEquals(step.winningLine, result.winningLine, "$context winning line")
                    assertEquals(step.nextIsXNext, result.isXNext, "$context next turn")
                    assertEquals(step.terminal, getTerminalWinner(config, result.board, result.layerWinners), "$context terminal")
                    assertEquals(step.hasLegalMoves, hasLegalMoves(config, result.board, result.layerWinners), "$context legal moves")

                    state = GameState(result.board, result.layerWinners)
                    steps += 1
                }
            }
        }
        assertTrue(steps > 2000, "replayed $steps steps")
    }

    @Test
    fun `AI evaluation and threat detection match`() {
        var snapshots = 0
        for (vector in vectors.configs) {
            val label = "${vector.size} ${vector.viewMode}"
            val config = assertNotNull(GameRulesConfig.of(vector.size, vector.viewMode))

            for (game in vector.games) {
                for (snapshot in game.snapshots) {
                    val board = decodeBoard(snapshot.board)
                    val evalX = evaluatePositionFor(config, board, snapshot.layerWinners, Player.X)
                    val evalO = evaluatePositionFor(config, board, snapshot.layerWinners, Player.O)
                    assertTrue(abs(evalX - snapshot.evalX) < 1e-9, "$label evalX $evalX vs ${snapshot.evalX}")
                    assertTrue(abs(evalO - snapshot.evalO) < 1e-9, "$label evalO $evalO vs ${snapshot.evalO}")
                    assertEquals(snapshot.threatsX, getImmediateWinningMoves(config, board, snapshot.layerWinners, Player.X), "$label threats X")
                    assertEquals(snapshot.threatsO, getImmediateWinningMoves(config, board, snapshot.layerWinners, Player.O), "$label threats O")
                    snapshots += 1
                }
            }
        }
        assertTrue(snapshots > 100, "checked $snapshots snapshots")
    }
}
