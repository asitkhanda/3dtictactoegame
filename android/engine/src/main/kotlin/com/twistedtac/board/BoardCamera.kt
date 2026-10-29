package com.twistedtac.board

import com.twistedtac.engine.GameRulesConfig
import kotlin.math.max
import kotlin.math.min
import kotlin.math.tan

/** What the player can see of the board: orbit, zoom and the viewport shape. */
data class CameraPose(val yaw: Double, val pitch: Double, val zoom: Double, val aspect: Float)

/** A ray in board-local space; [direction] is not normalised. */
class LocalRay(val origin: FloatArray, val direction: FloatArray)

/**
 * The scene's fixed camera plus the board's orbit/zoom transform. A port of the
 * pose maths in BoardSceneController.swift, with ray picking for taps.
 */
class BoardCamera(private val config: GameRulesConfig) {
    val layout = BoardLayout(config)

    /** The matrix that carries board-local coordinates into the world. */
    fun modelMatrix(pose: CameraPose): FloatArray {
        // Fit the board's bounding sphere inside the view. The nearest layer is
        // closer to the camera and so drawn larger, so size the sphere for the
        // distance to its near edge: R = k·t·D / (1 + k·t).
        val halfAngle = tan(FOV_Y_RADIANS / 2)
        val t = min(halfAngle, halfAngle * pose.aspect)
        val k = if (config.size == 1) 0.5f else 1f
        val fitRadius = k * t * CAMERA_DISTANCE / (1 + k * t)
        val scale = fitRadius / layout.radius * pose.zoom.toFloat()

        val rotation = if (config.is3D) {
            Mat4.multiply(
                Mat4.rotationX(Math.toRadians(pose.pitch).toFloat()),
                Mat4.rotationY(Math.toRadians(pose.yaw).toFloat()),
            )
        } else {
            Mat4.identity()
        }
        return Mat4.multiply(rotation, Mat4.scale(scale))
    }

    fun viewMatrix(): FloatArray = Mat4.translation(0f, 0f, -CAMERA_DISTANCE)

    fun projectionMatrix(aspect: Float): FloatArray =
        Mat4.perspective(FOV_Y_RADIANS, aspect, NEAR, FAR)

    /**
     * The cell under a touch at ([x], [y]) pixels in a [width]×[height] view, or
     * null. Only cells for which [canTap] is true can be hit, and the nearest wins.
     */
    fun pick(pose: CameraPose, x: Float, y: Float, width: Float, height: Float, canTap: (Int) -> Boolean): Int? {
        val ray = localRay(pose, x, y, width, height) ?: return null
        var best: Int? = null
        var bestDistance = Float.MAX_VALUE
        for (index in 0 until config.cellCount) {
            if (!canTap(index)) continue
            val center = layout.positionForCell(index)
            val distance = intersectBox(ray, center, TILE_HALF_X, TILE_HALF_Y, TILE_HALF_Z) ?: continue
            if (distance < bestDistance) {
                bestDistance = distance
                best = index
            }
        }
        return best
    }

    fun localRay(pose: CameraPose, x: Float, y: Float, width: Float, height: Float): LocalRay? {
        if (width <= 0f || height <= 0f) return null
        val ndcX = 2f * x / width - 1f
        val ndcY = 1f - 2f * y / height
        val viewProjection = Mat4.multiply(projectionMatrix(pose.aspect), viewMatrix())
        val inverse = Mat4.invert(viewProjection) ?: return null
        val near = Mat4.transformPoint(inverse, ndcX, ndcY, -1f)
        val far = Mat4.transformPoint(inverse, ndcX, ndcY, 1f)
        val toLocal = Mat4.invert(modelMatrix(pose)) ?: return null
        val origin = Mat4.transformPoint(toLocal, near[0], near[1], near[2])
        val end = Mat4.transformPoint(toLocal, far[0], far[1], far[2])
        return LocalRay(origin, floatArrayOf(end[0] - origin[0], end[1] - origin[1], end[2] - origin[2]))
    }

    /** Slab test; returns the ray parameter of the entry point. */
    private fun intersectBox(ray: LocalRay, center: FloatArray, hx: Float, hy: Float, hz: Float): Float? {
        val half = floatArrayOf(hx, hy, hz)
        var tMin = 0f
        var tMax = Float.MAX_VALUE
        for (axis in 0 until 3) {
            val origin = ray.origin[axis] - center[axis]
            val direction = ray.direction[axis]
            if (direction == 0f) {
                if (origin < -half[axis] || origin > half[axis]) return null
            } else {
                var t1 = (-half[axis] - origin) / direction
                var t2 = (half[axis] - origin) / direction
                if (t1 > t2) { val swap = t1; t1 = t2; t2 = swap }
                tMin = max(tMin, t1)
                tMax = min(tMax, t2)
                if (tMin > tMax) return null
            }
        }
        return tMin
    }

    companion object {
        const val FOV_Y_RADIANS = (40.0 * Math.PI / 180.0).toFloat()
        const val CAMERA_DISTANCE = 3f
        const val NEAR = 0.05f
        const val FAR = 50f

        // Collision box of a tile, as in the iOS scene: 1 x 1 x 0.5.
        private const val TILE_HALF_X = 0.5f
        private const val TILE_HALF_Y = 0.5f
        private const val TILE_HALF_Z = 0.25f
    }
}
