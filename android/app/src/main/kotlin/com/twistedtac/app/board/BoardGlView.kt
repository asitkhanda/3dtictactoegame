package com.twistedtac.app.board

import android.content.Context
import android.opengl.GLSurfaceView
import android.view.GestureDetector
import android.view.MotionEvent
import android.view.ScaleGestureDetector
import com.twistedtac.board.BoardCamera
import com.twistedtac.board.CameraPose
import javax.microedition.khronos.egl.EGL10
import javax.microedition.khronos.egl.EGLConfig
import javax.microedition.khronos.egl.EGLDisplay

/** The 3D board surface: renders [SceneInput] and turns touches into taps, orbits and zooms. */
class BoardGlView(context: Context) : GLSurfaceView(context) {
    interface Listener {
        fun onTapCell(index: Int)
        fun onOrbit(deltaYaw: Double, deltaPitch: Double)
        fun onZoom(factor: Double)
    }

    var listener: Listener? = null

    private val renderer = BoardRenderer { requestRender() }
    private var input: SceneInput? = null
    private var camera: BoardCamera? = null
    private var multiTouch = false

    private val density = resources.displayMetrics.density

    private val scaleDetector = ScaleGestureDetector(context, object : ScaleGestureDetector.SimpleOnScaleGestureListener() {
        override fun onScale(detector: ScaleGestureDetector): Boolean {
            listener?.onZoom(detector.scaleFactor.toDouble())
            return true
        }
    })

    private val gestureDetector = GestureDetector(context, object : GestureDetector.SimpleOnGestureListener() {
        override fun onDown(e: MotionEvent) = true

        override fun onSingleTapUp(e: MotionEvent): Boolean {
            pick(e.x, e.y)?.let { listener?.onTapCell(it) }
            return true
        }

        override fun onScroll(e1: MotionEvent?, e2: MotionEvent, distanceX: Float, distanceY: Float): Boolean {
            // 0.4 degrees per dp of drag, as on iOS.
            val perPixel = ORBIT_DEGREES_PER_DP / density
            listener?.onOrbit((-distanceX * perPixel).toDouble(), (-distanceY * perPixel).toDouble())
            return true
        }
    })

    init {
        setEGLContextClientVersion(3)
        setEGLConfigChooser(MsaaConfigChooser())
        setRenderer(renderer)
        renderMode = RENDERMODE_WHEN_DIRTY
    }

    fun setInput(scene: SceneInput) {
        if (camera == null || input?.config != scene.config) camera = BoardCamera(scene.config)
        input = scene
        renderer.input = scene
        requestRender()
    }

    private fun pick(x: Float, y: Float): Int? {
        val scene = input ?: return null
        val camera = camera ?: return null
        if (!scene.playable || width == 0 || height == 0) return null
        val pose = CameraPose(scene.yaw, scene.pitch, scene.zoom, width.toFloat() / height)
        return camera.pick(pose, x, y, width.toFloat(), height.toFloat()) { index ->
            scene.state.board[index] == null &&
                scene.state.layerWinners[scene.config.layerOf(index)].winner == null
        }
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        if (event.actionMasked == MotionEvent.ACTION_DOWN) multiTouch = false
        scaleDetector.onTouchEvent(event)
        if (event.pointerCount > 1 || scaleDetector.isInProgress) {
            if (!multiTouch) {
                multiTouch = true
                val cancel = MotionEvent.obtain(event).apply { action = MotionEvent.ACTION_CANCEL }
                gestureDetector.onTouchEvent(cancel)
                cancel.recycle()
            }
            return true
        }
        if (multiTouch) return true // ignore the lone finger left after a pinch
        if (event.actionMasked == MotionEvent.ACTION_UP) performClick()
        return gestureDetector.onTouchEvent(event)
    }

    override fun performClick(): Boolean = super.performClick()

    private companion object {
        const val ORBIT_DEGREES_PER_DP = 0.4f
    }
}

/** Asks for 4x multisampling so edges are smooth, falling back to none. */
private class MsaaConfigChooser : GLSurfaceView.EGLConfigChooser {
    override fun chooseConfig(egl: EGL10, display: EGLDisplay): EGLConfig {
        for (samples in intArrayOf(4, 0)) {
            val attributes = ArrayList<Int>().apply {
                addAll(listOf(EGL10.EGL_RENDERABLE_TYPE, EGL_OPENGL_ES3_BIT))
                addAll(listOf(EGL10.EGL_RED_SIZE, 8, EGL10.EGL_GREEN_SIZE, 8, EGL10.EGL_BLUE_SIZE, 8, EGL10.EGL_ALPHA_SIZE, 8))
                addAll(listOf(EGL10.EGL_DEPTH_SIZE, 16))
                if (samples > 0) addAll(listOf(EGL10.EGL_SAMPLE_BUFFERS, 1, EGL10.EGL_SAMPLES, samples))
                add(EGL10.EGL_NONE)
            }.toIntArray()
            val count = IntArray(1)
            egl.eglChooseConfig(display, attributes, null, 0, count)
            if (count[0] > 0) {
                val configs = arrayOfNulls<EGLConfig>(1)
                egl.eglChooseConfig(display, attributes, configs, 1, count)
                configs[0]?.let { return it }
            }
        }
        error("No OpenGL ES 3 configuration available")
    }

    private companion object {
        const val EGL_OPENGL_ES3_BIT = 0x40
    }
}
