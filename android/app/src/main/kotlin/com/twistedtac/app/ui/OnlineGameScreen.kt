package com.twistedtac.app.ui

import android.content.Intent
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.twistedtac.app.backend.MatchService
import com.twistedtac.app.board.BoardViewport
import com.twistedtac.app.game.ConnectionStatus
import com.twistedtac.app.game.GameFeedback
import com.twistedtac.app.game.GameOutcome
import com.twistedtac.app.game.GameSettings
import com.twistedtac.app.game.OnlineMatchModel
import com.twistedtac.app.theme.Palette
import com.twistedtac.engine.DisconnectTimeout
import com.twistedtac.engine.MatchStatus
import com.twistedtac.engine.OnlineScoring
import com.twistedtac.engine.RankOutcome
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.time.Instant

/** An online match: waiting room, live game, and the result. */
@Composable
fun OnlineGameScreen(
    model: OnlineMatchModel,
    settings: GameSettings,
    feedback: GameFeedback,
    forceAccessibleBoard: Boolean,
    onExit: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    val viewport = remember { BoardViewport(scope) }
    var showGameOver by remember { mutableStateOf(false) }
    var showExitDialog by remember { mutableStateOf(false) }
    var leaving by remember { mutableStateOf(false) }

    DisposableEffect(model) {
        model.start()
        onDispose { model.stop() }
    }
    // Tell the opponent when we leave and come back, as the web's visibility handling does.
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    DisposableEffect(lifecycle, model) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_START -> model.appBecameActive(true)
                Lifecycle.Event.ON_STOP -> model.appBecameActive(false)
                else -> Unit
            }
        }
        lifecycle.addObserver(observer)
        onDispose { lifecycle.removeObserver(observer) }
    }

    val status = model.match.status
    val unfinished = status == MatchStatus.WAITING || status == MatchStatus.ACTIVE
    BackHandler { if (unfinished) showExitDialog = true else onExit() }

    LaunchedEffect(model.outcome) {
        if (model.outcome == null) {
            showGameOver = false
        } else {
            delay(if (model.match.winner == null) 450 else 950)
            showGameOver = true
        }
    }

    when (status) {
        MatchStatus.WAITING -> WaitingRoom(model, leaving, onLeave = { showExitDialog = true })
        MatchStatus.ABANDONED -> AbandonedScreen(model, onExit)
        MatchStatus.ACTIVE, MatchStatus.FINISHED -> OnlineGame(
            model, settings, viewport, feedback, forceAccessibleBoard, showGameOver,
            onHideOverlay = { showGameOver = false },
            onBack = { if (unfinished) showExitDialog = true else onExit() },
            onExit = onExit,
        )
    }

    if (showExitDialog) {
        val waiting = status == MatchStatus.WAITING
        AlertDialog(
            onDismissRequest = { showExitDialog = false },
            containerColor = Palette.backgroundTop,
            titleContentColor = Palette.foreground,
            textContentColor = Palette.muted,
            title = { Text(if (waiting) (if (model.isHost) "Cancel room?" else "Leave room?") else "Forfeit match?") },
            text = {
                Text(
                    if (waiting) "This will end the room. You won't be able to resume this match."
                    else "Your opponent will win. This match can't be resumed.",
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    showExitDialog = false
                    scope.launch {
                        leaving = true
                        if (model.forfeit()) onExit()
                        leaving = false
                    }
                }) { Text(if (waiting) "Exit" else "Forfeit & exit", color = Palette.playerX) }
            },
            dismissButton = { TextButton(onClick = { showExitDialog = false }) { Text("Stay", color = Palette.playerO) } },
        )
    }

    model.errorMessage?.let { message ->
        AlertDialog(
            onDismissRequest = { model.errorMessage = null },
            containerColor = Palette.backgroundTop,
            titleContentColor = Palette.foreground,
            textContentColor = Palette.muted,
            title = { Text("Something went wrong") },
            text = { Text(message) },
            confirmButton = { TextButton(onClick = { model.errorMessage = null }) { Text("OK", color = Palette.playerO) } },
        )
    }
}

