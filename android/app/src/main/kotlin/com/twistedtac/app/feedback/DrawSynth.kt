package com.twistedtac.app.feedback

import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.sin

/**
 * Renders the draw cue, the one sound with no recording. A port of the draw recipe
 * in ArcadeSound.swift / SoundSynth.swift (itself from src/utils/arcadeSound.ts):
 * two echoing tones and a short filtered noise tick, shaped by WebAudio-style
 * envelopes and a feedback-delay "echo bus".
 */
object DrawSynth {
    const val SAMPLE_RATE = 44_100
    private const val MASTER_VOLUME = 0.22f

    /** The cue as a mono 16-bit WAV file. */
    fun wavBytes(): ByteArray {
        val samples = render()
        val pcm = ByteBuffer.allocate(samples.size * 2).order(ByteOrder.LITTLE_ENDIAN)
        samples.forEach { pcm.putShort((it * Short.MAX_VALUE).toInt().toShort()) }

        val header = ByteBuffer.allocate(44).order(ByteOrder.LITTLE_ENDIAN).apply {
            put("RIFF".toByteArray()); putInt(36 + pcm.capacity()); put("WAVE".toByteArray())
            put("fmt ".toByteArray()); putInt(16); putShort(1); putShort(1)
            putInt(SAMPLE_RATE); putInt(SAMPLE_RATE * 2); putShort(2); putShort(16)
            put("data".toByteArray()); putInt(pcm.capacity())
        }
        return ByteArrayOutputStream().apply { write(header.array()); write(pcm.array()) }.toByteArray()
    }

    private fun render(): FloatArray {
        val length = ((0.22 + 0.28 + 0.9) * SAMPLE_RATE).toInt()
        val dry = FloatArray(length)
        val echo = FloatArray(length)

        mixTone(echo, at = 0.0, freq = 392.0, duration = 0.16, gain = 0.45)
        mixTone(echo, at = 0.22, freq = 392.0, duration = 0.28, gain = 0.4)
        mixBandpassNoise(dry, at = 0.0, duration = 0.04, gain = 0.2, freq = 1500.0, q = 1.2)

        // Echo bus: direct signal, plus a 0.17s feedback delay (0.28) at 0.16 wet.
        val delay = (0.17 * SAMPLE_RATE).toInt()
        val delayed = FloatArray(length)
        for (n in 0 until length) {
            delayed[n] = if (n >= delay) echo[n - delay] + 0.28f * delayed[n - delay] else 0f
        }
        return FloatArray(length) { n ->
            max(-1f, min(1f, (dry[n] + echo[n] + 0.16f * delayed[n]) * MASTER_VOLUME))
        }
    }

    /** Linear attack to [peak], then an exponential ramp down to 0.001 at the end. */
    private fun envelope(t: Double, peak: Double, attack: Double, duration: Double): Double {
        if (t < 0 || t > duration) return 0.0
        if (t < attack) return peak * (t / attack)
        val span = max(duration - attack, 1e-6)
        return peak * (0.001 / peak).pow((t - attack) / span)
    }

    private fun mixTone(buffer: FloatArray, at: Double, freq: Double, duration: Double, gain: Double, attack: Double = 0.008) {
        val start = (at * SAMPLE_RATE).toInt()
        var phase = 0.0
        for (i in 0 until (duration * SAMPLE_RATE).toInt()) {
            if (start + i >= buffer.size) break
            val t = i.toDouble() / SAMPLE_RATE
            phase += 2 * PI * freq / SAMPLE_RATE
            buffer[start + i] += (sin(phase) * envelope(t, gain, attack, duration)).toFloat()
        }
    }

    private fun mixBandpassNoise(buffer: FloatArray, at: Double, duration: Double, gain: Double, freq: Double, q: Double, attack: Double = 0.008) {
        val start = (at * SAMPLE_RATE).toInt()
        // RBJ band-pass biquad, matching WebAudio's BiquadFilterNode.
        val w0 = 2 * PI * min(freq, SAMPLE_RATE / 2.1) / SAMPLE_RATE
        val alpha = sin(w0) / (2 * max(q, 0.01))
        val a0 = 1 + alpha
        val b0 = alpha / a0
        val b2 = -alpha / a0
        val a1 = -2 * cos(w0) / a0
        val a2 = (1 - alpha) / a0
        var x1 = 0.0; var x2 = 0.0; var y1 = 0.0; var y2 = 0.0
        var seed = 0xC0FFEEL
        for (i in 0 until (duration * SAMPLE_RATE).toInt()) {
            if (start + i >= buffer.size) break
            // Small deterministic LCG so the cue sounds the same every time.
            seed = (seed * 6364136223846793005L + 1442695040888963407L)
            val white = ((seed ushr 40).toDouble() / (1 shl 24)) * 2 - 1
            val y = b0 * white + b2 * x2 - a1 * y1 - a2 * y2
            x2 = x1; x1 = white; y2 = y1; y1 = y
            buffer[start + i] += (y * envelope(i.toDouble() / SAMPLE_RATE, gain, attack, duration)).toFloat()
        }
    }

}
