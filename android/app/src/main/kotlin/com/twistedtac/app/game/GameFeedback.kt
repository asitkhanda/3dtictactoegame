package com.twistedtac.app.game

/** Sound and haptic cues, as ArcadeSound on iOS. */
enum class Cue { TAP, PLACE_X, PLACE_O, INVALID, YOUR_TURN, OPPONENT_TURN, LAYER_WIN, LAYER_LOST, VICTORY, DEFEAT, DRAW }

fun interface GameFeedback {
    fun play(cue: Cue)

    companion object {
        val None = GameFeedback { }
    }
}
