package com.twistedtac.app.board

import android.opengl.GLES30
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.PI
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

/** Interleaved position + normal (6 floats per vertex) and 16-bit indices. */
class MeshData(val vertices: FloatArray, val indices: ShortArray)

object MeshBuilders {
    private class Builder {
        val vertices = ArrayList<Float>()
        val indices = ArrayList<Short>()
        val count get() = vertices.size / 6

        fun vertex(x: Float, y: Float, z: Float, nx: Float, ny: Float, nz: Float): Int {
            vertices.add(x); vertices.add(y); vertices.add(z)
            vertices.add(nx); vertices.add(ny); vertices.add(nz)
            return count - 1
        }

        fun triangle(a: Int, b: Int, c: Int) {
            indices.add(a.toShort()); indices.add(b.toShort()); indices.add(c.toShort())
        }

        fun build() = MeshData(vertices.toFloatArray(), indices.toShortArray())
    }

    /**
     * A box with rounded edges and corners. Each face is a grid whose points are
     * pushed onto the rounded surface, so normals blend smoothly around the edges.
     */
    fun roundedBox(sx: Float, sy: Float, sz: Float, radius: Float): MeshData {
        val half = floatArrayOf(sx / 2, sy / 2, sz / 2)
        val r = minOf(radius, half.min())
        val b = Builder()

        fun axisValues(h: Float): FloatArray {
            val steps = 3
            val edge = FloatArray(steps + 1) { -h + r * it / steps }
            return FloatArray(2 * (steps + 1)) { if (it <= steps) edge[it] else -edge[2 * steps + 1 - it] }
        }

        for (axis in 0 until 3) {
            val u = (axis + 1) % 3
            val v = (axis + 2) % 3
            val us = axisValues(half[u])
            val vs = axisValues(half[v])
            for (sign in intArrayOf(-1, 1)) {
                val base = b.count
                for (uv in us) {
                    for (vv in vs) {
                        val p = FloatArray(3)
                        p[axis] = sign * half[axis]
                        p[u] = uv
                        p[v] = vv
                        val inner = FloatArray(3) { p[it].coerceIn(-(half[it] - r), half[it] - r) }
                        val dx = p[0] - inner[0]; val dy = p[1] - inner[1]; val dz = p[2] - inner[2]
                        val length = sqrt(dx * dx + dy * dy + dz * dz)
                        val nx = dx / length; val ny = dy / length; val nz = dz / length
                        b.vertex(inner[0] + nx * r, inner[1] + ny * r, inner[2] + nz * r, nx, ny, nz)
                    }
                }
                val n = vs.size
                for (i in 0 until us.size - 1) {
                    for (j in 0 until n - 1) {
                        val a = base + i * n + j
                        b.triangle(a, a + n, a + 1)
                        b.triangle(a + 1, a + n, a + n + 1)
                    }
                }
            }
        }
        return b.build()
    }

    /** A flat plate with rounded corners in the XY plane, [depth] thick along Z. */
    fun roundedPlate(width: Float, height: Float, depth: Float, cornerRadius: Float): MeshData {
        val b = Builder()
        val r = minOf(cornerRadius, width / 2, height / 2)
        val arc = 8
        val outline = ArrayList<FloatArray>()
        val corners = arrayOf(
            floatArrayOf(width / 2 - r, height / 2 - r, 0f),
            floatArrayOf(-(width / 2 - r), height / 2 - r, 90f),
            floatArrayOf(-(width / 2 - r), -(height / 2 - r), 180f),
            floatArrayOf(width / 2 - r, -(height / 2 - r), 270f),
        )
        for (corner in corners) {
            for (i in 0..arc) {
                val angle = Math.toRadians((corner[2] + 90.0 * i / arc)).toFloat()
                outline.add(floatArrayOf(corner[0] + r * cos(angle), corner[1] + r * sin(angle), cos(angle), sin(angle)))
            }
        }
        val z = depth / 2
        for (sign in intArrayOf(1, -1)) {
            val center = b.vertex(0f, 0f, sign * z, 0f, 0f, sign.toFloat())
            val ring = outline.map { b.vertex(it[0], it[1], sign * z, 0f, 0f, sign.toFloat()) }
            for (i in ring.indices) b.triangle(center, ring[i], ring[(i + 1) % ring.size])
        }
        for (i in outline.indices) {
            val p = outline[i]
            val q = outline[(i + 1) % outline.size]
            val a = b.vertex(p[0], p[1], z, p[2], p[3], 0f)
            val c = b.vertex(p[0], p[1], -z, p[2], p[3], 0f)
            val d = b.vertex(q[0], q[1], z, q[2], q[3], 0f)
            val e = b.vertex(q[0], q[1], -z, q[2], q[3], 0f)
            b.triangle(a, c, d)
            b.triangle(d, c, e)
        }
        return b.build()
    }

