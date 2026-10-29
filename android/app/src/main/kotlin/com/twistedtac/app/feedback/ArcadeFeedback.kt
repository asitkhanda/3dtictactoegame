package com.twistedtac.app.feedback

import android.content.Context
import android.media.AudioAttributes
import android.media.SoundPool
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import com.twistedtac.app.R
import com.twistedtac.app.game.Cue
import com.twistedtac.app.game.GameFeedback
import com.twistedtac.app.game.GameSettings
import java.io.File

/** Plays a cue's audio and haptic together, honouring [GameSettings]. */
class ArcadeFeedback(context: Context, private val settings: GameSettings) : GameFeedback {
    private val soundPool = SoundPool.Builder()
        .setMaxStreams(6)
        .setAudioAttributes(
            AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_GAME)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build(),
        )
        .build()

    private val sounds = HashMap<Cue, Int>()

    private val vibrator: Vibrator? =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            context.getSystemService(VibratorManager::class.java)?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        }

    init {
        val recordings = mapOf(
            Cue.TAP to R.raw.tap,
            Cue.PLACE_X to R.raw.place_x,
            Cue.PLACE_O to R.raw.place_o,
            Cue.YOUR_TURN to R.raw.your_turn,
            Cue.OPPONENT_TURN to R.raw.opponent_turn,
            Cue.LAYER_WIN to R.raw.layer_win,
            Cue.LAYER_LOST to R.raw.layer_lost,
            Cue.VICTORY to R.raw.victory,
            Cue.DEFEAT to R.raw.defeat,
            Cue.INVALID to R.raw.invalid,
        )
        recordings.forEach { (cue, resource) -> sounds[cue] = soundPool.load(context, resource, 1) }

        // The draw cue has no recording; render it once and keep it in the cache.
        val draw = File(context.cacheDir, "draw-cue.wav")
        if (!draw.exists()) draw.writeBytes(DrawSynth.wavBytes())
        sounds[Cue.DRAW] = soundPool.load(draw.path, 1)
    }

    override fun play(cue: Cue) {
        if (settings.hapticsEnabled) vibrate(cue)
        if (settings.soundMuted) return
        sounds[cue]?.let { soundPool.play(it, 1f, 1f, 1, 0, 1f) }
    }

    fun release() = soundPool.release()

    private fun vibrate(cue: Cue) {
        val vibrator = vibrator?.takeIf { it.hasVibrator() } ?: return
        val pattern = HapticPatterns.forCue(cue)
        if (pattern.timings.isEmpty()) return
        // Haptics are decoration; never let them break a move.
        runCatching {
            vibrator.vibrate(VibrationEffect.createWaveform(pattern.timings, pattern.amplitudes, -1))
        }
    }
}
