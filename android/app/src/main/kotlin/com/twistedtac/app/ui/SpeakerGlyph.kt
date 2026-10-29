package com.twistedtac.app.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/** A speaker, with sound waves or a slash when muted. */
@Composable
fun SpeakerGlyph(muted: Boolean, color: Color, size: Dp = 22.dp) {
    Canvas(Modifier.size(size)) {
        val w = this.size.width
        val h = this.size.height
        val stroke = 1.8.dp.toPx()
        val body = Path().apply {
            moveTo(w * 0.10f, h * 0.38f)
            lineTo(w * 0.30f, h * 0.38f)
            lineTo(w * 0.52f, h * 0.18f)
            lineTo(w * 0.52f, h * 0.82f)
            lineTo(w * 0.30f, h * 0.62f)
            lineTo(w * 0.10f, h * 0.62f)
            close()
        }
        drawPath(body, color)
        if (muted) {
            drawLine(color, Offset(w * 0.66f, h * 0.36f), Offset(w * 0.92f, h * 0.64f), stroke, StrokeCap.Round)
            drawLine(color, Offset(w * 0.92f, h * 0.36f), Offset(w * 0.66f, h * 0.64f), stroke, StrokeCap.Round)
        } else {
            for ((i, radius) in listOf(0.14f, 0.28f).withIndex()) {
                val path = Path().apply {
                    arcTo(
                        androidx.compose.ui.geometry.Rect(
                            Offset(w * 0.52f - w * radius, h * 0.5f - w * radius),
                            Offset(w * 0.52f + w * radius, h * 0.5f + w * radius),
                        ),
                        startAngleDegrees = -50f, sweepAngleDegrees = 100f, forceMoveTo = true,
                    )
                }
                drawPath(path, color.copy(alpha = 1f - i * 0.25f), style = Stroke(stroke, cap = StrokeCap.Round))
            }
        }
    }
}
