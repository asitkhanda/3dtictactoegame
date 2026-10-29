package com.twistedtac.app.board

import android.opengl.GLES30
import android.util.Log

private const val TAG = "BoardShaders"

private const val SCENE_VERTEX = """#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
uniform mat4 uMvp;
uniform mat4 uModel;
out vec3 vWorld;
out vec3 vNormal;
void main() {
    vec4 world = uModel * vec4(aPos, 1.0);
    vWorld = world.xyz;
    vNormal = mat3(uModel) * aNormal;
    gl_Position = uMvp * vec4(aPos, 1.0);
}
"""

// Lit surfaces get a key light, a cool fill light and a specular glint, as the
// RealityKit scene on iOS; glass is drawn flat (unlit) with alpha.
private const val SCENE_FRAGMENT = """#version 300 es
precision mediump float;
in vec3 vWorld;
in vec3 vNormal;
uniform vec4 uColor;
uniform float uLit;
uniform vec3 uEmissive;
uniform vec3 uCamPos;
out vec4 fragColor;
void main() {
    vec3 color = uColor.rgb;
    if (uLit > 0.5) {
        vec3 keyDir = normalize(vec3(1.4, 2.2, 3.0));
        vec3 fillColor = vec3(0.6, 0.8, 1.0);
        vec3 n = normalize(vNormal);
        if (!gl_FrontFacing) n = -n;
        vec3 v = normalize(uCamPos - vWorld);
        float diffuse = max(dot(n, keyDir), 0.0);
        float glint = pow(max(dot(n, normalize(keyDir + v)), 0.0), 48.0) * 0.45;
        vec3 toFill = vec3(-2.5, -1.0, 2.5) - vWorld;
        float fill = max(dot(n, normalize(toFill)), 0.0) * 0.45;
        color = color * (0.32 + 0.85 * diffuse) + fillColor * color * fill + vec3(glint) + uEmissive;
    }
    fragColor = vec4(color, uColor.a);
}
"""

private const val BACKGROUND_VERTEX = """#version 300 es
out float vT;
void main() {
    vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    vT = p.y;
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
"""

private const val BACKGROUND_FRAGMENT = """#version 300 es
precision mediump float;
in float vT;
uniform vec3 uTop;
uniform vec3 uBottom;
out vec4 fragColor;
void main() {
    fragColor = vec4(mix(uBottom, uTop, clamp(vT, 0.0, 1.0)), 1.0);
}
"""

/** A linked GLSL program with its uniform locations. */
class GlProgram private constructor(val id: Int) {
    private val uniforms = HashMap<String, Int>()

    fun uniform(name: String): Int = uniforms.getOrPut(name) { GLES30.glGetUniformLocation(id, name) }

    fun use() = GLES30.glUseProgram(id)

    companion object {
        fun scene() = create(SCENE_VERTEX, SCENE_FRAGMENT)
        fun background() = create(BACKGROUND_VERTEX, BACKGROUND_FRAGMENT)

        private fun create(vertex: String, fragment: String): GlProgram {
            val program = GLES30.glCreateProgram()
            val vs = compile(GLES30.GL_VERTEX_SHADER, vertex)
            val fs = compile(GLES30.GL_FRAGMENT_SHADER, fragment)
            GLES30.glAttachShader(program, vs)
            GLES30.glAttachShader(program, fs)
            GLES30.glLinkProgram(program)
            val status = IntArray(1)
            GLES30.glGetProgramiv(program, GLES30.GL_LINK_STATUS, status, 0)
            check(status[0] != 0) { "Program link failed: ${GLES30.glGetProgramInfoLog(program)}" }
            GLES30.glDeleteShader(vs)
            GLES30.glDeleteShader(fs)
            return GlProgram(program)
        }

        private fun compile(type: Int, source: String): Int {
            val shader = GLES30.glCreateShader(type)
            GLES30.glShaderSource(shader, source)
            GLES30.glCompileShader(shader)
            val status = IntArray(1)
            GLES30.glGetShaderiv(shader, GLES30.GL_COMPILE_STATUS, status, 0)
            if (status[0] == 0) {
                val log = GLES30.glGetShaderInfoLog(shader)
                Log.e(TAG, log)
                error("Shader compile failed: $log")
            }
            return shader
        }
    }
}
