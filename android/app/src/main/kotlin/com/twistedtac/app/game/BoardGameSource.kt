package com.twistedtac.app.game

import com.twistedtac.engine.GameRulesConfig
import com.twistedtac.engine.GameState

/** What the 3D board needs from a game, local or online. */
interface BoardGameSource {
    val config: GameRulesConfig
    val state: GameState
    val lastMove: Int?
    val winningLine: List<Int>?

    /** Whether a tap on the board should be accepted right now. */
    val acceptsInput: Boolean
    fun humanTap(index: Int)
}
