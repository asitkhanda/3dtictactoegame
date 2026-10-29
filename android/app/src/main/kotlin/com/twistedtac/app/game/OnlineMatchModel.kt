package com.twistedtac.app.game

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.twistedtac.app.backend.MatchBackend
import com.twistedtac.app.backend.MatchEvent
import com.twistedtac.engine.GameRulesConfig
import com.twistedtac.engine.GameState
import com.twistedtac.engine.MatchRow
import com.twistedtac.engine.MatchStatus
import com.twistedtac.engine.Player
import com.twistedtac.engine.RankOutcome
import com.twistedtac.engine.applyMove
import com.twistedtac.engine.checkBoardWinner
import com.twistedtac.engine.checkCrossLayerWinner
import com.twistedtac.engine.mergeMatch
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

enum class ConnectionStatus { SYNCED, RECONNECTING }

/**
 * One online match from the player's seat: the authoritative row from the
 * server, kept fresh by realtime, plus optimistic moves, presence and the sound
 * cues. Mirrors OnlineMatchModel.swift, useMatch.ts and OnlineGamePage.tsx.
 */
class OnlineMatchModel private constructor(
    initial: MatchRow,
    val userId: String,
    override val config: GameRulesConfig,
    private val backend: MatchBackend,
    private val scope: CoroutineScope,
    private val feedback: GameFeedback,
) : BoardGameSource {
    val matchId: String = initial.id

    var match by mutableStateOf(initial)
        private set
    var connection by mutableStateOf(ConnectionStatus.SYNCED)
        private set
    var opponentName by mutableStateOf("Opponent")
        private set
    var pendingMove by mutableStateOf<Int?>(null)
        private set
    override var lastMove by mutableStateOf<Int?>(null)
        private set
    var layerEvent by mutableStateOf<LayerEvent?>(null)
        private set

    /** A one-line problem to surface (failed move, lost connection). */
    var errorMessage by mutableStateOf<String?>(null)

    private var work: Job? = null
    private var inFlight: Job? = null
    private var clearJob: Job? = null
    private var reportedFinish = initial.status == MatchStatus.FINISHED

    // MARK: Derived state

    override val state: GameState get() = GameState(match.board, match.layerWinners)
    val mySymbol: Player get() = match.symbol(userId)
    val isHost: Boolean get() = userId == match.hostId
    val isMyTurn: Boolean get() = match.currentTurnUserId == userId
    val isPlaying: Boolean get() = match.status == MatchStatus.ACTIVE && match.winner == null && !match.draw
    override val acceptsInput: Boolean get() = isPlaying && isMyTurn && pendingMove == null
    val xName: String get() = if (mySymbol == Player.X) "You" else opponentName
    val oName: String get() = if (mySymbol == Player.O) "You" else opponentName

    val outcome: GameOutcome?
        get() = match.winner?.let { GameOutcome.Win(it) } ?: if (match.draw) GameOutcome.Draw else null

    val rankOutcome: RankOutcome?
        get() = when (val result = outcome) {
            is GameOutcome.Win -> if (result.player == mySymbol) RankOutcome.WIN else RankOutcome.LOSS
            GameOutcome.Draw -> RankOutcome.DRAW
            null -> null
        }

    /** The line to celebrate: a stack-through line, or a flat-board line. */
    override val winningLine: List<Int>?
        get() {
            if (match.winner == null) return null
            if (config.size == 1) return listOf(0)
            return if (config.is3D) checkCrossLayerWinner(config, match.board).line
            else checkBoardWinner(config, match.board).line
        }

    val opponentDisconnectedAt: String?
        get() = if (isHost) match.guestDisconnectedAt else match.hostDisconnectedAt

    private val opponentId: String? get() = if (isHost) match.guestId else match.hostId

    // MARK: Lifecycle

    fun start() {
        if (work != null) return
        work = scope.launch {
            launch { subscribe() }
            launch { heartbeat() }
            launch { pollWhileWaiting() }
            launch { loadOpponentName() }
        }
    }

    fun stop() {
        work?.cancel()
        work = null
        clearJob?.cancel()
        scope.launch { backend.setPresence(matchId, connected = false) }
    }

    /** The app moved between foreground and background. */
    fun appBecameActive(active: Boolean) {
        scope.launch {
            backend.setPresence(matchId, active)
            if (active) refresh()
        }
    }

    private suspend fun loadOpponentName() {
        opponentId?.let { id -> backend.username(id)?.let { opponentName = it } }
    }

    suspend fun refresh() {
        try {
            val row = backend.fetch(matchId) ?: return
            // A fetch is authoritative, so it also undoes a failed optimistic move.
            apply(row, force = row.revision >= match.revision && pendingMove == null)
            connection = ConnectionStatus.SYNCED
        } catch (e: Exception) {
            if (e is CancellationException) throw e
            connection = ConnectionStatus.RECONNECTING
        }
    }

    private suspend fun subscribe() {
        backend.events(matchId).collect { event ->
            when (event) {
                MatchEvent.Subscribed -> {
                    connection = ConnectionStatus.SYNCED
                    // After (re)subscribing, fetch once so nothing sent in the gap is missed.
                    refresh()
                }
                is MatchEvent.Row -> {
                    apply(event.match)
                    connection = ConnectionStatus.SYNCED
                }
                MatchEvent.Lost -> connection = ConnectionStatus.RECONNECTING
            }
        }
    }

    /** Tells the server we're here every 30s, like the web's presence interval. */
    private suspend fun heartbeat() {
        backend.setPresence(matchId, connected = true)
        while (true) {
            delay(HEARTBEAT_MS)
            backend.setPresence(matchId, connected = true)
        }
    }

    /** Safety net for the waiting room if the realtime join event is missed. */
    private suspend fun pollWhileWaiting() {
        while (true) {
            delay(POLL_MS)
            if (match.status == MatchStatus.WAITING) refresh()
        }
    }

    // MARK: Applying rows

    private fun apply(incoming: MatchRow, force: Boolean = false) {
        val previous = match
        val merged = if (force) incoming else (mergeMatch(previous, incoming) ?: previous)
        if (merged == previous) return
        match = merged
        playCues(previous, merged)
        if (merged.guestId != previous.guestId && merged.guestId != null) {
            scope.launch { loadOpponentName() }
        }
    }

    /**
     * Sounds, haptics and banners for whatever changed — covers both my own move
     * and the opponent's, since both arrive as a new row.
     */
    private fun playCues(old: MatchRow, new: MatchRow) {
        val moved = new.board != old.board
        val index = if (moved) new.board.indices.firstOrNull { old.board[it] == null && new.board[it] != null } else null
        val mark = index?.let { new.board[it] }
        if (index != null && mark != null) {
            lastMove = index
            feedback.play(if (mark == Player.X) Cue.PLACE_X else Cue.PLACE_O)
            scheduleLastMoveClear()
        }

        val ongoing = new.status == MatchStatus.ACTIVE && new.winner == null && !new.draw
        val claimed = new.layerWinners.indices.firstOrNull {
            new.layerWinners[it].winner != null && old.layerWinners.getOrNull(it)?.winner == null
        }
        val owner = claimed?.let { new.layerWinners[it].winner }
        if (ongoing && moved && claimed != null && owner != null) {
            val event = LayerEvent(claimed + 1, owner)
            layerEvent = event
            feedback.play(if (owner == mySymbol) Cue.LAYER_WIN else Cue.LAYER_LOST)
            scope.launch {
                delay(1400)
                if (layerEvent == event) layerEvent = null
            }
        } else if (ongoing && moved && old.currentTurnUserId != new.currentTurnUserId) {
            feedback.play(if (new.currentTurnUserId == userId) Cue.YOUR_TURN else Cue.OPPONENT_TURN)
        }

        if (!reportedFinish && (new.winner != null || new.draw)) {
            reportedFinish = true
            when (rankOutcome) {
                RankOutcome.WIN -> feedback.play(Cue.VICTORY)
                RankOutcome.LOSS -> feedback.play(Cue.DEFEAT)
                RankOutcome.DRAW -> feedback.play(Cue.DRAW)
                null -> Unit
            }
        }
    }

    private fun scheduleLastMoveClear() {
        clearJob?.cancel()
        clearJob = scope.launch {
            delay(1500)
            lastMove = null
        }
    }

    // MARK: Actions

    override fun humanTap(index: Int) {
        if (!acceptsInput) return
        val result = applyMove(config, match.board, match.layerWinners, index, match.isXNext)
        if (result == null) {
            feedback.play(Cue.INVALID)
            return
        }

        // Show the move at once; the server confirms (or corrects) it below.
        val finished = result.winner != null || result.draw
        val optimistic = match.copy(
            board = result.board,
            layerWinners = result.layerWinners,
            isXNext = result.isXNext,
            winner = result.winner,
            draw = result.draw,
            status = if (finished) MatchStatus.FINISHED else MatchStatus.ACTIVE,
            currentTurnUserId = if (finished) null else match.userId(if (result.isXNext) Player.X else Player.O),
        )
        pendingMove = index
        apply(optimistic, force = true)

        inFlight = scope.launch {
            try {
                val confirmed = backend.submitMove(matchId, index)
                pendingMove = null
                apply(confirmed)
            } catch (e: Exception) {
                if (e is CancellationException) throw e
                pendingMove = null
                errorMessage = e.message
                lastMove = null
                refresh()
            }
        }
    }

    /** Forfeits an active match, or cancels / leaves a waiting room. */
    suspend fun forfeit(): Boolean = try {
        apply(backend.forfeit(matchId), force = true)
        true
    } catch (e: Exception) {
        if (e is CancellationException) throw e
        errorMessage = e.message
        false
    }

    /** Waits for an in-flight move; used by tests. */
    suspend fun awaitMove() {
        inFlight?.join()
    }

    companion object {
        const val HEARTBEAT_MS = 30_000L
        const val POLL_MS = 3_000L

        /** Null when the server sent a board size outside 1..8. */
        fun create(
            match: MatchRow,
            userId: String,
            backend: MatchBackend,
            scope: CoroutineScope,
            feedback: GameFeedback = GameFeedback.None,
        ): OnlineMatchModel? {
            val config = match.config.rulesConfig ?: return null
            return OnlineMatchModel(match, userId, config, backend, scope, feedback)
        }
    }
}
