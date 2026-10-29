package com.twistedtac.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.background
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Icon
import com.twistedtac.app.auth.AuthManager
import com.twistedtac.app.game.Cue
import com.twistedtac.app.game.GameFeedback
import com.twistedtac.app.game.LocalMode
import com.twistedtac.app.theme.Palette

@Composable
fun LandingScreen(
    auth: AuthManager,
    onPlay: (LocalMode) -> Unit,
    onOnline: () -> Unit,
    onLeaderboard: () -> Unit,
    onProfile: () -> Unit,
    onSignIn: () -> Unit,
    feedback: GameFeedback = GameFeedback.None,
) {
    var showRules by remember { mutableStateOf(false) }
    val signedIn = auth.phase == AuthManager.Phase.READY

    val title: @Composable () -> Unit = {
        Column(
            Modifier.padding(horizontal = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Text(
                "TWISTED TAC",
                color = Palette.foreground,
                fontSize = 44.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = 2.sp,
                maxLines = 1,
            )
            Text(
                "Stack layers. Strike through depth. Win the cube.",
                color = Palette.muted,
                fontSize = 16.sp,
                textAlign = TextAlign.Center,
            )
        }
    }
    val menu: @Composable () -> Unit = {
        Column(
            Modifier
                .widthIn(max = 420.dp)
                .fillMaxWidth()
                .padding(horizontal = 28.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            GlassButton(
                onClick = { feedback.play(Cue.TAP); onPlay(LocalMode.VS_AI) },
                modifier = Modifier.fillMaxWidth(),
                tint = Palette.playerX,
                prominent = true,
            ) { GlassLabel("Play vs AI") }
            GlassButton(
                onClick = { feedback.play(Cue.TAP); onPlay(LocalMode.TWO_PLAYER) },
                modifier = Modifier.fillMaxWidth(),
                tint = Palette.playerO,
                prominent = true,
            ) { GlassLabel("2 Player") }
            if (auth.isConfigured) {
                GlassButton(
                    onClick = { feedback.play(Cue.TAP); if (signedIn) onOnline() else onSignIn() },
                    modifier = Modifier.fillMaxWidth(),
                    tint = Palette.playerO,
                    prominent = true,
                ) { GlassLabel(if (signedIn) "Play online" else "Sign in to play online") }
                GlassButton(onClick = onLeaderboard, modifier = Modifier.fillMaxWidth()) { GlassLabel("Leaderboard") }
            }
            GlassButton(onClick = { showRules = true }, modifier = Modifier.fillMaxWidth()) { GlassLabel("How to play") }
        }
    }

    BoxWithConstraints(
        Modifier
            .fillMaxSize()
            .background(Palette.background)
            .systemBarsPadding(),
    ) {
        if (auth.isConfigured) {
            Box(Modifier.align(Alignment.TopEnd).padding(top = 8.dp, end = 16.dp)) {
                GlassButton(
                    onClick = { if (signedIn) onProfile() else onSignIn() },
                    shape = androidx.compose.foundation.shape.RoundedCornerShape(50),
                    minHeight = 44.dp,
                    description = if (signedIn) "Profile" else "Sign in",
                    modifier = Modifier.size(44.dp),
                ) {
                    val profile = auth.profile
                    if (signedIn && profile != null) AvatarView(profile.avatarUrl, profile.username ?: "?", 34.dp)
                    else Icon(Icons.Filled.Person, null, tint = Palette.foreground)
                }
            }
        }
        if (maxWidth > maxHeight) {
            // Landscape: title on one side, menu on the other, so nothing needs scrolling.
            Row(Modifier.fillMaxSize(), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.weight(1f), contentAlignment = Alignment.Center) { title() }
                Box(Modifier.weight(1f), contentAlignment = Alignment.Center) { menu() }
            }
        } else {
            Column(Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally) {
                Spacer(Modifier.weight(1f))
                title()
                Spacer(Modifier.height(28.dp))
                menu()
                Spacer(Modifier.weight(1.3f))
                if (auth.isConfigured) {
                    Text("Local games are casual. Ranked play is online only.", color = Palette.muted, fontSize = 13.sp, modifier = Modifier.padding(bottom = 12.dp))
                }
            }
        }
    }

    if (showRules) RulesSheet(onDismiss = { showRules = false })
}
