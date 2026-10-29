package com.twistedtac.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.twistedtac.app.auth.AuthManager
import com.twistedtac.app.backend.MatchService
import com.twistedtac.app.game.Cue
import com.twistedtac.app.game.GameFeedback
import com.twistedtac.app.theme.Palette
import com.twistedtac.engine.MatchRow
import com.twistedtac.engine.MatchStatus
import com.twistedtac.engine.ViewMode
import kotlinx.coroutines.launch

private enum class LobbyAction { CREATE, JOIN, CANCEL }

/** Create a room, join one by code, or resume an unfinished match. */
@Composable
fun LobbyScreen(
    auth: AuthManager,
    size: Int,
    viewMode: ViewMode,
    feedback: GameFeedback,
    onBack: () -> Unit,
    onOpen: (MatchRow) -> Unit,
) {
    var code by remember { mutableStateOf("") }
    var working by remember { mutableStateOf<LobbyAction?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var resumable by remember { mutableStateOf<MatchRow?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(auth.userId) {
        resumable = auth.userId?.let { MatchService.activeMatch(it) }
            ?.takeIf { it.status == MatchStatus.WAITING || it.status == MatchStatus.ACTIVE }
    }

    fun cancelRoom(match: MatchRow) {
        scope.launch {
            working = LobbyAction.CANCEL
            errorMessage = null
            try {
                MatchService.forfeit(match.id)
                resumable = null
            } catch (e: Exception) {
                errorMessage = e.message
            }
            working = null
        }
    }

    fun create() {
        scope.launch {
            working = LobbyAction.CREATE
            errorMessage = null
            try {
                val match = MatchService.createMatch(size, viewMode)
                feedback.play(Cue.TAP)
                onOpen(match)
            } catch (e: Exception) {
                errorMessage = e.message
            }
            working = null
        }
    }

    fun join() {
        if (code.length != 6) return
        scope.launch {
            working = LobbyAction.JOIN
            errorMessage = null
            try {
                val match = MatchService.joinMatch(code)
                code = ""
                onOpen(match)
            } catch (e: Exception) {
                errorMessage = e.message
            }
            working = null
        }
    }

    ScreenScaffold("Online", onBack) {
        Column(
            Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(22.dp),
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("Play online", color = Palette.foreground, fontSize = 32.sp, fontWeight = FontWeight.Black)
                Text("Ranked: wins +25, draws +5, losses −5.", color = Palette.muted, fontSize = 15.sp)
            }

            Column(Modifier.widthIn(max = 480.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                resumable?.let { ResumeCard(it, cancelling = working == LobbyAction.CANCEL, onCancel = { cancelRoom(it) }) { onOpen(it) } }

                Card {
                    Text("Create a room", color = Palette.foreground, fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
                    Text(
                        "Get a 6-character code to share with a friend. Rooms expire after 10 minutes.",
                        color = Palette.muted, fontSize = 13.sp,
                    )
                    GlassButton(::create, Modifier.fillMaxWidth(), tint = Palette.playerX, prominent = true) {
                        if (working == LobbyAction.CREATE) Spinner() else GlassLabel("Create room")
                    }
                }

                Card {
                    Text("Join with a code", color = Palette.foreground, fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
                    GlassTextField(
                        value = code,
                        onValueChange = { value ->
                            code = value.uppercase().filter { it.code < 128 && it.isLetterOrDigit() }.take(6)
                        },
                        placeholder = "ABC123",
                        centered = true,
                        textStyle = TextStyle(
                            color = Palette.foreground, fontSize = 24.sp, fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace, letterSpacing = 4.sp,
                        ),
                        keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Characters, autoCorrectEnabled = false, imeAction = ImeAction.Go),
                        keyboardActions = KeyboardActions(onGo = { join() }),
                    )
                    GlassButton(::join, Modifier.fillMaxWidth(), tint = Palette.playerO, prominent = true) {
                        if (working == LobbyAction.JOIN) Spinner()
                        else GlassLabel("Join room", color = if (code.length == 6) Palette.foreground else Palette.muted)
                    }
                }

                errorMessage?.let {
                    Text(it, color = Palette.playerX, fontSize = 13.sp, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
                }
            }
        }
    }
}

@Composable
private fun Card(content: @Composable () -> Unit) {
    Column(
        Modifier.fillMaxWidth().glass(RoundedCornerShape(22.dp)).padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) { content() }
}

@Composable
private fun Spinner() = CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.dp, color = Palette.foreground)

@Composable
private fun ResumeCard(match: MatchRow, cancelling: Boolean, onCancel: () -> Unit, onResume: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().glass(RoundedCornerShape(20.dp), tint = Palette.playerO).padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(
                if (match.status == MatchStatus.WAITING) "Open room ${match.roomCode}" else "Active online match",
                color = Palette.foreground, fontSize = 17.sp, fontWeight = FontWeight.SemiBold,
            )
            Text(
                if (match.status == MatchStatus.WAITING) "Still waiting for an opponent." else "Resume where you left off.",
                color = Palette.muted, fontSize = 12.sp,
            )
        }
        if (match.status == MatchStatus.WAITING) {
            GlassButton(onCancel, minHeight = 44.dp) {
                if (cancelling) Spinner() else GlassLabel("Cancel", color = Palette.playerX)
            }
        }
        GlassButton(onResume, tint = Palette.playerO, prominent = true, minHeight = 44.dp) { GlassLabel("Resume") }
    }
}
