package com.twistedtac.app.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.twistedtac.app.board.BoardViewport
import com.twistedtac.app.game.Cue
import com.twistedtac.app.game.GameFeedback
import com.twistedtac.app.theme.Palette
import com.twistedtac.board.CameraPreset

/** Preset chips, the layer-glass slider and zoom buttons. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CameraControls(viewport: BoardViewport, is3D: Boolean, feedback: GameFeedback, modifier: Modifier = Modifier) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(10.dp)) {
        if (is3D) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                CameraPreset.entries.forEach { preset ->
                    val selected = viewport.activePreset == preset
                    GlassButton(
                        onClick = { feedback.play(Cue.TAP); viewport.go(preset) },
                        modifier = Modifier.weight(1f),
                        tint = if (selected) Palette.playerO else Color.White,
                        prominent = selected,
                        shape = RoundedCornerShape(12.dp),
                        minHeight = 44.dp,
                        description = preset.label,
                    ) {
                        Text(preset.shortLabel, color = Palette.foreground, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
        Row(
            Modifier
                .fillMaxWidth()
                .glass(RoundedCornerShape(50))
                .padding(horizontal = 16.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            if (is3D) {
                LayersGlyph()
                Slider(
                    value = viewport.translucency.toFloat(),
                    onValueChange = { viewport.translucency = it.toDouble() },
                    modifier = Modifier.weight(1f).semantics { contentDescription = "Layer opacity" },
                    thumb = {
                        Box(Modifier.size(width = 36.dp, height = 24.dp).background(Color.White, RoundedCornerShape(50)))
                    },
                    track = { state ->
                        SliderDefaults.Track(
                            sliderState = state,
                            modifier = Modifier.height(4.dp),
                            colors = SliderDefaults.colors(
                                activeTrackColor = Palette.playerO,
                                inactiveTrackColor = Color.White.copy(alpha = 0.2f),
                            ),
                            thumbTrackGapSize = 0.dp,
                            trackInsideCornerSize = 0.dp,
                            drawStopIndicator = null,
                        )
                    },
                )
            } else {
                Row(Modifier.weight(1f)) {}
            }
            ZoomButton("−", "Zoom out") { viewport.zoomBy(1 / 1.25) }
            ZoomButton("+", "Zoom in") { viewport.zoomBy(1.25) }
        }
    }
}

@Composable
private fun ZoomButton(symbol: String, description: String, onClick: () -> Unit) {
    GlassButton(
        onClick = onClick,
        shape = RoundedCornerShape(50),
        minHeight = 44.dp,
        description = description,
        modifier = Modifier.size(44.dp),
    ) {
        Text(symbol, color = Palette.foreground, fontSize = 22.sp, fontWeight = FontWeight.Medium)
    }
}

/** Three stacked layers, standing in for SF Symbols' square.3.layers.3d. */
@Composable
private fun LayersGlyph() {
    Canvas(Modifier.size(22.dp)) {
        val stroke = Stroke(width = 1.6.dp.toPx())
        val w = size.width * 0.8f
        val h = size.height * 0.26f
        for (i in 0 until 3) {
            drawRoundRect(
                color = Palette.muted,
                topLeft = Offset(size.width * 0.1f, size.height * (0.08f + 0.28f * i)),
                size = Size(w, h),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(3.dp.toPx()),
                style = stroke,
            )
        }
    }
}