@Composable
private fun WaitingRoom(model: OnlineMatchModel, leaving: Boolean, onLeave: () -> Unit) {
    val context = LocalContext.current
    Column(
        Modifier.fillMaxSize().background(Palette.background).systemBarsPadding().padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(22.dp, Alignment.CenterVertically),
    ) {
        CircularProgressIndicator(color = Palette.playerO, modifier = Modifier.size(44.dp))
        Text("Waiting for opponent", color = Palette.foreground, fontSize = 28.sp, fontWeight = FontWeight.Black, textAlign = TextAlign.Center)
        Text(
            if (model.isHost) "Share this code or link with a friend." else "The host is setting up the room.",
            color = Palette.muted, fontSize = 16.sp,
        )
        Text(
            model.match.roomCode,
            color = Palette.foreground,
            fontSize = 44.sp,
            fontWeight = FontWeight.Black,
            fontFamily = FontFamily.Monospace,
            letterSpacing = 8.sp,
            modifier = Modifier.glass(RoundedCornerShape(22.dp)).padding(horizontal = 24.dp, vertical = 16.dp),
        )
        if (model.isHost) {
            GlassButton(
                onClick = {
                    val send = Intent(Intent.ACTION_SEND).apply {
                        type = "text/plain"
                        putExtra(
                            Intent.EXTRA_TEXT,
                            "Play Twisted Tac with me! Room code ${model.match.roomCode}\n${MatchService.inviteLink(model.match.roomCode)}",
                        )
                    }
                    context.startActivity(Intent.createChooser(send, "Share invite"))
                },
                tint = Palette.playerO,
                prominent = true,
                modifier = Modifier.fillMaxWidth(0.8f),
            ) { GlassLabel("Share invite") }
        }
        Text("Room expires after 10 minutes without a guest.", color = Palette.muted, fontSize = 13.sp)
        GlassButton(onLeave, Modifier.fillMaxWidth(0.8f)) {
            if (leaving) CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.dp, color = Palette.foreground)
            else GlassLabel(if (model.isHost) "Cancel room" else "Leave room", color = Palette.playerX)
        }
    }
}

@Composable
private fun AbandonedScreen(model: OnlineMatchModel, onExit: () -> Unit) {
    val mutual = model.match.abandonReason == "mutual_disconnect"
    BackHandler(onBack = onExit)
    Column(
        Modifier.fillMaxSize().background(Palette.background).systemBarsPadding().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically),
    ) {
        Text(if (mutual) "Match abandoned" else "Room closed", color = Palette.foreground, fontSize = 28.sp, fontWeight = FontWeight.Black)
        Text(
            if (mutual) "Both players disconnected, so nobody wins or loses points." else "This room is no longer open.",
            color = Palette.muted, fontSize = 16.sp, textAlign = TextAlign.Center,
        )
        GlassButton(onExit, Modifier.fillMaxWidth(0.7f), tint = Palette.playerO, prominent = true) { GlassLabel("Back") }
    }
}

