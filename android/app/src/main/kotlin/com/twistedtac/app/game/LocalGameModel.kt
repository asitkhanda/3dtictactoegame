package com.twistedtac.app.game

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.twistedtac.engine.GameRulesConfig
import com.twistedtac.engine.GameState
import com.twistedtac.engine.Player
import com.twistedtac.engine.applyMove
import com.twistedtac.engine.getComputerMove
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

enum class LocalMode { VS_AI, TWO_PLAYER }

data class LayerEvent(val layerNumber: Int, val winner: Player, val id: Long = System.nanoTime())

sealed interface GameOutcome {
    data class Win(val player: Player) : GameOutcome
    data object Draw : GameOutcome
}

/**
 * One local game (vs the AI, or pass-and-play). Local games are casual and
 * never touch the leaderboard, same as the web app and iOS.
 */
class LocalGameModel(
    override val config: GameRulesConfig,
    val mode: LocalMode,
    private val scope: CoroutineScope,
    private val feedback: GameFeedback = GameFeedback.None,
) : BoardGameSource {
    override var state by mutableStateOf(GameState(config))
        private set
    var isXNext by mutableStateOf(true)
        private set
    var outcome by mutableStateOf<GameOutcome?>(null)
        private set
    override var winningLine by mutableStateOf<List<Int>?>(null)
        private set
    override var lastMove by mutableStateOf<Int?>(null)
        private set
    var layerEvent by mutableStateOf<LayerEvent?>(null)
        private set
    var thinking by mutableStateOf(false)
        private set

    private var aiJob: Job? = null
    private var clearJob: Job? = null

    val winner: Player? get() = (outcome as? GameOutcome.Win)?.player
    val isFinished: Boolean get() = outcome != null
    val xLayers: Int get() = state.layerWinners.count { it.winner == Player.X }
    val oLayers: Int get() = state.layerWinners.count { it.winner == Player.O }

    override val acceptsInput: Boolean get() = !isFinished && !(mode == LocalMode.VS_AI && !isXNext)

    /** A tap on cell [index]. Illegal taps get the "invalid" cue and nothing else. */
    override fun humanTap(index: Int) {
        if (!acceptsInput) return
        if (!apply(index)) feedback.play(Cue.INVALID)
    }

    fun restart() {
        aiJob?.cancel()
        clearJob?.cancel()
        state = GameState(config)
        isXNext = true
        outcome = null
        winningLine = null
        lastMove = null
        layerEvent = null
        thinking = false
    }

    fun clearLayerEvent() {
        layerEvent = null
    }

    fun stop() {
        aiJob?.cancel()
        clearJob?.cancel()
    }

    private fun apply(index: Int): Boolean {
        val result = applyMove(config, state.board, state.layerWinners, index, isXNext) ?: return false

        val mover = if (isXNext) Player.X else Player.O
        feedback.play(if (mover == Player.X) Cue.PLACE_X else Cue.PLACE_O)

        val claimed = result.layerWinners.indices.firstOrNull {
            result.layerWinners[it].winner != null && state.layerWinners[it].winner == null
        }

        state = GameState(result.board, result.layerWinners)
        isXNext = result.isXNext
        lastMove = index
        winningLine = result.winningLine
        scheduleLastMoveClear()

        result.winner?.let { winner ->
            outcome = GameOutcome.Win(winner)
            val youWon = mode == LocalMode.TWO_PLAYER || winner == Player.X
            feedback.play(if (youWon) Cue.VICTORY else Cue.DEFEAT)
            return true
        }
        if (result.draw) {
            outcome = GameOutcome.Draw
            feedback.play(Cue.DRAW)
            return true
        }

        val owner = claimed?.let { result.layerWinners[it].winner }
        if (claimed != null && owner != null) {
            layerEvent = LayerEvent(claimed + 1, owner)
            val lost = mode == LocalMode.VS_AI && owner == Player.O
            feedback.play(if (lost) Cue.LAYER_LOST else Cue.LAYER_WIN)
        } else if (mode == LocalMode.VS_AI && isXNext) {
            feedback.play(Cue.YOUR_TURN)
        }

        if (mode == LocalMode.VS_AI && !isXNext) scheduleAiMove()
        return true
    }

    private fun scheduleAiMove() {
        thinking = true
        val snapshot = state
        aiJob?.cancel()
        aiJob = scope.launch {
            // A beat of "thinking", shorter on the big boards.
            delay(if (config.size >= 6) 400 else 750)
            val move = withContext(Dispatchers.Default) {
                getComputerMove(config, snapshot.board, snapshot.layerWinners, Player.O)
            }
            thinking = false
            if (move != null) apply(move)
        }
    }

    private fun scheduleLastMoveClear() {
        clearJob?.cancel()
        clearJob = scope.launch {
            delay(1500)
            // Once the game is over, the final move stays lit next to the winning pieces.
            if (!isFinished) lastMove = null
        }
    }
}
