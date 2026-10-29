package com.twistedtac.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
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
import com.twistedtac.app.game.Cue
import com.twistedtac.app.game.GameFeedback
import com.twistedtac.app.game.LocalMode
import com.twistedtac.app.theme.Palette

@Composable
fun LandingScreen(onPlay: (LocalMode) -> Unit, feedback: GameFeedback = GameFeedback.None) {
    var showRules by remember { mutableStateOf(false) }

    Column(
        Modifier
            .fillMaxSize()
            .background(Palette.background)
            .systemBarsPadding(),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.weight(1f))
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
        Spacer(Modifier.height(28.dp))
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
            GlassButton(onClick = { showRules = true }, modifier = Modifier.fillMaxWidth()) { GlassLabel("How to play") }
        }
        Spacer(Modifier.weight(1.3f))
    }

    if (showRules) RulesSheet(onDismiss = { showRules = false })
}
