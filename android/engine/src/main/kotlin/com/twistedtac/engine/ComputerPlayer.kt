// Kotlin port of the computer opponent in ComputerPlayer.swift / gameRules.ts:
// negamax with alpha-beta pruning and iterative deepening, bounded by
// wall-clock time so it blocks a thread for the same short slice on every
// device. Every position it searches comes from applyMove, so the AI can never
// disagree with the rules.

package com.twistedtac.engine

import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.random.Random

private const val SEARCH_TIME_BUDGET_MS = 40.0

/** The clock is read every N nodes rather than every node. */
private const val TIME_CHECK_MASK = 255
private const val MAX_SEARCH_DEPTH = 12

/** Score for a forced win, reduced by ply so quicker wins are preferred. */
private const val WIN_SCORE = 1_000_000.0

/** Cross-layer lines end the match outright, so they outrank layer lines. */
private const val CROSS_LINE_WEIGHT = 1.35
private const val LAYER_CLAIM_BONUS = 900.0

private fun nowMs(): Double = System.nanoTime() / 1_000_000.0

/** Hard ceiling so a pathological position can never spin unboundedly. */
private fun nodeBudget(config: GameRulesConfig): Int {
    val cost = (config.cellCount * config.winLength).toDouble()
    return max(20_000, min(600_000, (40_000_000 / cost).roundToInt()))
}

/** Every move that ends the match in [player]'s favour immediately. */
private fun findWinningMoves(
    config: GameRulesConfig,
    board: Board,
    layerWinners: List<LayerResult>,
    player: Player,
    moves: List<Int>,
): List<Int> = moves.filter { move ->
    applyMove(config, board, layerWinners, move, isXNext = player == Player.X)?.winner == player
}

fun getImmediateWinningMoves(
    config: GameRulesConfig,
    board: Board,
    layerWinners: List<LayerResult>,
    player: Player,
): List<Int> {
    if (!isValidBoardState(config, board) || !isValidLayerResults(config, layerWinners)) return emptyList()
    return findWinningMoves(config, board, layerWinners, player, legalMoves(config, board, layerWinners))
}

/** Value of holding [count] cells of a [winLength] line — steeply superlinear. */
private fun lineValue(count: Int, winLength: Int): Double {
    val remaining = winLength - count
    if (remaining <= 0) return 100_000.0
    return 1500 / pow3(remaining)
}

private fun pow3(exponent: Int): Double {
    var result = 1.0
    repeat(exponent) { result *= 3 }
    return result
}

/**
 * Static judgement of an unfinished position from [player]'s point of view.
 * A line only counts if it holds no opposing mark and no empty cell stranded
 * in a claimed layer — those cells can never be filled again.
 */
private fun evaluatePosition(
    config: GameRulesConfig,
    board: Board,
    layerWinners: List<LayerResult>,
    player: Player,
): Double {
    val opponent = player.opponent
    val winLength = config.winLength
    var score = 0.0

    for (line in config.lineIndex.all) {
        if (line.cells.size < winLength) continue

        var mine = 0
        var theirs = 0
        var dead = false
        for (cell in line.cells) {
            val value = board[cell]
            if (value != null) {
                if (value == player) mine += 1 else theirs += 1
            } else if (layerWinners[config.layerOf(cell)].winner != null) {
                dead = true
                break
            }
        }

        // Skip dead lines and already-completed ones (scored via layer bonuses).
        if (dead || mine >= winLength || theirs >= winLength) continue

        val weight = if (line.cross) CROSS_LINE_WEIGHT else 1.0
        if (theirs == 0 && mine > 0) {
            score += lineValue(mine, winLength) * weight
        } else if (mine == 0 && theirs > 0) {
            score -= lineValue(theirs, winLength) * weight
        }
    }

    var myLayers = 0
    var theirLayers = 0
    for (layer in layerWinners) {
        if (layer.winner == player) myLayers += 1 else if (layer.winner == opponent) theirLayers += 1
    }
    score += (myLayers - theirLayers) * LAYER_CLAIM_BONUS
    return score
}

fun evaluatePositionFor(
    config: GameRulesConfig,
    board: Board,
    layerWinners: List<LayerResult>,
    player: Player,
): Double {
    if (!isValidBoardState(config, board) || !isValidLayerResults(config, layerWinners)) {
        return Double.NEGATIVE_INFINITY
    }
    return evaluatePosition(config, board, layerWinners, player)
}

/**
 * Cheap static ordering — busier cells first — so alpha-beta prunes early.
 * Ties keep their original order, matching the stable sort in the TS engine.
 */
private fun orderMoves(moves: List<Int>, config: GameRulesConfig): List<Int> {
    val weights = config.lineIndex.weightByCell
    return moves.sortedByDescending { weights[it] }
}

private class SearchState(val budget: Int, val deadline: Double) {
    var nodes = 0
    var aborted = false

