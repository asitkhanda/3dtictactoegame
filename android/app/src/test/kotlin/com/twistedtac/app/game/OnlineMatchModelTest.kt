package com.twistedtac.app.game

import com.twistedtac.app.backend.MatchBackend
import com.twistedtac.app.backend.MatchEvent
import com.twistedtac.engine.LayerResult
import com.twistedtac.engine.MatchConfig
import com.twistedtac.engine.MatchRow
import com.twistedtac.engine.MatchStatus
import com.twistedtac.engine.Player
import com.twistedtac.engine.RankOutcome
import com.twistedtac.engine.ViewMode
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

private const val HOST = "host-id"
private const val GUEST = "guest-id"

private fun row(
    revision: Int = 1,
    status: MatchStatus = MatchStatus.ACTIVE,
    board: List<Player?> = List(27) { null },
    isXNext: Boolean = true,
    guestId: String? = GUEST,
    winner: Player? = null,
    draw: Boolean = false,
    layerWinners: List<LayerResult> = List(3) { LayerResult() },
    guestDisconnectedAt: String? = null,
) = MatchRow(
    id = "m1", roomCode = "ABC234", hostId = HOST, guestId = guestId, status = status,
    config = MatchConfig(3, ViewMode.CUBE), board = board, layerWinners = layerWinners,
    isXNext = isXNext, hostPlaysX = true, winner = winner, draw = draw,
    currentTurnUserId = if (status == MatchStatus.ACTIVE && winner == null && !draw) (if (isXNext) HOST else GUEST) else null,
    hostDisconnectedAt = null, guestDisconnectedAt = guestDisconnectedAt,
    hostLastSeenAt = null, guestLastSeenAt = null, abandonReason = null,
    createdAt = "", updatedAt = "", revision = revision,
)

private fun boardWith(vararg marks: Pair<Int, Player>): List<Player?> =
    MutableList<Player?>(27) { null }.also { b -> marks.forEach { (i, p) -> b[i] = p } }

private class FakeBackend(var server: MatchRow) : MatchBackend {
    val events = MutableSharedFlow<MatchEvent>(extraBufferCapacity = 16)
    val presence = mutableListOf<Boolean>()
    var moves = mutableListOf<Int>()
    var moveHandler: (Int) -> MatchRow = { error("no move handler") }
    var forfeitResult: MatchRow? = null
    val names = mutableMapOf(GUEST to "neon_guest", HOST to "host_player")

    override suspend fun fetch(id: String) = server
    override suspend fun submitMove(id: String, cellIndex: Int): MatchRow {
        moves += cellIndex
        return moveHandler(cellIndex)
    }
    override suspend fun forfeit(id: String) = forfeitResult ?: error("no forfeit result")
    override suspend fun setPresence(id: String, connected: Boolean) { presence += connected }
    override suspend fun username(userId: String) = names[userId]
    override fun events(id: String): Flow<MatchEvent> = events
}

private class Recorder : GameFeedback {
    val cues = mutableListOf<Cue>()
    override fun play(cue: Cue) { cues += cue }
}

@OptIn(ExperimentalCoroutinesApi::class)
class OnlineMatchModelTest {
    private fun TestScope.model(
        backend: FakeBackend,
        feedback: GameFeedback,
        userId: String = HOST,
    ) = OnlineMatchModel.create(backend.server, userId, backend, backgroundScope, feedback)!!

    @Test
    fun `my move shows at once and the server confirms it`() = runTest {
        val backend = FakeBackend(row())
        val recorder = Recorder()
        val model = model(backend, recorder)
        val confirmed = row(revision = 2, board = boardWith(4 to Player.X), isXNext = false)
        backend.moveHandler = { confirmed }

        assertTrue(model.acceptsInput)
        model.humanTap(4)
        assertEquals(Player.X, model.state.board[4], "optimistic")
        assertEquals(4, model.pendingMove)
        assertFalse(model.acceptsInput)

        runCurrent()
        assertEquals(listOf(4), backend.moves)
        assertNull(model.pendingMove)
        assertEquals(2, model.match.revision)
        assertEquals(listOf(Cue.PLACE_X, Cue.OPPONENT_TURN), recorder.cues, "as on iOS, handing the turn over cues too")
    }

