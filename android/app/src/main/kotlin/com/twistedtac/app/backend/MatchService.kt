package com.twistedtac.app.backend

import com.twistedtac.engine.InviteLink
import com.twistedtac.engine.MatchRow
import com.twistedtac.engine.ViewMode
import android.util.Log
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.exceptions.RestException
import io.github.jan.supabase.functions.functions
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Order
import io.github.jan.supabase.realtime.PostgresAction
import io.github.jan.supabase.realtime.channel
import io.github.jan.supabase.realtime.decodeRecord
import io.github.jan.supabase.realtime.postgresChangeFlow
import io.github.jan.supabase.realtime.realtime
import io.ktor.client.statement.bodyAsText
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.put

/** What the realtime channel reports about one match. */
sealed interface MatchEvent {
    /** The channel is connected; fetch once so nothing from the gap is missed. */
    data object Subscribed : MatchEvent
    data class Row(val match: MatchRow) : MatchEvent

    /** The channel dropped; the client keeps trying to reconnect. */
    data object Lost : MatchEvent
}

/**
 * The server surface an online match needs. The live implementation talks to
 * Supabase; tests use a scripted fake.
 */
interface MatchBackend {
    suspend fun fetch(id: String): MatchRow?
    suspend fun submitMove(id: String, cellIndex: Int): MatchRow
    suspend fun forfeit(id: String): MatchRow
    suspend fun setPresence(id: String, connected: Boolean)
    suspend fun username(userId: String): String?
    fun events(id: String): Flow<MatchEvent>
}

class ServiceException(override val message: String) : Exception(message)

/**
 * Server calls for online matches, mirroring src/services/matchService.ts and
 * MatchService.swift. Moves go through the `submit-move` edge function, which
 * re-validates them with the same rules engine; everything else is a
 * security-definer RPC.
 */
object MatchService : MatchBackend {
    private const val TAG = "TwistedTac"
    private val json = Json { ignoreUnknownKeys = true }

    /** Where the Supabase client comes from. Tests point it at a fake server. */
    internal var clientProvider: () -> SupabaseClient? = { Backend.client }

    private fun requireClient(): SupabaseClient =
        clientProvider() ?: throw ServiceException("No backend connection.")

    /**
     * Postgres raises plain-English messages ("Room full"); show those and hide transport noise.
     * Everything else is logged, so a failure on a device can be read from logcat.
     */
    private fun messageFrom(error: Exception, fallback: String): ServiceException {
        if (error is CancellationException) throw error
        if (error is RestException) {
            // PostgREST puts the message in `error` and its code and hint in `description`;
            // edge functions answer {"error": "..."} as the body.
            for (text in listOfNotNull(error.error, error.description)) {
                val parsed = runCatching {
                    val body = json.parseToJsonElement(text).jsonObject
                    (body["error"] ?: body["message"])?.let { (it as? JsonPrimitive)?.contentOrNull }
                }.getOrNull()
                val message = parsed ?: text.takeUnless { it.startsWith("Code:") || it.startsWith("{") }
                if (!message.isNullOrBlank() && message.length < 160) return ServiceException(message)
            }
        }
        Log.w(TAG, "$fallback (${error::class.java.name}: ${error.message})", error)
        if (isNetworkFailure(error)) {
            return ServiceException("Can't reach the server. Check your connection and try again.")
        }
        // Unexpected: name the exception on screen so a report can say what went wrong.
        return ServiceException("$fallback (${error::class.java.simpleName})")
    }

    private fun isNetworkFailure(error: Throwable): Boolean =
        generateSequence(error) { it.cause }.take(6).any {
            it is java.io.IOException || it::class.java.simpleName in NETWORK_EXCEPTIONS
        }

    private val NETWORK_EXCEPTIONS = setOf("HttpRequestException", "HttpRequestTimeoutException", "ConnectTimeoutException")

    suspend fun createMatch(size: Int, viewMode: ViewMode): MatchRow {
        val client = requireClient()
        return try {
            client.postgrest.rpc(
                "create_match",
                buildJsonObject {
                    put("p_board_size", size)
                    put("p_view_mode", if (viewMode == ViewMode.CUBE) "3D" else "2D")
                },
            ).decodeAs<MatchRow>()
        } catch (e: Exception) {
            throw messageFrom(e, "Couldn't create the room.")
        }
    }

