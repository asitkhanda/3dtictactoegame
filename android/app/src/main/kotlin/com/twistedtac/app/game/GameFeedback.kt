package com.twistedtac.app.game

/** Sound and haptic cues, as ArcadeFeedback on iOS. Wired up in the sound milestone. */
enum class Cue { TAP, PLACE_X, PLACE_O, INVALID, YOUR_TURN, LAYER_WIN, LAYER_LOST, VICTORY, DEFEAT, DRAW }

fun interface GameFeedback {
    fun play(cue: Cue)

    companion object {
        val None = GameFeedback { }
    }
}