    @Test
    fun `a rejected move is rolled back and reported`() = runTest {
        val backend = FakeBackend(row())
        val model = model(backend, GameFeedback.None)
        backend.moveHandler = { throw IllegalStateException("Not your turn") }

        model.humanTap(4)
        runCurrent()

        assertEquals("Not your turn", model.errorMessage)
        assertNull(model.pendingMove)
        assertNull(model.state.board[4], "board is back to the server's copy")
        assertTrue(model.acceptsInput)
    }

    @Test
    fun `taps are ignored when it is not my turn`() = runTest {
        val backend = FakeBackend(row(isXNext = false))
        val model = model(backend, GameFeedback.None)
        model.humanTap(4)
        runCurrent()
        assertTrue(backend.moves.isEmpty())
        assertNull(model.state.board[4])
    }

    @Test
    fun `an illegal tap makes the invalid cue and never reaches the server`() = runTest {
        val backend = FakeBackend(row(board = boardWith(4 to Player.O), isXNext = true))
        val recorder = Recorder()
        val model = model(backend, recorder)
        model.humanTap(4)
        runCurrent()
        assertEquals(listOf(Cue.INVALID), recorder.cues)
        assertTrue(backend.moves.isEmpty())
    }

    @Test
    fun `the opponent's move arrives over realtime`() = runTest {
        val backend = FakeBackend(row(board = boardWith(4 to Player.X), isXNext = false))
        val recorder = Recorder()
        val model = model(backend, recorder)
        model.start()
        runCurrent()

        backend.events.emit(MatchEvent.Row(row(revision = 3, board = boardWith(4 to Player.X, 13 to Player.O), isXNext = true)))
        runCurrent()

        assertEquals(Player.O, model.state.board[13])
        assertTrue(model.isMyTurn)
        assertEquals(13, model.lastMove)
        assertEquals(listOf(Cue.PLACE_O, Cue.YOUR_TURN), recorder.cues)

        advanceTimeBy(1600)
        assertNull(model.lastMove, "the last-move glow clears itself")
    }

    @Test
    fun `a stale row is ignored`() = runTest {
        val backend = FakeBackend(row(revision = 5, board = boardWith(4 to Player.X), isXNext = false))
        val model = model(backend, GameFeedback.None)
        model.start()
        runCurrent()
        backend.events.emit(MatchEvent.Row(row(revision = 2)))
        runCurrent()
        assertEquals(Player.X, model.state.board[4])
        assertEquals(5, model.match.revision)
    }

    @Test
    fun `a guest joining a waiting room loads their name`() = runTest {
        val waiting = row(status = MatchStatus.WAITING, guestId = null)
        val backend = FakeBackend(waiting)
        val model = model(backend, GameFeedback.None)
        model.start()
        runCurrent()
        assertEquals("Opponent", model.opponentName)

        backend.events.emit(MatchEvent.Row(row(revision = 2)))
        runCurrent()
        assertEquals(MatchStatus.ACTIVE, model.match.status)
        assertEquals("neon_guest", model.opponentName)
    }

    @Test
    fun `the waiting room polls in case a join event is missed`() = runTest {
        val backend = FakeBackend(row(status = MatchStatus.WAITING, guestId = null))
        val model = model(backend, GameFeedback.None)
        model.start()
        runCurrent()
        backend.server = row(revision = 2)
        advanceTimeBy(OnlineMatchModel.POLL_MS + 100)
        assertEquals(MatchStatus.ACTIVE, model.match.status)
    }

    @Test
    fun `presence is sent on start, on a heartbeat, and on stop`() = runTest {
        val backend = FakeBackend(row())
        val model = model(backend, GameFeedback.None)
        model.start()
        runCurrent()
        assertEquals(listOf(true), backend.presence)
        advanceTimeBy(OnlineMatchModel.HEARTBEAT_MS + 100)
        assertEquals(listOf(true, true), backend.presence)
        model.stop()
        runCurrent()
        assertEquals(false, backend.presence.last())
    }

