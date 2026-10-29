package com.twistedtac.app.board

import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableDoubleStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import com.twistedtac.board.CameraPreset
import kotlin.math.pow
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

/** Camera state for the board: orbit (yaw/pitch), zoom and layer glass. */
@Stable
class BoardViewport(private val scope: CoroutineScope) {
    var yaw by mutableDoubleStateOf(CameraPreset.HOME.yaw)
        private set
    var pitch by mutableDoubleStateOf(CameraPreset.HOME.pitch)
        private set
    var zoom by mutableDoubleStateOf(1.0)
        private set

    /** 0..1 — higher shows the layers more solidly. */
    var translucency by mutableDoubleStateOf(0.5)

    /** Set from the system animation scale; presets then jump instead of easing. */
    var reduceMotion = false
    var activePreset by mutableStateOf<CameraPreset?>(CameraPreset.HOME)
        private set

    private var animation: Job? = null

    fun orbit(deltaYaw: Double, deltaPitch: Double) {
        animation?.cancel()
        activePreset = null
        yaw += deltaYaw
        pitch = (pitch + deltaPitch).coerceIn(-90.0, 90.0)
    }

    fun zoomBy(factor: Double) {
        zoom = (zoom * factor).coerceIn(MIN_ZOOM, MAX_ZOOM)
    }

    /** Eases to a preset over 300 ms (PRESET_TRANSITION_MS on the web). */
    fun go(preset: CameraPreset) {
        animation?.cancel()
        activePreset = preset
        if (reduceMotion) {
            yaw = preset.yaw; pitch = preset.pitch; zoom = 1.0
            return
        }
        val startYaw = yaw
        val startPitch = pitch
        val startZoom = zoom
        // Take the short way around the yaw circle.
        var deltaYaw = (preset.yaw - startYaw) % 360
        if (deltaYaw > 180) deltaYaw -= 360
        if (deltaYaw < -180) deltaYaw += 360

        animation = scope.launch {
            var startNanos = -1L
            while (true) {
                val now = withFrameNanos { it }
                if (startNanos < 0) startNanos = now
                val t = ((now - startNanos) / 1_000_000.0 / DURATION_MS).coerceIn(0.0, 1.0)
                val eased = 1 - (1 - t).pow(3)
                yaw = startYaw + deltaYaw * eased
                pitch = startPitch + (preset.pitch - startPitch) * eased
                zoom = startZoom + (1 - startZoom) * eased
                if (t >= 1.0) break
            }
        }
    }

    fun reset() = go(CameraPreset.HOME)

    private companion object {
        const val MIN_ZOOM = 0.5
        const val MAX_ZOOM = 3.0
        const val DURATION_MS = 300.0
    }
}