    suspend fun joinMatch(code: String): MatchRow {
        val client = requireClient()
        return try {
            client.postgrest.rpc(
                "join_match_by_code",
                buildJsonObject { put("p_room_code", code.trim().uppercase()) },
            ).decodeAs<MatchRow>()
        } catch (e: Exception) {
            throw messageFrom(e, "Couldn't join that room.")
        }
    }

    override suspend fun fetch(id: String): MatchRow? =
        requireClient().from("matches").select { filter { eq("id", id) }; limit(1) }.decodeList<MatchRow>().firstOrNull()

    /** The player's newest unfinished match, for the "resume" banner. */
    suspend fun activeMatch(userId: String): MatchRow? {
        val client = clientProvider() ?: return null
        return runCatching {
            client.from("matches").select {
                filter {
                    or {
                        eq("host_id", userId)
                        eq("guest_id", userId)
                    }
                    isIn("status", listOf("waiting", "active"))
                }
                order("updated_at", Order.DESCENDING)
                limit(1)
            }.decodeList<MatchRow>().firstOrNull()
        }.getOrNull()
    }

    override suspend fun setPresence(id: String, connected: Boolean) {
        val client = clientProvider() ?: return
        runCatching {
            client.postgrest.rpc(
                "update_match_presence",
                buildJsonObject {
                    put("p_match_id", id)
                    put("p_connected", connected)
                },
            )
        }
    }

    /** Returns the server's authoritative row after a move. */
    override suspend fun submitMove(id: String, cellIndex: Int): MatchRow {
        val client = requireClient()
        return try {
            val response = client.functions.invoke(
                "submit-move",
                body = buildJsonObject {
                    put("matchId", id)
                    put("cellIndex", cellIndex)
                },
            )
            json.decodeFromString<MoveReply>(response.bodyAsText()).match
        } catch (e: Exception) {
            throw messageFrom(e, "Your move didn't go through.")
        }
    }

    override suspend fun forfeit(id: String): MatchRow {
        val client = requireClient()
        return try {
            client.postgrest.rpc("forfeit_match", buildJsonObject { put("p_match_id", id) }).decodeAs<MatchRow>()
        } catch (e: Exception) {
            throw messageFrom(e, "Couldn't leave the match.")
        }
    }

    override suspend fun username(userId: String): String? {
        val client = clientProvider() ?: return null
        return runCatching {
            client.from("profiles").select(io.github.jan.supabase.postgrest.query.Columns.list("username")) {
                filter { eq("id", userId) }
                limit(1)
            }.decodeList<UsernameRow>().firstOrNull()?.username
        }.getOrNull()
    }

    /** Postgres changes for one match row. Cancelling the collector removes the channel. */
    override fun events(id: String): Flow<MatchEvent> = callbackFlow {
        val client = clientProvider()
        if (client == null) {
            trySend(MatchEvent.Lost)
            close()
            return@callbackFlow
        }
        val channel = client.channel("match:$id")
        val changes = channel.postgresChangeFlow<PostgresAction.Update>(schema = "public") {
            table = "matches"
            filter("id", io.github.jan.supabase.postgrest.query.filter.FilterOperator.EQ, id)
        }
        val collector = launch {
            try {
                channel.subscribe(blockUntilSubscribed = true)
                trySend(MatchEvent.Subscribed)
            } catch (e: Exception) {
                if (e is CancellationException) throw e
                trySend(MatchEvent.Lost)
            }
            changes.collect { change ->
                runCatching { change.decodeRecord<MatchRow>() }.getOrNull()?.let { trySend(MatchEvent.Row(it)) }
            }
            trySend(MatchEvent.Lost)
        }
        awaitClose {
            collector.cancel()
            // The channel is removed off the collector's scope; it may already be gone.
            GlobalScope.launch { runCatching { client.realtime.removeChannel(channel) } }
        }
    }

    fun inviteLink(code: String): String = InviteLink.url(code)

    @Serializable
    private class MoveReply(val match: MatchRow)

    @Serializable
    private class UsernameRow(val username: String? = null)
}
