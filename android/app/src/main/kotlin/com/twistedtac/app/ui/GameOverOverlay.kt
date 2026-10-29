package com.twistedtac.app.ui

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.paneTitle
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.twistedtac.app.theme.Palette

/** End-of-game card. Callers supply the words and colour so local and online games can share it. */
@Composable
fun GameOverOverlay(
    title: String,
    subtitle: String,
    accent: Color,
    primaryLabel: String,
    onPrimary: () -> Unit,
    onViewBoard: () -> Unit,
    onMenu: () -> Unit,
    modifier: Modifier = Modifier,
    /** Ranked points earned (or lost) — online games only. */
    points: Int? = null,
) {
    var shown by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { shown = true }
    val progress by animateFloatAsState(
        if (shown) 1f else 0f,
        spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMediumLow),
        label = "overlay",
    )

    Box(
        modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.55f))
            // Swallow taps so the board underneath isn't played through the scrim.
            .clickable(interactionSource = remember { MutableInteractionSource() }, indication = null) {}
            .semantics { paneTitle = title },
        contentAlignment = Alignment.Center,
    ) {
        Column(
            Modifier
                .padding(24.dp)
                .widthIn(max = 360.dp)
                .alpha(progress.coerceIn(0f, 1f))
                .scale(0.8f + 0.2f * progress)
                .glass(RoundedCornerShape(28.dp), strength = 0.9f)
                .background(Palette.backgroundBottom.copy(alpha = 0.95f))
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            Text(
                title,
                color = accent,
                fontSize = 40.sp,
                fontWeight = FontWeight.Black,
                maxLines = 1,
                textAlign = TextAlign.Center,
            )
            Text(subtitle, color = Palette.muted, fontSize = 16.sp, textAlign = TextAlign.Center)
            if (points != null) {
                Text(
                    when {
                        points > 0 -> "+$points rank points"
                        points < 0 -> "$points rank points"
                        else -> "No rank points"
                    },
                    color = Palette.foreground,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier
                        .glass(RoundedCornerShape(50), tint = accent, strength = 2f)
                        .padding(horizontal = 14.dp, vertical = 6.dp),
                )
            }
            Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                GlassButton(onPrimary, Modifier.fillMaxWidth(), tint = accent, prominent = true) { GlassLabel(primaryLabel) }
                GlassButton(onViewBoard, Modifier.fillMaxWidth()) { GlassLabel("View board") }
                GlassButton(onMenu, Modifier.fillMaxWidth()) { GlassLabel("Menu") }
            }
        }
    }
}
