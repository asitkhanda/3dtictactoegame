package com.twistedtac.app.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.twistedtac.app.theme.Palette
import com.twistedtac.engine.Player

/** X / O drawn like the board pieces — marks, not letters. */
@Composable
fun MarkGlyph(player: Player, size: Dp = 14.dp, modifier: Modifier = Modifier) {
    val color = Palette.lightColor(player)
    Canvas(modifier.size(size)) {
        val bar = maxOf(2.dp.toPx(), this.size.minDimension * 0.22f)
        if (player == Player.X) {
            val inset = bar / 2
            drawLine(color, Offset(inset, inset), Offset(this.size.width - inset, this.size.height - inset), bar, StrokeCap.Round)
            drawLine(color, Offset(this.size.width - inset, inset), Offset(inset, this.size.height - inset), bar, StrokeCap.Round)
        } else {
            drawCircle(color, radius = (this.size.minDimension - bar) / 2, style = Stroke(width = bar))
        }
    }
}
