package com.twistedtac.app.feedback

import com.twistedtac.app.game.Cue

/**
 * One vibration pattern per cue, ported from ArcadeHaptics.swift. Each is shaped
 * to its meaning so the hand can tell them apart without looking: a light, crisp
 * tick for selecting, a weighty thud for placing a piece, a bright rising run for
 * winning, and a heavy sinking thud for losing.
 *
 * Core Haptics has intensity and sharpness; Android's waveforms have only an
 * amplitude over time, so sharpness becomes length: a crisp tick is shorter,
 * a dull thud lingers.
 */
class HapticWaveform(val timings: LongArray, val amplitudes: IntArray)

object HapticPatterns {
    private const val STEP_MS = 5

    private class Builder {
        val amplitude = IntArray(1200)
        var end = 0

        private fun fill(startMs: Int, durationMs: Int, level: (Int) -> Int) {
            val from = startMs / STEP_MS
            val count = maxOf(1, durationMs / STEP_MS)
            for (i in 0 until count) {
                if (from + i >= amplitude.size) break
                amplitude[from + i] = maxOf(amplitude[from + i], level(i * STEP_MS).coerceIn(0, 255))
            }
            end = maxOf(end, minOf(amplitude.size, from + count))
        }

        /** A short transient. [sharpness] 0..1: higher is crisper, so shorter. */
        fun tick(timeMs: Int, intensity: Float, sharpness: Float) {
            val duration = (28 - 18 * sharpness).toInt()
            fill(timeMs, duration) { (intensity * 255).toInt() }
        }

        /** A sustained buzz that follows [curve] (time in ms -> 0..1 multiplier). */
        fun hum(timeMs: Int, durationMs: Int, intensity: Float = 1f, curve: (Int) -> Float = { 1f }) {
            fill(timeMs, durationMs) { (intensity * curve(it) * 255).toInt() }
        }

        fun build(): HapticWaveform {
            val timings = ArrayList<Long>()
            val amplitudes = ArrayList<Int>()
            var i = 0
            while (i < end) {
                var j = i
                while (j < end && amplitude[j] == amplitude[i]) j++
                timings.add(((j - i) * STEP_MS).toLong())
                amplitudes.add(amplitude[i])
                i = j
            }
            return HapticWaveform(timings.toLongArray(), amplitudes.toIntArray())
        }
    }

    private fun pattern(block: Builder.() -> Unit): HapticWaveform = Builder().apply(block).build()

    private fun fade(from: Float, to: Float, durationMs: Int): (Int) -> Float =
        { t -> from + (to - from) * (t.toFloat() / durationMs).coerceIn(0f, 1f) }

    private val patterns: Map<Cue, HapticWaveform> = mapOf(
        // Selection: the lightest, crispest tick, so frequent taps never tire the hand.
        Cue.TAP to pattern { tick(0, 0.45f, 0.9f) },
        // A firm thump with a short body behind it.
        Cue.PLACE_X to pattern { tick(0, 0.9f, 0.35f); hum(0, 50, 0.5f) },
        // Rounder and softer than X, with a small settle after it lands.
        Cue.PLACE_O to pattern { tick(0, 0.7f, 0.2f); hum(0, 35, 0.35f); tick(65, 0.3f, 0.3f) },
        // A gentle rising nudge: it's you.
        Cue.YOUR_TURN to pattern { tick(0, 0.35f, 0.6f); tick(90, 0.55f, 0.75f) },
        Cue.OPPONENT_TURN to pattern { tick(0, 0.2f, 0.5f) },
        // Bright double hit that rings out.
        Cue.LAYER_WIN to pattern { tick(0, 0.7f, 0.8f); tick(100, 0.9f, 0.9f); hum(100, 200, 1f, fade(0.5f, 0f, 200)) },
        // A soft low sink, nothing sharp.
        Cue.LAYER_LOST to pattern { hum(0, 280, 1f, fade(0.5f, 0.05f, 280)) },
        // A climbing run of ticks, then a shimmering tail of sparkles.
        Cue.VICTORY to pattern {
            tick(0, 0.5f, 0.5f); tick(120, 0.65f, 0.65f); tick(240, 0.8f, 0.8f); tick(360, 1f, 0.95f)
            hum(360, 700, 1f, fade(0.9f, 0f, 700))
            tick(500, 0.45f, 1f); tick(620, 0.38f, 1f); tick(750, 0.3f, 1f); tick(900, 0.22f, 1f)
        },
        // A heavy, dull thud that sinks away into a low rumble.
        Cue.DEFEAT to pattern { tick(0, 1f, 0.1f); hum(0, 900, 1f, fade(0.85f, 0f, 900)); tick(380, 0.5f, 0.1f) },
        // Two even, neutral taps.
        Cue.DRAW to pattern { tick(0, 0.5f, 0.4f); tick(180, 0.5f, 0.4f) },
        // A quick, sharp double tick: "no".
        Cue.INVALID to pattern { tick(0, 0.8f, 1f); tick(70, 0.8f, 1f) },
    )

    fun forCue(cue: Cue): HapticWaveform = patterns.getValue(cue)
}
