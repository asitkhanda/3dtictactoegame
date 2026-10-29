package com.twistedtac.app.board

import android.opengl.GLES30
import android.opengl.GLSurfaceView
import com.twistedtac.board.BoardCamera
import com.twistedtac.board.CameraPose
import com.twistedtac.board.Mat4
import com.twistedtac.engine.GameRulesConfig
import com.twistedtac.engine.GameState
import com.twistedtac.engine.Player
import javax.microedition.khronos.egl.EGLConfig
import javax.microedition.khronos.opengles.GL10
import kotlin.math.pow

/** Everything the scene shows, handed from the UI thread to the GL thread. */
class SceneInput(
    val config: GameRulesConfig,
    val state: GameState,
    val lastMove: Int?,
    val winningLine: List<Int>?,
    val playable: Boolean,
    val yaw: Double,
    val pitch: Double,
    val zoom: Double,
    val translucency: Double,
    val reduceMotion: Boolean,
    /** Background gradient slice behind this view, as 0xRRGGBB. */
    val backgroundTop: Int,
    val backgroundBottom: Int,
)

/**
 * Draws the board with OpenGL ES 3: translucent glass layers and tiles, glowing
 * X and O pieces. The scene mirrors BoardSceneController.swift on iOS.
 */
class BoardRenderer(private val requestFrame: () -> Unit) : GLSurfaceView.Renderer {
    @Volatile var input: SceneInput? = null

    private class Item(
        val mesh: GlMesh,
        val model: FloatArray,
        val r: Float, val g: Float, val b: Float, val a: Float,
        val lit: Boolean,
        val emissive: Float = 0f,
    ) {
        val depth get() = model[14]
    }

    private var width = 1
    private var height = 1

    private var sceneProgram: GlProgram? = null
    private var backgroundProgram: GlProgram? = null
    private var tileMesh: GlMesh? = null
    private var xBarMesh: GlMesh? = null
    private var oMesh: GlMesh? = null

    // Per-board resources.
    private var builtConfig: GameRulesConfig? = null
    private var camera: BoardCamera? = null
    private var backingMesh: GlMesh? = null
    private var frameMeshes: List<Pair<GlMesh, FloatArray>> = emptyList()
    private var lastMarks: Array<Player?> = emptyArray()
    private var pieceStartNs: LongArray = LongArray(0)

    override fun onSurfaceCreated(gl: GL10?, eglConfig: EGLConfig?) {
        sceneProgram = GlProgram.scene()
        backgroundProgram = GlProgram.background()
        tileMesh = GlMesh(MeshBuilders.roundedPlate(1f, 1f, 0.06f, 0.12f))
        xBarMesh = GlMesh(MeshBuilders.roundedBox(0.66f, 0.15f, 0.15f, 0.06f))
        oMesh = GlMesh(MeshBuilders.torus(0.25f, 0.08f))
        builtConfig = null // GPU resources from a lost context are gone; rebuild the board.
        GLES30.glDisable(GLES30.GL_CULL_FACE)
        GLES30.glBlendFunc(GLES30.GL_SRC_ALPHA, GLES30.GL_ONE_MINUS_SRC_ALPHA)
    }

    override fun onSurfaceChanged(gl: GL10?, w: Int, h: Int) {
        width = maxOf(1, w)
        height = maxOf(1, h)
        GLES30.glViewport(0, 0, width, height)
    }

    override fun onDrawFrame(gl: GL10?) {
        val scene = input
        GLES30.glViewport(0, 0, width, height)
        drawBackground(scene)
        if (scene == null) return
        ensureBoard(scene.config)
        val camera = camera ?: return
        val program = sceneProgram ?: return

        val aspect = width.toFloat() / height
        val pose = CameraPose(scene.yaw, scene.pitch, scene.zoom, aspect)
        val pivot = camera.modelMatrix(pose)
        val viewProjection = Mat4.multiply(camera.projectionMatrix(aspect), camera.viewMatrix())

        val opaque = ArrayList<Item>()
        val transparent = ArrayList<Item>()
        val animating = collectPieces(scene, camera, pivot, opaque, transparent)
        collectBoard(scene, camera, pivot, transparent)

        program.use()
        GLES30.glUniform3f(program.uniform("uCamPos"), 0f, 0f, BoardCamera.CAMERA_DISTANCE)

        GLES30.glClear(GLES30.GL_DEPTH_BUFFER_BIT)
        GLES30.glEnable(GLES30.GL_DEPTH_TEST)
        GLES30.glDepthMask(true)
        GLES30.glDisable(GLES30.GL_BLEND)
        opaque.forEach { draw(program, it, viewProjection) }

        // Glass is drawn farthest first, without writing depth, so layers blend in order.
        transparent.sortBy { it.depth }
        GLES30.glEnable(GLES30.GL_BLEND)
        GLES30.glDepthMask(false)
        transparent.forEach { draw(program, it, viewProjection) }
        GLES30.glDepthMask(true)

        if (animating) requestFrame()
    }

