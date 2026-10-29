package com.twistedtac.app.ui

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.twistedtac.app.board.BoardView
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

    val accessibleBoard = rememberAccessibleBoardNeeded(forceAccessibleBoard)

    val topBar: @Composable (Modifier) -> Unit = { modifier ->
        TopBar(
            model = model,
            settings = settings,
            onBack = onExit,
            onRules = { showRules = true },
            onRestart = { model.restart(); viewport.reset() },
            modifier = modifier,
        )
    }
    val scoreboard: @Composable (Modifier) -> Unit = { modifier ->
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
    }
    val board: @Composable (Modifier) -> Unit = { modifier ->
        Box(modifier) {
            if (accessibleBoard) {
                AccessibleBoard(model, Modifier.fillMaxSize())
            } else {
                BoardView(model, viewport, Modifier.fillMaxSize())
                LayerBanner(model, Modifier.align(Alignment.TopCenter))
            }
        }
    }
    val status: @Composable () -> Unit = {
        Text(
            text = statusText(model),
            color = Palette.foreground,
            fontSize = 15.sp,
            fontWeight = FontWeight.Medium,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth().semantics { liveRegion = LiveRegionMode.Polite },
        )
    }
    val controls: @Composable (Modifier) -> Unit = { modifier ->
        if (!accessibleBoard) CameraControls(viewport, model.config.is3D, feedback, modifier)
    }

    Box(Modifier.fillMaxSize().background(Palette.background)) {
        BoxWithConstraints(Modifier.fillMaxSize().systemBarsPadding().padding(horizontal = 14.dp)) {
            if (maxWidth > maxHeight) {
                // Landscape: the board takes the height, the HUD stacks beside it.
                Row(Modifier.fillMaxSize(), horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                    board(Modifier.weight(1f).fillMaxHeight())
                    Column(
                        Modifier.width(SIDE_PANEL_WIDTH).fillMaxHeight().verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(10.dp, Alignment.CenterVertically),
                    ) {
                        topBar(Modifier.padding(top = 4.dp))
                        scoreboard(Modifier)
                        status()
                        controls(Modifier.padding(bottom = 6.dp))
                    }
                }
            } else {
                Column(
                    Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    topBar(Modifier.widthIn(max = READABLE_WIDTH).padding(top = 4.dp))
                    scoreboard(Modifier.widthIn(max = READABLE_WIDTH))
                    board(Modifier.weight(1f).fillMaxWidth())
                    status()
                    controls(Modifier.widthIn(max = READABLE_WIDTH).padding(bottom = 6.dp))
                }
            }
        }

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
    }

    if (showRules) RulesSheet(onDismiss = { showRules = false })
}

private val READABLE_WIDTH = 560.dp
private val SIDE_PANEL_WIDTH = 340.dp

@Composable
private fun TopBar(
    model: LocalGameModel,
    settings: GameSettings,
    onBack: () -> Unit,
    onRules: () -> Unit,
    onRestart: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
        IconControl(onBack, "Back to menu") { Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = Palette.foreground) }
        Column(Modifier.weight(1f)) {
            Text(boardTitle(model), color = Palette.foreground, fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
            Text(if (model.mode == LocalMode.VS_AI) "vs AI" else "2 players", color = Palette.muted, fontSize = 12.sp)
        }
        IconControl(onRules, "Rules") { Icon(Icons.Filled.Info, null, tint = Palette.foreground) }
        IconControl(settings::toggleSound, if (settings.soundMuted) "Unmute" else "Mute") {
            SpeakerGlyph(settings.soundMuted, Palette.foreground)
        }
        IconControl(onRestart, "Restart game") { Icon(Icons.Filled.Refresh, null, tint = Palette.foreground) }
    }
}

@Composable
private fun IconControl(onClick: () -> Unit, description: String, icon: @Composable () -> Unit) {
    GlassButton(
        onClick = onClick,
        shape = RoundedCornerShape(50),
        minHeight = 44.dp,
        description = description,
        modifier = Modifier.size(44.dp),
    ) { icon() }
}

@Composable
private fun LayerBanner(model: LocalGameModel, modifier: Modifier = Modifier) {
    val event = model.layerEvent
    AnimatedVisibility(
        visible = event != null,
        modifier = modifier.padding(top = 8.dp),
        enter = scaleIn() + fadeIn(),
        exit = scaleOut() + fadeOut(),
    ) {
        if (event != null) {
            val who = if (model.mode == LocalMode.VS_AI) (if (event.winner == Player.X) "YOURS" else "AI'S") else event.winner.name
            Text(
                "LAYER ${event.layerNumber} · $who",
                color = Palette.foreground,
                fontSize = 17.sp,
                fontWeight = FontWeight.Black,
                modifier = Modifier
                    .glass(RoundedCornerShape(50), tint = Palette.color(event.winner), strength = 3f)
                    .padding(horizontal = 18.dp, vertical = 10.dp),
            )
        }
    }
}

private fun boardTitle(model: LocalGameModel): String {
    val size = model.config.size
    if (size == 1) return "THE VOID"
    return if (model.config.is3D) "$size×$size×$size" else "$size×$size 2D"
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
