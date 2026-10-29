package com.twistedtac.app.game

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.twistedtac.engine.InviteLink

/**
 * Turns an opened invite link into a pending room code. The app joins it as soon
 * as the player is signed in and ready.
 */
class DeepLinkRouter {
    var pendingRoomCode by mutableStateOf<String?>(null)
        private set
    var errorMessage by mutableStateOf<String?>(null)

    /** Returns true if the URL was one of our invite links. */
    fun handle(url: String): Boolean {
        val code = InviteLink.roomCode(url) ?: return false
        pendingRoomCode = code
        return true
    }

    fun consume() {
        pendingRoomCode = null
    }
}
