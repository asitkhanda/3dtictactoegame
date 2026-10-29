package com.twistedtac.app.board

import android.provider.Settings
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.layout.findRootCoordinates
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.positionInWindow
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import com.twistedtac.app.game.BoardGameSource
import com.twistedtac.app.theme.Palette

/** The 3D board. Renders [model] with OpenGL; drag orbits, pinch zooms, tap places. */
@Composable
fun BoardView(model: BoardGameSource, viewport: BoardViewport, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    var slice by remember { mutableStateOf(0f to 1f) }

    val reduceMotion = remember {
        Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f
    }
    viewport.reduceMotion = reduceMotion

    AndroidView(
        modifier = modifier.onGloballyPositioned { coordinates ->
            // The GL surface paints its own slice of the screen's background gradient,
            // so it blends in with the Compose background around it.
            val windowHeight = coordinates.findRootCoordinates().size.height.toFloat()
            if (windowHeight > 0f) {
                val top = coordinates.positionInWindow().y
                slice = (top / windowHeight) to ((top + coordinates.size.height) / windowHeight)
            }
        },
        factory = { BoardGlView(it) },
        update = { view ->
            view.listener = object : BoardGlView.Listener {
                override fun onTapCell(index: Int) = model.humanTap(index)
                override fun onOrbit(deltaYaw: Double, deltaPitch: Double) {
                    if (model.config.is3D) viewport.orbit(deltaYaw, deltaPitch)
                }
                override fun onZoom(factor: Double) = viewport.zoomBy(factor)
            }
            view.setInput(
                SceneInput(
                    config = model.config,
                    state = model.state,
                    lastMove = model.lastMove,
                    winningLine = model.winningLine,
                    playable = model.acceptsInput,
                    yaw = viewport.yaw,
                    pitch = viewport.pitch,
                    zoom = viewport.zoom,
                    translucency = viewport.translucency,
                    reduceMotion = reduceMotion,
                    backgroundTop = lerp(Palette.backgroundTop, Palette.backgroundBottom, slice.first).opaqueRgb(),
                    backgroundBottom = lerp(Palette.backgroundTop, Palette.backgroundBottom, slice.second).opaqueRgb(),
                ),
            )
        },
    )
}

private fun Color.opaqueRgb(): Int = toArgb() and 0xFFFFFF
