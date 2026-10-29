package com.twistedtac.app

import com.twistedtac.app.backend.MatchBackend
import com.twistedtac.app.backend.MatchEvent
import com.twistedtac.engine.LayerResult
import com.twistedtac.engine.MatchConfig
import com.twistedtac.engine.MatchRow
import com.twistedtac.engine.MatchStatus
import com.twistedtac.engine.Player
import com.twistedtac.engine.ViewMode
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.emptyFlow

/**
 * Opens an online match screen against a fake server, with no account or second player:
 *   adb shell am start -n com.twistedtac.app/.MainActivity --es preview win
 * Scenarios: waiting, active, win, loss.
 */
object DebugPreview {
    class OnlineScenario(val match: MatchRow, val userId: String, val backend: MatchBackend)

    private const val ME = "preview-me"
    private const val THEM = "preview-them"

    private fun board(vararg marks: Pair<Int, Player>): List<Player?> =
        MutableList<Player?>(27) { null }.also { b -> marks.forEach { (i, p) -> b[i] = p } }

    private fun match(
        status: MatchStatus,
        board: List<Player?> = board(),
        winner: Player? = null,
        guest: Boolean = true,
        isXNext: Boolean = true,
    ) = MatchRow(
        id = "preview-match", roomCode = "K7M2QX", hostId = ME, guestId = if (guest) THEM else null,
        status = status, config = MatchConfig(3, ViewMode.CUBE), board = board,
        layerWinners = List(3) { LayerResult() }, isXNext = isXNext, hostPlaysX = true, winner = winner, draw = false,
        currentTurnUserId = if (status == MatchStatus.ACTIVE) ME else null,
        hostDisconnectedAt = null, guestDisconnectedAt = null, hostLastSeenAt = null, guestLastSeenAt = null,
        abandonReason = null, createdAt = "2026-10-29T18:00:00+00:00", updatedAt = "2026-10-29T18:00:00+00:00", revision = 5,
    )

    fun online(name: String): OnlineScenario? {
        val row = when (name) {
            "waiting" -> match(MatchStatus.WAITING, guest = false)
            "active" -> match(MatchStatus.ACTIVE, board(4 to Player.X, 13 to Player.O, 0 to Player.X))
            // X (me) completes a line down the stack; "loss" is the same board seen from the other seat.
            "win", "loss" -> match(
                MatchStatus.FINISHED,
                board(0 to Player.X, 9 to Player.X, 18 to Player.X, 1 to Player.O, 2 to Player.O),
                winner = Player.X, isXNext = false,
            )
            else -> return null
        }
        val user = if (name == "loss") THEM else ME
        return OnlineScenario(row, user, FakeBackend(row))
    }

    private class FakeBackend(private val row: MatchRow) : MatchBackend {
        override suspend fun fetch(id: String) = row
        override suspend fun submitMove(id: String, cellIndex: Int) = row
        override suspend fun forfeit(id: String) = row
        override suspend fun setPresence(id: String, connected: Boolean) = Unit
        override suspend fun username(userId: String) = "preview_rival"
        override fun events(id: String): Flow<MatchEvent> = emptyFlow()
    }
}