@Composable
private fun OnlineGame(
    model: OnlineMatchModel,
    settings: GameSettings,
    viewport: BoardViewport,
    feedback: GameFeedback,
    forceAccessibleBoard: Boolean,
    showGameOver: Boolean,
    onHideOverlay: () -> Unit,
    onBack: () -> Unit,
    onExit: () -> Unit,
) {
    GameLayout(
        model = model,
        viewport = viewport,
        feedback = feedback,
        forceAccessibleBoard = forceAccessibleBoard,
        statusText = statusText(model),
        layerEvent = model.layerEvent,
        layerBannerLabel = { event -> if (event.winner == model.mySymbol) "YOURS" else model.opponentName.uppercase() },
        topBar = { modifier ->
            GameTopBar(
                title = boardTitle(model.config),
                subtitle = "Online · You are ${model.mySymbol.name}",
                onBack = onBack,
                backDescription = "Leave match",
                modifier = modifier,
            ) { MuteControl(settings) }
        },
        banner = { ConnectionBanner(model) },
        scoreboard = { modifier ->
            Scoreboard(
                xLabel = model.xName,
                oLabel = model.oName,
                xScore = model.state.layerWinners.count { it.winner == com.twistedtac.engine.Player.X },
                oScore = model.state.layerWinners.count { it.winner == com.twistedtac.engine.Player.O },
                threshold = if (model.config.is3D && model.config.size > 1) model.config.matchWinThreshold else 0,
                xActive = model.match.winner == com.twistedtac.engine.Player.X || (model.isPlaying && model.match.isXNext),
                oActive = model.match.winner == com.twistedtac.engine.Player.O || (model.isPlaying && !model.match.isXNext),
                thinkingSide = if (model.isPlaying && !model.isMyTurn) model.mySymbol.opponent else null,
                modifier = modifier,
            )
        },
        overlay = {
            val outcome = model.outcome
            val result = model.rankOutcome
            if (showGameOver && outcome != null && result != null) {
                GameOverOverlay(
                    title = when (result) {
                        RankOutcome.WIN -> "YOU WIN"
                        RankOutcome.LOSS -> "YOU LOSE"
                        RankOutcome.DRAW -> "STALEMATE"
                    },
                    subtitle = resultSubtitle(model, outcome),
                    accent = if (result == RankOutcome.WIN) Palette.playerX else Palette.playerO,
                    points = OnlineScoring.points(result),
                    primaryLabel = "New game",
                    onPrimary = onExit,
                    onViewBoard = onHideOverlay,
                    onMenu = onExit,
                )
            }
        },
    )
}

@Composable
private fun ConnectionBanner(model: OnlineMatchModel) {
    val since = model.opponentDisconnectedAt
    val text = when {
        model.connection == ConnectionStatus.RECONNECTING -> "Reconnecting…"
        model.isPlaying && since != null -> {
            val now by produceState(Instant.now()) {
                while (true) {
                    delay(1000)
                    value = Instant.now()
                }
            }
            val left = DisconnectTimeout.remaining(since, now) ?: 0.0
            "Opponent disconnected — you win if they don't return in ${DisconnectTimeout.format(left)}"
        }
        else -> return
    }
    Text(
        text,
        color = Palette.foreground,
        fontSize = 12.sp,
        modifier = Modifier
            .fillMaxWidth()
            .glass(RoundedCornerShape(12.dp), tint = Palette.playerX)
            .padding(horizontal = 12.dp, vertical = 8.dp),
    )
}

private fun statusText(model: OnlineMatchModel): String = when (val outcome = model.outcome) {
    GameOutcome.Draw -> "Game ended in a draw."
    is GameOutcome.Win -> {
        val mine = outcome.player == model.mySymbol
        when (model.match.abandonReason) {
            "voluntary_forfeit" -> if (mine) "Opponent forfeited — you win!" else "You forfeited."
            "disconnect_timeout" -> if (mine) "Opponent disconnected — you win!" else "You were disconnected too long."
            else -> if (mine) "You win!" else "${model.opponentName} wins."
        }
    }
    null -> if (model.isMyTurn) "Your turn." else "Opponent's turn."
}

private fun resultSubtitle(model: OnlineMatchModel, outcome: GameOutcome): String {
    val win = outcome as? GameOutcome.Win ?: return "The cube holds. Nobody cracked it."
    val mine = win.player == model.mySymbol
    return when (model.match.abandonReason) {
        "voluntary_forfeit" -> if (mine) "${model.opponentName} forfeited the match." else "You forfeited the match."
        "disconnect_timeout" -> if (mine) "${model.opponentName} left and never came back." else "You were away too long."
        else -> if (mine) "${model.opponentName} has been out-stacked." else "${model.opponentName} out-stacked you."
    }
}