    private fun drawBackground(scene: SceneInput?) {
        val program = backgroundProgram ?: return
        val top = scene?.backgroundTop ?: 0x0E131C
        val bottom = scene?.backgroundBottom ?: 0x05070B
        GLES30.glDisable(GLES30.GL_DEPTH_TEST)
        GLES30.glDisable(GLES30.GL_BLEND)
        program.use()
        GLES30.glUniform3f(program.uniform("uTop"), channel(top, 16), channel(top, 8), channel(top, 0))
        GLES30.glUniform3f(program.uniform("uBottom"), channel(bottom, 16), channel(bottom, 8), channel(bottom, 0))
        GLES30.glDrawArrays(GLES30.GL_TRIANGLES, 0, 3)
    }

    private fun channel(rgb: Int, shift: Int) = ((rgb shr shift) and 0xFF) / 255f

    private fun draw(program: GlProgram, item: Item, viewProjection: FloatArray) {
        val mvp = Mat4.multiply(viewProjection, item.model)
        GLES30.glUniformMatrix4fv(program.uniform("uMvp"), 1, false, mvp, 0)
        GLES30.glUniformMatrix4fv(program.uniform("uModel"), 1, false, item.model, 0)
        GLES30.glUniform4f(program.uniform("uColor"), item.r, item.g, item.b, item.a)
        GLES30.glUniform1f(program.uniform("uLit"), if (item.lit) 1f else 0f)
        GLES30.glUniform3f(program.uniform("uEmissive"), item.r * item.emissive, item.g * item.emissive, item.b * item.emissive)
        item.mesh.draw()
    }

    // MARK: Board

    private fun ensureBoard(config: GameRulesConfig) {
        if (builtConfig == config) return
        builtConfig = config
        val camera = BoardCamera(config)
        this.camera = camera
        val layout = camera.layout

        backingMesh?.release()
        val margin = 0.3f
        backingMesh = GlMesh(MeshBuilders.roundedPlate(layout.width + margin * 2, layout.width + margin * 2, 0.02f, 0.2f))

        frameMeshes.forEach { it.first.release() }
        val half = layout.width / 2 + 0.3f
        val thickness = 0.05f
        val length = half * 2 + thickness
        val horizontal = GlMesh(MeshBuilders.roundedBox(length, thickness, thickness, thickness / 2))
        val vertical = GlMesh(MeshBuilders.roundedBox(thickness, length, thickness, thickness / 2))
        frameMeshes = listOf(
            horizontal to floatArrayOf(0f, half),
            horizontal to floatArrayOf(0f, -half),
            vertical to floatArrayOf(-half, 0f),
            vertical to floatArrayOf(half, 0f),
        )

        lastMarks = arrayOfNulls(config.cellCount)
        pieceStartNs = LongArray(config.cellCount)
    }

