package com.twistedtac.app.backend

import com.twistedtac.engine.MatchStatus
import com.twistedtac.engine.ViewMode
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.functions.Functions
import io.github.jan.supabase.postgrest.Postgrest
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.client.engine.mock.toByteArray
import io.ktor.client.request.HttpRequestData
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.headersOf
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlin.test.fail

/**
 * Runs the real MatchService against a fake Supabase server, so what the app sends and how it reads
 * the reply can be checked without a device.
 */
class MatchServiceTest {
    // A row as PostgREST returns public.matches (all columns, including ones the app doesn't read).
    private val waitingRow = """
        {"id":"7b0f6a52-0000-4000-8000-000000000001","room_code":"K7M2QX","host_id":"u-host","guest_id":null,
         "status":"waiting","config":{"size":3,"viewMode":"3D"},
         "board":[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
         "layer_winners":[{"winner":null,"line":null},{"winner":null,"line":null},{"winner":null,"line":null}],
         "is_x_next":true,"host_plays_x":true,"winner":null,"draw":false,"current_turn_user_id":null,
         "host_disconnected_at":null,"guest_disconnected_at":null,"host_last_seen_at":"2026-10-29T17:58:19.1+00:00",
         "guest_last_seen_at":null,"abandon_reason":null,"created_at":"2026-10-29T17:58:19.123456+00:00",
         "updated_at":"2026-10-29T17:58:19.123456+00:00","revision":0,"extra_future_column":"ignored"}
    """.trimIndent()

    private var seen: HttpRequestData? = null
    private var seenBody = ""

    private fun client(status: HttpStatusCode = HttpStatusCode.OK, body: String = waitingRow): SupabaseClient {
        val engine = MockEngine { request ->
            seen = request
            seenBody = request.body.toByteArray().decodeToString()
            respond(body, status, headersOf(HttpHeaders.ContentType, "application/json"))
        }
        return createSupabaseClient("https://example.supabase.co", "sb_publishable_test") {
            httpEngine = engine
            install(Postgrest)
            install(Functions)
        }
    }

    @After
    fun reset() {
        MatchService.clientProvider = { Backend.client }
    }

    @Test
    fun `creating a room posts the board and view mode and reads the new match`() = runBlocking {
        MatchService.clientProvider = { client() }
        val match = MatchService.createMatch(3, ViewMode.CUBE)

        assertEquals("K7M2QX", match.roomCode)
        assertEquals(MatchStatus.WAITING, match.status)
        assertEquals(27, match.board.size)
        val request = seen ?: fail("nothing was sent")
        assertEquals("POST", request.method.value)
        assertTrue(request.url.encodedPath.endsWith("/rest/v1/rpc/create_match"), request.url.encodedPath)
        assertTrue("\"p_board_size\":3" in seenBody && "\"p_view_mode\":\"3D\"" in seenBody, seenBody)
    }

    @Test
    fun `joining a room sends the code upper-cased`() = runBlocking {
        MatchService.clientProvider = { client() }
        MatchService.joinMatch(" k7m2qx ")
        val request = seen ?: fail("nothing was sent")
        assertTrue(request.url.encodedPath.endsWith("/rest/v1/rpc/join_match_by_code"))
        assertTrue("\"p_room_code\":\"K7M2QX\"" in seenBody, seenBody)
    }

    @Test
    fun `a server message like Room full is shown as is`() = runBlocking {
        MatchService.clientProvider = {
            client(HttpStatusCode.BadRequest, """{"code":"P0001","message":"Room full","details":null,"hint":null}""")
        }
        val error = runCatching { MatchService.joinMatch("K7M2QX") }.exceptionOrNull()
        assertEquals("Room full", error?.message)
    }

    @Test
    fun `submitting a move reads the match from the function reply`() = runBlocking {
        MatchService.clientProvider = { client(body = """{"match":$waitingRow}""") }
        val match = MatchService.submitMove("7b0f6a52-0000-4000-8000-000000000001", 4)
        assertEquals("K7M2QX", match.roomCode)
        val request = seen ?: fail("nothing was sent")
        assertTrue(request.url.encodedPath.endsWith("/functions/v1/submit-move"), request.url.encodedPath)
        assertTrue("\"cellIndex\":4" in seenBody && "\"matchId\"" in seenBody, seenBody)
    }

    @Test
    fun `fetching a match decodes the row`() = runBlocking {
        MatchService.clientProvider = { client(body = "[$waitingRow]") }
        assertEquals("K7M2QX", MatchService.fetch("7b0f6a52-0000-4000-8000-000000000001")?.roomCode)
    }
}

class MatchServiceFailureTest {
    private fun failingClient(failure: () -> Throwable): SupabaseClient {
        val engine = MockEngine { throw failure() }
        return createSupabaseClient("https://example.supabase.co", "sb_publishable_test") {
            httpEngine = engine
            install(Postgrest)
        }
    }

    @After
    fun reset() {
        MatchService.clientProvider = { Backend.client }
    }

    @Test
    fun `a dropped connection says the server can't be reached`() = runBlocking {
        MatchService.clientProvider = { failingClient { java.net.SocketTimeoutException("timeout") } }
        val error = runCatching { MatchService.createMatch(3, ViewMode.CUBE) }.exceptionOrNull()
        assertEquals("Can't reach the server. Check your connection and try again.", error?.message)
    }

    @Test
    fun `a reply the app can't read names the problem on screen`() = runBlocking {
        val engine = MockEngine { respond("""{"unexpected":"shape"}""", HttpStatusCode.OK, headersOf(HttpHeaders.ContentType, "application/json")) }
        MatchService.clientProvider = {
            createSupabaseClient("https://example.supabase.co", "sb_publishable_test") {
                httpEngine = engine
                install(Postgrest)
            }
        }
        val error = runCatching { MatchService.joinMatch("K7M2QX") }.exceptionOrNull()
        assertTrue(error?.message.orEmpty().startsWith("Couldn't join that room. ("), error?.message)
    }
}