    @Test
    fun `losing the channel shows reconnecting until it resubscribes`() = runTest {
        val backend = FakeBackend(row())
        val model = model(backend, GameFeedback.None)
        model.start()
        runCurrent()
        backend.events.emit(MatchEvent.Lost)
        runCurrent()
        assertEquals(ConnectionStatus.RECONNECTING, model.connection)
        backend.events.emit(MatchEvent.Subscribed)
        runCurrent()
        assertEquals(ConnectionStatus.SYNCED, model.connection)
    }

    @Test
    fun `winning and losing play the right cues and rank`() = runTest {
        val winning = row(revision = 4, board = boardWith(0 to Player.X, 9 to Player.X, 18 to Player.X), isXNext = false, winner = Player.X)

        val hostBackend = FakeBackend(row(board = boardWith(0 to Player.X, 9 to Player.X), isXNext = true))
        val hostRecorder = Recorder()
        val hostModel = model(hostBackend, hostRecorder, HOST)
        hostBackend.moveHandler = { winning }
        hostModel.humanTap(18)
        runCurrent()
        assertEquals(RankOutcome.WIN, hostModel.rankOutcome)
        assertTrue(Cue.VICTORY in hostRecorder.cues)
        assertEquals(listOf(0, 9, 18), hostModel.winningLine)

        val guestBackend = FakeBackend(row(board = boardWith(0 to Player.X, 9 to Player.X), isXNext = true))
        val guestRecorder = Recorder()
        val guestModel = model(guestBackend, guestRecorder, GUEST)
        guestModel.start()
        runCurrent()
        guestBackend.events.emit(MatchEvent.Row(winning))
        runCurrent()
        assertEquals(RankOutcome.LOSS, guestModel.rankOutcome)
        assertTrue(Cue.DEFEAT in guestRecorder.cues)
    }

    @Test
    fun `claiming a layer plays the layer cue`() = runTest {
        val backend = FakeBackend(row(board = boardWith(0 to Player.X, 1 to Player.X), isXNext = true))
        val recorder = Recorder()
        val model = model(backend, recorder)
        val claimed = row(
            revision = 2,
            board = boardWith(0 to Player.X, 1 to Player.X, 2 to Player.X),
            isXNext = false,
            layerWinners = listOf(LayerResult(Player.X, listOf(0, 1, 2)), LayerResult(), LayerResult()),
        )
        backend.moveHandler = { claimed }
        model.humanTap(2)
        runCurrent()
        assertEquals(1, model.layerEvent?.layerNumber)
        assertTrue(Cue.LAYER_WIN in recorder.cues)
        advanceTimeBy(1500)
        assertNull(model.layerEvent)
    }

    @Test
    fun `forfeiting applies the server's result`() = runTest {
        val backend = FakeBackend(row())
        val model = model(backend, GameFeedback.None)
        backend.forfeitResult = row(revision = 9, status = MatchStatus.FINISHED, winner = Player.O)
        assertTrue(model.forfeit())
        assertEquals(RankOutcome.LOSS, model.rankOutcome)
    }

    @Test
    fun `an opponent disconnect is surfaced`() = runTest {
        val backend = FakeBackend(row())
        val model = model(backend, GameFeedback.None)
        model.start()
        runCurrent()
        assertNull(model.opponentDisconnectedAt)
        backend.events.emit(MatchEvent.Row(row(guestDisconnectedAt = "2026-10-25T10:00:00+00:00")))
        runCurrent()
        assertEquals("2026-10-25T10:00:00+00:00", model.opponentDisconnectedAt)
    }

    @Test
    fun `a board size the engine rejects cannot be opened`() = runTest {
        val bad = row().copy(config = MatchConfig(12, ViewMode.CUBE))
        assertNull(OnlineMatchModel.create(bad, HOST, FakeBackend(bad), backgroundScope))
    }
}
