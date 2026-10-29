package com.twistedtac.board

import com.twistedtac.engine.GameRulesConfig
import kotlin.math.sqrt

/**
 * Board geometry in "cell widths" (one cell is 1 unit wide). Proportions
 * come from VISUAL_CELL_SCALES in src/utils/gameConfig.ts so big boards get
 * tighter spacing, as on the web. Port of BoardLayout.swift.
 */
class BoardLayout(config: GameRulesConfig) {
    val size: Int = config.size
    val is3D: Boolean = config.is3D
    val gap: Float
    val layerSpacing: Float

    private class Scale(val cellPx: Float, val layerSpacingPx: Float, val gapPx: Float)

    init {
        val scale = SCALES.getValue(config.size)
        gap = scale.gapPx / scale.cellPx
        layerSpacing = scale.layerSpacingPx / scale.cellPx
    }

    val pitch: Float get() = 1 + gap
    val width: Float get() = size + (size - 1) * gap
    val depth: Float get() = if (is3D) (size - 1) * layerSpacing else 0f

    /** Radius of the sphere that encloses the whole board, for camera fitting. */
    val radius: Float get() = 0.5f * sqrt(width * width * 2 + depth * depth)

    /** Row 0 sits at the top; layer 0 is nearest the viewer. */
    fun position(x: Int, y: Int, layer: Int): FloatArray {
        val center = (size - 1) / 2f
        return floatArrayOf(
            (x - center) * pitch,
            (center - y) * pitch,
            if (is3D) (center - layer) * layerSpacing else 0f,
        )
    }

    fun positionForCell(index: Int): FloatArray {
        val perLayer = size * size
        val layer = if (is3D) index / perLayer else 0
        val within = index % perLayer
        return position(within % size, within / size, layer)
    }

    private companion object {
        val SCALES = mapOf(
            1 to Scale(120f, 80f, 0f),
            2 to Scale(80f, 100f, 8f),
            3 to Scale(80f, 160f, 12f),
            4 to Scale(68f, 112f, 10f),
            5 to Scale(54f, 100f, 8f),
            6 to Scale(44f, 88f, 6f),
            7 to Scale(38f, 76f, 5f),
            8 to Scale(34f, 64f, 4f),
        )
    }
}