    /** True once this search has spent its node or time allowance. */
    fun outOfBudget(): Boolean {
        if (nodes > budget) return true
        if (nodes and TIME_CHECK_MASK == 0 && nowMs() > deadline) return true
        return false
    }
}

/**
 * Value of the position for the player about to move. Callers must discard
 * results from an aborted search.
 */
private fun negamax(
    config: GameRulesConfig,
    board: Board,
    layerWinners: List<LayerResult>,
    player: Player,
    depth: Int,
    ply: Int,
    alphaIn: Double,
    beta: Double,
    state: SearchState,
): Double {
    val opponent = player.opponent
    val moves = legalMoves(config, board, layerWinners)
    if (moves.isEmpty()) return 0.0
    if (depth <= 0) return evaluatePosition(config, board, layerWinners, player)

    var alpha = alphaIn
    var best = Double.NEGATIVE_INFINITY

    for (move in orderMoves(moves, config)) {
        state.nodes += 1
        if (state.outOfBudget()) {
            state.aborted = true
            return if (best == Double.NEGATIVE_INFINITY) 0.0 else best
        }

        val result = applyMove(config, board, layerWinners, move, isXNext = player == Player.X) ?: continue

        val score = when {
            result.winner == player -> WIN_SCORE - ply
            result.draw -> 0.0
            else -> {
                val value = -negamax(
                    config, result.board, result.layerWinners,
                    opponent, depth - 1, ply + 1, -beta, -alpha, state,
                )
                if (state.aborted) return if (best == Double.NEGATIVE_INFINITY) value else best
                value
            }
        }

        if (score > best) best = score
        if (best > alpha) alpha = best
        if (alpha >= beta) break
    }
    return best
}

private class RootResult(val moves: List<Int>, val score: Double)

/** Scores every root move at a fixed depth, returning all joint-best moves. */
private fun searchRoot(
    config: GameRulesConfig,
    board: Board,
    layerWinners: List<LayerResult>,
    player: Player,
    candidates: List<Int>,
    depth: Int,
    state: SearchState,
): RootResult? {
    val opponent = player.opponent
    var best = Double.NEGATIVE_INFINITY
    val bestMoves = ArrayList<Int>()

    for (move in candidates) {
        state.nodes += 1
        if (state.outOfBudget()) {
            state.aborted = true
            return null
        }

        val result = applyMove(config, board, layerWinners, move, isXNext = player == Player.X) ?: continue

        val score = when {
            result.winner == player -> WIN_SCORE
            result.draw -> 0.0
            else -> {
                val value = -negamax(
                    config, result.board, result.layerWinners,
                    opponent, depth - 1, 1, Double.NEGATIVE_INFINITY, Double.POSITIVE_INFINITY, state,
                )
                if (state.aborted) return null
                value
            }
        }

        if (score > best) {
            best = score
            bestMoves.clear()
            bestMoves.add(move)
        } else if (score == best) {
            bestMoves.add(move)
        }
    }
    return if (bestMoves.isEmpty()) null else RootResult(bestMoves, best)
}

/**
 * Chooses the computer's move, or null when no legal move exists.
 *
 * Among moves the search rates equally the engine picks at random, so it
 * plays optimally without playing the identical game every time. Tests pass
 * a seeded [Random] to make that pick reproducible.
 */
fun getComputerMove(
    config: GameRulesConfig,
    board: Board,
    layerWinners: List<LayerResult>,
    player: Player = Player.O,
    random: Random = Random.Default,
): Int? {
    val opponent = player.opponent
    val moves = legalMoves(config, board, layerWinners)
    if (moves.isEmpty()) return null
    if (config.size == 1) return moves[0]

    // Fast paths — search would find these too, but they are free and exact.
    val myWins = findWinningMoves(config, board, layerWinners, player, moves)
    if (myWins.isNotEmpty()) return myWins.random(random)

    val theirWins = findWinningMoves(config, board, layerWinners, opponent, moves)
    if (theirWins.size == 1) return theirWins[0]

    // Iterative deepening: keep the deepest completed result. Anything the
    // budget cuts short is discarded, so the move always comes from a search
    // that finished.
    val ordered = orderMoves(moves, config)
    val state = SearchState(nodeBudget(config), nowMs() + SEARCH_TIME_BUDGET_MS)
    val maxDepth = min(moves.size, MAX_SEARCH_DEPTH)
    var chosen = ordered

    for (depth in 1..max(1, maxDepth)) {
        val result = searchRoot(config, board, layerWinners, player, ordered, depth, state)
        if (result == null || state.aborted) break
        chosen = result.moves
        // A forced win (or a proven loss) will not change with more depth.
        if (result.score >= WIN_SCORE - MAX_SEARCH_DEPTH) break
    }

    return chosen.random(random)
}