    /** A ring lying in the XY plane, as the O mark. */
    fun torus(major: Float, minor: Float, segments: Int = 40, sides: Int = 16): MeshData {
        val b = Builder()
        for (i in 0..segments) {
            val u = i.toFloat() / segments * 2 * PI.toFloat()
            for (j in 0..sides) {
                val v = j.toFloat() / sides * 2 * PI.toFloat()
                val ring = major + minor * cos(v)
                b.vertex(ring * cos(u), ring * sin(u), minor * sin(v), cos(v) * cos(u), cos(v) * sin(u), sin(v))
            }
        }
        for (i in 0 until segments) {
            for (j in 0 until sides) {
                val a = i * (sides + 1) + j
                val c = a + sides + 1
                b.triangle(a, a + 1, c)
                b.triangle(a + 1, c + 1, c)
            }
        }
        return b.build()
    }
}

/** A [MeshData] uploaded to the GPU. Create and use on the GL thread only. */
class GlMesh(data: MeshData) {
    private val buffers = IntArray(2)
    val indexCount = data.indices.size

    init {
        GLES30.glGenBuffers(2, buffers, 0)
        val vertexBytes = ByteBuffer.allocateDirect(data.vertices.size * 4).order(ByteOrder.nativeOrder())
        vertexBytes.asFloatBuffer().put(data.vertices).position(0)
        GLES30.glBindBuffer(GLES30.GL_ARRAY_BUFFER, buffers[0])
        GLES30.glBufferData(GLES30.GL_ARRAY_BUFFER, data.vertices.size * 4, vertexBytes, GLES30.GL_STATIC_DRAW)

        val indexBytes = ByteBuffer.allocateDirect(data.indices.size * 2).order(ByteOrder.nativeOrder())
        indexBytes.asShortBuffer().put(data.indices).position(0)
        GLES30.glBindBuffer(GLES30.GL_ELEMENT_ARRAY_BUFFER, buffers[1])
        GLES30.glBufferData(GLES30.GL_ELEMENT_ARRAY_BUFFER, data.indices.size * 2, indexBytes, GLES30.GL_STATIC_DRAW)
    }

    fun draw() {
        GLES30.glBindBuffer(GLES30.GL_ARRAY_BUFFER, buffers[0])
        GLES30.glBindBuffer(GLES30.GL_ELEMENT_ARRAY_BUFFER, buffers[1])
        GLES30.glEnableVertexAttribArray(0)
        GLES30.glVertexAttribPointer(0, 3, GLES30.GL_FLOAT, false, 24, 0)
        GLES30.glEnableVertexAttribArray(1)
        GLES30.glVertexAttribPointer(1, 3, GLES30.GL_FLOAT, false, 24, 12)
        GLES30.glDrawElements(GLES30.GL_TRIANGLES, indexCount, GLES30.GL_UNSIGNED_SHORT, 0)
    }

    fun release() {
        GLES30.glDeleteBuffers(2, buffers, 0)
    }
}
