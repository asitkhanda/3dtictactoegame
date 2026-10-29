package com.twistedtac.app.ui

import androidx.activity.compose.BackHandler
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import com.twistedtac.app.board.BoardViewport
import com.twistedtac.app.game.GameFeedback
import com.twistedtac.app.game.GameOutcome
import com.twistedtac.app.game.GameSettings
import com.twistedtac.app.game.LocalGameModel
import com.twistedtac.app.game.LocalMode
import com.twistedtac.app.theme.Palette
import com.twistedtac.engine.Player
import kotlinx.coroutines.delay

@Composable
fun GameScreen(
    model: LocalGameModel,
    settings: GameSettings,
    feedback: GameFeedback,
    forceAccessibleBoard: Boolean,
    onExit: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    val viewport = remember { BoardViewport(scope) }
    var showGameOver by remember { mutableStateOf(false) }
    var showRules by remember { mutableStateOf(false) }

    BackHandler(onBack = onExit)
    DisposableEffect(model) { onDispose { model.stop() } }

    // Let the final position land before the overlay takes the screen.
    LaunchedEffect(model.isFinished) {
        if (!model.isFinished) {
            showGameOver = false
        } else {
            delay(if (model.winner == null) 450 else 950)
            showGameOver = true
        }
    }
    LaunchedEffect(model.layerEvent) {
        if (model.layerEvent != null) {
            delay(1400)
            model.clearLayerEvent()
        }
    }

    fun rematch() {
        showGameOver = false
        model.restart()
        viewport.reset()
    }

    GameLayout(
        model = model,
        viewport = viewport,
        feedback = feedback,
        forceAccessibleBoard = forceAccessibleBoard,
        statusText = statusText(model),
        layerEvent = model.layerEvent,
        layerBannerLabel = { event ->
            if (model.mode == LocalMode.VS_AI) (if (event.winner == Player.X) "YOURS" else "AI'S") else event.winner.name
        },
        topBar = { modifier ->
            GameTopBar(
                title = boardTitle(model.config),
                subtitle = if (model.mode == LocalMode.VS_AI) "vs AI" else "2 players",
                onBack = onExit,
                backDescription = "Back to menu",
                modifier = modifier,
            ) {
                IconControl({ showRules = true }, "Rules") { Icon(Icons.Filled.Info, null, tint = Palette.foreground) }
                MuteControl(settings)
                IconControl({ model.restart(); viewport.reset() }, "Restart game") {
                    Icon(Icons.Filled.Refresh, null, tint = Palette.foreground)
                }
            }
        },
        scoreboard = { modifier ->
            Scoreboard(
                xLabel = if (model.mode == LocalMode.VS_AI) "You" else "X",
                oLabel = if (model.mode == LocalMode.VS_AI) "AI" else "O",
                xScore = model.xLayers,
                oScore = model.oLayers,
                threshold = if (model.config.is3D && model.config.size > 1) model.config.matchWinThreshold else 0,
                xActive = model.winner == Player.X || (!model.isFinished && model.isXNext),
                oActive = model.winner == Player.O || (!model.isFinished && !model.isXNext),
                thinkingSide = if (model.thinking) Player.O else null,
                modifier = modifier,
            )
        },
        overlay = {
            val outcome = model.outcome
            if (showGameOver && outcome != null) {
                GameOverOverlay(
                    title = overlayTitle(model, outcome),
                    subtitle = overlaySubtitle(model, outcome),
                    accent = overlayAccent(model, outcome),
                    primaryLabel = "Rematch",
                    onPrimary = ::rematch,
                    onViewBoard = { showGameOver = false },
                    onMenu = onExit,
                )
            }
        },
    )

    if (showRules) RulesSheet(onDismiss = { showRules = false })
}

@Composable
fun MuteControl(settings: GameSettings) {
    IconControl(settings::toggleSound, if (settings.soundMuted) "Unmute" else "Mute") {
        SpeakerGlyph(settings.soundMuted, Palette.foreground)
    }
}

private fun statusText(model: LocalGameModel): String = when (val outcome = model.outcome) {
    GameOutcome.Draw -> "Game ended in a draw."
    is GameOutcome.Win ->
        if (model.mode == LocalMode.VS_AI) (if (outcome.player == Player.X) "You win!" else "AI wins!") else "${outcome.player.name} wins!"
    null ->
        if (model.mode == LocalMode.VS_AI) (if (model.isXNext) "Your turn." else "AI is thinking.")
        else "Player ${if (model.isXNext) "X" else "O"}'s turn."
}

private fun overlayTitle(model: LocalGameModel, outcome: GameOutcome): String = when (outcome) {
    GameOutcome.Draw -> "STALEMATE"
    is GameOutcome.Win ->
        if (model.mode == LocalMode.VS_AI) (if (outcome.player == Player.X) "YOU WIN" else "AI WINS") else "${outcome.player.name} TAKES IT"
}

private fun overlaySubtitle(model: LocalGameModel, outcome: GameOutcome): String = when (outcome) {
    GameOutcome.Draw -> "The cube holds. Nobody cracked it."
    is GameOutcome.Win -> when {
        model.config.size == 1 -> "The void is claimed."
        !model.config.is3D -> "Line complete."
        else -> "The stack is yours."
    }
}

private fun overlayAccent(model: LocalGameModel, outcome: GameOutcome): Color = when (outcome) {
    GameOutcome.Draw -> Palette.playerO
    is GameOutcome.Win -> if (model.mode == LocalMode.TWO_PLAYER) Palette.color(outcome.player) else if (outcome.player == Player.X) Palette.playerX else Palette.playerO
}