    private fun collectBoard(scene: SceneInput, camera: BoardCamera, pivot: FloatArray, out: MutableList<Item>) {
        val config = scene.config
        val layout = camera.layout
        val tile = tileMesh ?: return
        val backing = backingMesh ?: return
        val t = scene.translucency.coerceIn(0.0, 1.0).toFloat()

        for (layer in 0 until config.layerCount) {
            val owner = scene.state.layerWinners[layer].winner
            val z = layout.position(0, 0, layer)[2]
            val tint = owner?.let { color(it) } ?: WHITE

            val backingAlpha = (if (owner == null) 0.03f else 0.10f) + 0.14f * t
            out.add(Item(backing, at(pivot, 0f, 0f, z - 0.05f), tint[0], tint[1], tint[2], glass(backingAlpha), lit = false))

            val frameColor = if (owner == null) floatArrayOf(1f, 1f, 1f, 0.7f) else floatArrayOf(tint[0], tint[1], tint[2], 1f)
            for ((mesh, offset) in frameMeshes) {
                out.add(Item(mesh, at(pivot, offset[0], offset[1], z), frameColor[0], frameColor[1], frameColor[2], frameColor[3], lit = false))
            }

            val tileAlpha = (if (owner == null) 0.07f else 0.05f) + 0.26f * t
            for (local in 0 until config.cellsPerLayer) {
                val index = layer * config.cellsPerLayer + local
                val p = layout.positionForCell(index)
                out.add(Item(tile, at(pivot, p[0], p[1], p[2]), tint[0], tint[1], tint[2], glass(tileAlpha), lit = false))
            }
        }
    }

    /** Returns true while any piece is still animating in. */
    private fun collectPieces(
        scene: SceneInput,
        camera: BoardCamera,
        pivot: FloatArray,
        opaque: MutableList<Item>,
        transparent: MutableList<Item>,
    ): Boolean {
        val xBar = xBarMesh ?: return false
        val o = oMesh ?: return false
        val layout = camera.layout
        val now = System.nanoTime()
        val winning = scene.winningLine?.toSet() ?: emptySet()
        var animating = false

        for (index in 0 until scene.config.cellCount) {
            val mark = scene.state.board[index]
            if (mark != lastMarks[index]) {
                lastMarks[index] = mark
                pieceStartNs[index] = if (mark != null && !scene.reduceMotion) now else 0L
            }
            if (mark == null) continue

            var scale = 1f
            if (pieceStartNs[index] != 0L) {
                val t = (now - pieceStartNs[index]) / 1_000_000.0 / PIECE_ANIMATION_MS
                if (t >= 1.0) {
                    pieceStartNs[index] = 0L
                } else {
                    scale = (0.01 + 0.99 * (1 - (1 - t).pow(3))).toFloat()
                    animating = true
                }
            }

            val emphasized = index == scene.lastMove || index in winning
            val dimmed = winning.isNotEmpty() && index !in winning
            val base = color(mark)
            val bright = brightColor(mark)
            val c = if (emphasized) bright else base
            val emissive = if (emphasized) 0.7f else 0.28f
            val alpha = if (dimmed) 0.35f else 1f
            val target = if (alpha < 1f) transparent else opaque

            val p = layout.positionForCell(index)
            val placed = Mat4.multiply(pivot, Mat4.multiply(Mat4.translation(p[0], p[1], p[2] + 0.06f), Mat4.scale(scale)))
            when (mark) {
                Player.X -> for (angle in floatArrayOf(QUARTER_PI, -QUARTER_PI)) {
                    target.add(Item(xBar, Mat4.multiply(placed, Mat4.rotationZ(angle)), c[0], c[1], c[2], alpha, lit = true, emissive = emissive))
                }
                Player.O -> target.add(Item(o, placed, c[0], c[1], c[2], alpha, lit = true, emissive = emissive))
            }
        }
        return animating
    }

    /** Matches how dark the same alpha reads in the RealityKit scene on iOS. */
    private fun glass(alpha: Float) = alpha.pow(1.35f)

    private fun at(pivot: FloatArray, x: Float, y: Float, z: Float) =
        Mat4.multiply(pivot, Mat4.translation(x, y, z))

    private fun color(player: Player) =
        if (player == Player.X) floatArrayOf(1f, 0.275f, 0.333f) else floatArrayOf(0.231f, 0.910f, 0.878f)

    private fun brightColor(player: Player) =
        if (player == Player.X) floatArrayOf(1f, 0.529f, 0.569f) else floatArrayOf(0.561f, 0.953f, 0.933f)

    private companion object {
        val WHITE = floatArrayOf(1f, 1f, 1f)
        const val PIECE_ANIMATION_MS = 200.0
        const val QUARTER_PI = (Math.PI / 4).toFloat()
    }
}
