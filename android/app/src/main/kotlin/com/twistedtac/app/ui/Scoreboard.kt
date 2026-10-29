package com.twistedtac.app.ui

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.twistedtac.app.theme.Palette
import com.twistedtac.engine.Player

/** X vs O plate showing whose turn it is and, on 3D boards, layers claimed. */
@Composable
fun Scoreboard(
    xLabel: String,
    oLabel: String,
    xScore: Int,
    oScore: Int,
    /** Layers needed to win; 0 hides the pips. */
    threshold: Int,
    xActive: Boolean,
    oActive: Boolean,
    thinkingSide: Player?,
    modifier: Modifier = Modifier,
) {
    val description = "$xLabel $xScore, $oLabel $oScore" + if (threshold > 0) ", $threshold layers to win" else ""
    Row(
        modifier = modifier.clearAndSetSemantics { contentDescription = description },
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Plate(Player.X, xLabel, xScore, threshold, xActive, thinkingSide == Player.X)
        Text("VS", color = Palette.muted, fontSize = 12.sp, fontWeight = FontWeight.ExtraBold)
        Plate(Player.O, oLabel, oScore, threshold, oActive, thinkingSide == Player.O)
    }
}

@Composable
private fun RowScope.Plate(player: Player, label: String, score: Int, threshold: Int, active: Boolean, thinking: Boolean) {
    val color = Palette.color(player)
    val scale by animateFloatAsState(if (active) 1.03f else 1f, spring(), label = "plate")
    Column(
        modifier = Modifier
            .weight(1f)
            .scale(scale)
            .glass(RoundedCornerShape(18.dp), tint = color, strength = if (active) 3.2f else 0.9f)
            .padding(vertical = 10.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            MarkGlyph(player, 14.dp)
            Text(label, color = Palette.foreground, fontSize = 12.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            if (thinking) ThinkingDots(color)
        }
        Text(score.toString(), color = Palette.foreground, fontSize = 34.sp, fontWeight = FontWeight.Black)
        if (threshold > 0) {
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                repeat(threshold) { i ->
                    Box(
                        Modifier
                            .size(7.dp)
                            .background(if (i < score) color else androidx.compose.ui.graphics.Color.Transparent, CircleShape)
                            .border(1.5.dp, color, CircleShape),
                    )
                }
            }
        }
    }
}

@Composable
private fun ThinkingDots(color: androidx.compose.ui.graphics.Color) {
    val transition = rememberInfiniteTransition(label = "thinking")
    Row(horizontalArrangement = Arrangement.spacedBy(3.dp)) {
        repeat(3) { i ->
            val alpha by transition.animateFloat(
                initialValue = 0.25f,
                targetValue = 1f,
                animationSpec = infiniteRepeatable(tween(600, delayMillis = i * 180), RepeatMode.Reverse),
                label = "dot$i",
            )
            Box(Modifier.size(4.dp).alpha(alpha).background(color, CircleShape))
        }
    }
}
