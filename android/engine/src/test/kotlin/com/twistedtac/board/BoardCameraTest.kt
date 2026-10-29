package com.twistedtac.board

import com.twistedtac.engine.GameRulesConfig
import com.twistedtac.engine.ViewMode
import kotlin.math.abs
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

private fun config(size: Int, mode: ViewMode) = GameRulesConfig.of(size, mode)!!

private const val W = 400f
private const val H = 800f

/** Projects a board-local point to view pixels, the inverse of what picking does. */
private fun project(camera: BoardCamera, pose: CameraPose, p: FloatArray): Pair<Float, Float> {
    val model = camera.modelMatrix(pose)
    val vp = Mat4.multiply(camera.projectionMatrix(pose.aspect), camera.viewMatrix())
    val clip = Mat4.transformPoint(Mat4.multiply(vp, model), p[0], p[1], p[2])
    return Pair((clip[0] + 1f) / 2f * W, (1f - clip[1]) / 2f * H)
}

class BoardLayoutTest {
    @Test
    fun `3x3x3 cell positions are centred with the nearest layer in front`() {
        val layout = BoardLayout(config(3, ViewMode.CUBE))
        val centre = layout.positionForCell(13) // middle cell of the middle layer
        assertEquals(0f, centre[0], 1e-6f)
        assertEquals(0f, centre[1], 1e-6f)
        assertEquals(0f, centre[2], 1e-6f)
        assertTrue(layout.positionForCell(4)[2] > 0f, "layer 0 is nearest the viewer")
        assertTrue(layout.positionForCell(22)[2] < 0f)
        // Row 0 is at the top.
        assertTrue(layout.positionForCell(1)[1] > layout.positionForCell(7)[1])
    }

    @Test
    fun `flat boards have no depth`() {
        val layout = BoardLayout(config(4, ViewMode.FLAT))
        assertEquals(0f, layout.depth)
        assertEquals(0f, layout.positionForCell(5)[2])
    }

    @Test
    fun `spacing matches the web visual scales for 3x3`() {
        val layout = BoardLayout(config(3, ViewMode.CUBE))
        assertEquals(12f / 80f, layout.gap, 1e-6f)
        assertEquals(160f / 80f, layout.layerSpacing, 1e-6f)
    }
}

class BoardCameraTest {
    @Test
    fun `picks the cell under a tap, front view of a flat board`() {
        val c = config(3, ViewMode.FLAT)
        val camera = BoardCamera(c)
        val pose = CameraPose(0.0, 0.0, 1.0, W / H)
        for (cell in 0 until c.cellCount) {
            val (x, y) = project(camera, pose, camera.layout.positionForCell(cell))
            assertEquals(cell, camera.pick(pose, x, y, W, H) { true }, "cell $cell")
        }
    }

    @Test
    fun `picks through the stack at the home view`() {
        val c = config(3, ViewMode.CUBE)
        val camera = BoardCamera(c)
        val preset = CameraPreset.HOME
        val pose = CameraPose(preset.yaw, preset.pitch, 1.0, W / H)
        // Layer 0 is nearest the viewer, so its tile wins over any behind it.
        for (cell in listOf(0, 4, 8)) {
            val (x, y) = project(camera, pose, camera.layout.positionForCell(cell))
            assertEquals(cell, camera.pick(pose, x, y, W, H) { true }, "cell $cell")
        }
    }

    @Test
    fun `ignores tiles that cannot be tapped`() {
        val c = config(3, ViewMode.FLAT)
        val camera = BoardCamera(c)
        val pose = CameraPose(0.0, 0.0, 1.0, W / H)
        val (x, y) = project(camera, pose, camera.layout.positionForCell(4))
        assertNull(camera.pick(pose, x, y, W, H) { it != 4 }?.takeIf { it == 4 })
        assertNotNull(camera.pick(pose, x, y, W, H) { true })
    }

    @Test
    fun `a tap on empty space picks nothing`() {
        val c = config(3, ViewMode.FLAT)
        val camera = BoardCamera(c)
        val pose = CameraPose(0.0, 0.0, 1.0, W / H)
        assertNull(camera.pick(pose, 2f, 2f, W, H) { true })
    }

    @Test
    fun `the board fits inside the view at every size`() {
        for (size in 1..8) {
            val c = config(size, ViewMode.CUBE)
            val camera = BoardCamera(c)
            val pose = CameraPose(CameraPreset.HOME.yaw, CameraPreset.HOME.pitch, 1.0, W / H)
            val layout = camera.layout
            for (cell in listOf(0, c.cellCount - 1, c.cellsPerLayer - 1, c.cellCount - c.cellsPerLayer)) {
                val (x, y) = project(camera, pose, layout.positionForCell(cell))
                assertTrue(x in 0f..W && y in 0f..H, "size $size cell $cell at ($x, $y)")
            }
        }
    }

    @Test
    fun `matrix inverse round trips`() {
        val m = Mat4.multiply(Mat4.rotationX(0.4f), Mat4.multiply(Mat4.rotationY(1.1f), Mat4.translation(1f, 2f, 3f)))
        val product = Mat4.multiply(m, assertNotNull(Mat4.invert(m)))
        val identity = Mat4.identity()
        for (i in 0 until 16) assertTrue(abs(product[i] - identity[i]) < 1e-5f, "entry $i")
    }
}
