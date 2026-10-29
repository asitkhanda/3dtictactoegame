package com.twistedtac.app.feedback

import com.twistedtac.app.game.Cue
import java.nio.ByteBuffer
import java.nio.ByteOrder
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class HapticPatternsTest {
    @Test
    fun `every cue has a pattern`() {
        for (cue in Cue.entries) {
            val pattern = HapticPatterns.forCue(cue)
            assertTrue(pattern.timings.isNotEmpty(), "$cue has no vibration")
            assertEquals(pattern.timings.size, pattern.amplitudes.size, "$cue arrays line up")
        }
    }

    @Test
    fun `amplitudes are valid and something is felt`() {
        for (cue in Cue.entries) {
            val pattern = HapticPatterns.forCue(cue)
            assertTrue(pattern.amplitudes.all { it in 0..255 }, "$cue amplitude range")
            assertTrue(pattern.amplitudes.any { it > 0 }, "$cue is silent")
            assertTrue(pattern.timings.all { it > 0 }, "$cue has a zero-length segment")
        }
    }

    @Test
    fun `a tap is lighter and shorter than a defeat`() {
        fun total(cue: Cue) = HapticPatterns.forCue(cue).timings.sum()
        assertTrue(total(Cue.TAP) < 40)
        assertTrue(total(Cue.DEFEAT) > 800)
        assertTrue(total(Cue.DEFEAT) < 1500, "stays inside the longest sound")
        assertTrue(HapticPatterns.forCue(Cue.TAP).amplitudes.max() < HapticPatterns.forCue(Cue.PLACE_X).amplitudes.max())
    }

    @Test
    fun `an invalid move is a double tick`() {
        val pattern = HapticPatterns.forCue(Cue.INVALID)
        assertEquals(3, pattern.timings.size, "tick, gap, tick")
    }
}

class DrawSynthTest {
    @Test
    fun `renders a valid mono 16-bit wav`() {
        val bytes = DrawSynth.wavBytes()
        val header = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
        assertEquals("RIFF", String(bytes, 0, 4))
        assertEquals("WAVE", String(bytes, 8, 4))
        assertEquals(1, header.getShort(22).toInt(), "mono")
        assertEquals(DrawSynth.SAMPLE_RATE, header.getInt(24))
        assertEquals(16, header.getShort(34).toInt())
        assertEquals(bytes.size - 44, header.getInt(40), "data length matches")
    }

    @Test
    fun `sounds like something and never clips`() {
        val bytes = DrawSynth.wavBytes()
        val pcm = ByteBuffer.wrap(bytes, 44, bytes.size - 44).order(ByteOrder.LITTLE_ENDIAN).asShortBuffer()
        var peak = 0
        while (pcm.hasRemaining()) peak = maxOf(peak, kotlin.math.abs(pcm.get().toInt()))
        assertTrue(peak > 1000, "peak $peak")
        assertTrue(peak < Short.MAX_VALUE, "peak $peak")
    }

    @Test
    fun `is the same every time`() {
        assertTrue(DrawSynth.wavBytes().contentEquals(DrawSynth.wavBytes()))
    }
}
