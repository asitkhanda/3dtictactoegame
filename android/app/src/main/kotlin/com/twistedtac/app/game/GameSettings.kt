package com.twistedtac.app.game

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.core.content.edit

/** Player preferences, persisted in SharedPreferences. */
class GameSettings(context: Context) {
    private val prefs = context.getSharedPreferences("settings", Context.MODE_PRIVATE)

    var soundMuted by mutableStateOf(prefs.getBoolean(SOUND_MUTED, false))
        private set

    var hapticsEnabled by mutableStateOf(prefs.getBoolean(HAPTICS_ENABLED, true))
        private set

    fun toggleSound() {
        soundMuted = !soundMuted
        prefs.edit { putBoolean(SOUND_MUTED, soundMuted) }
    }

    fun setHaptics(enabled: Boolean) {
        hapticsEnabled = enabled
        prefs.edit { putBoolean(HAPTICS_ENABLED, enabled) }
    }

    private companion object {
        const val SOUND_MUTED = "soundMuted"
        const val HAPTICS_ENABLED = "hapticsEnabled"
    }
}
