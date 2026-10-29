package com.twistedtac.engine

import java.time.Instant
import kotlin.math.abs
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlinx.serialization.json.Json

private val json = Json { ignoreUnknownKeys = true }

class InviteLinkTest {
    @Test
    fun `accepts invite links`() {
        listOf(
            "https://twistedtac.com/join/K7M2QX",
            "https://www.twistedtac.com/join/k7m2qx",
            "https://twistedtac.com/join/K7M2QX/",
            "twistedtac://join/K7M2QX",
        ).forEach { assertEquals("K7M2QX", InviteLink.roomCode(it), it) }
    }

    @Test
    fun `rejects everything else`() {
        listOf(
            "https://evil.example/join/K7M2QX",
            "https://twistedtac.com/play/K7M2QX",
            "https://twistedtac.com/join/SHORT",
            "https://twistedtac.com/join/TOOLONGCODE",
            "https://twistedtac.com/join/K7M2Q;",
            "https://twistedtac.com/",
            "twistedtac://play/K7M2QX",
            "mailto:a@b.c",
        ).forEach { assertNull(InviteLink.roomCode(it), it) }
    }

    @Test
    fun `builds the shareable link`() {
        assertEquals("https://www.twistedtac.com/join/K7M2QX", InviteLink.url("k7m2qx"))
        // What we share must be a link we recognise.
        assertEquals("K7M2QX", InviteLink.roomCode(InviteLink.url("k7m2qx")))
    }
}

class OnlineRulesTest {
    @Test
    fun `rank points match the server`() {
        assertEquals(25, OnlineScoring.points(RankOutcome.WIN))
        assertEquals(5, OnlineScoring.points(RankOutcome.DRAW))
        assertEquals(-5, OnlineScoring.points(RankOutcome.LOSS))
    }

    @Test
    fun `parses Postgres timestamps`() {
        listOf(
            "2026-10-25T10:24:21+00:00",
            "2026-10-25T10:24:21Z",
            "2026-10-25T10:24:21.123+00:00",
            "2026-10-25T10:24:21.123456+00:00",
            "2026-10-25T15:54:21.987654+05:30",
        ).forEach { assertNotNull(MatchTimestamp.parse(it), it) }
    }

    @Test
    fun `rejects garbage timestamps`() {
        assertNull(MatchTimestamp.parse("not a date"))
        assertNull(MatchTimestamp.parse(""))
    }

    @Test
    fun `microsecond and offset forms agree`() {
        val utc = assertNotNull(MatchTimestamp.parse("2026-10-25T10:24:21.500000+00:00"))
        val ist = assertNotNull(MatchTimestamp.parse("2026-10-25T15:54:21.500000+05:30"))
        assertTrue(abs(utc.toEpochMilli() - ist.toEpochMilli()) < 1)
    }

    @Test
    fun `forfeit timer counts down from ten minutes`() {
        val start = assertNotNull(MatchTimestamp.parse("2026-10-25T10:00:00+00:00"))
        val now = start.plusSeconds(125)
        val left = assertNotNull(DisconnectTimeout.remaining("2026-10-25T10:00:00+00:00", now))
        assertEquals(475.0, left)
        assertEquals("7:55", DisconnectTimeout.format(left))
    }

    @Test
    fun `timer never goes negative and is null when connected`() {
        val start = assertNotNull(MatchTimestamp.parse("2026-10-25T10:00:00+00:00"))
        val late: Instant = start.plusSeconds(3600)
        assertEquals(0.0, DisconnectTimeout.remaining("2026-10-25T10:00:00+00:00", late))
        assertNull(DisconnectTimeout.remaining(null))
        assertEquals("0:00", DisconnectTimeout.format(0.0))
        assertEquals("1:05", DisconnectTimeout.format(65.0))
    }
}

class ProfileTest {
    @Test
    fun `accepts valid usernames`() {
        listOf("abc", "Player_1", "a_b_c_d_e_f_g_h_i_j", "ZZZ", "x1y2z3")
            .forEach { assertTrue(UsernameRules.isValid(it), it) }
    }

    @Test
    fun `rejects invalid usernames`() {
        listOf("", "ab", "has space", "dash-ed", "émile", "twenty_one_chars_long", "emoji🙂ok", "semi;colon")
            .forEach { assertFalse(UsernameRules.isValid(it), it) }
    }

    @Test
    fun `length bounds are 3 and 20`() {
        assertTrue(UsernameRules.isValid("a".repeat(20)))
        assertFalse(UsernameRules.isValid("a".repeat(21)))
        assertFalse(UsernameRules.isValid("a".repeat(2)))
    }

    @Test
    fun `avatar URLs must be http or https`() {
        assertTrue(isSafeAvatarUrl(""))
        assertTrue(isSafeAvatarUrl("  https://example.com/a.png "))
        assertTrue(isSafeAvatarUrl("http://example.com/a.png"))
        assertFalse(isSafeAvatarUrl("javascript:alert(1)"))
        assertFalse(isSafeAvatarUrl("file:///etc/passwd"))
        assertFalse(isSafeAvatarUrl("not a url"))
    }

    @Test
    fun `decodes a profiles row`() {
        val text = """
            {"id":"u1","username":"neon","display_name":null,"avatar_url":"https://x/y.png",
             "points":120,"wins":5,"losses":2,"draws":1,"games_played":8}
        """
        val profile = json.decodeFromString<Profile>(text)
        assertEquals("neon", profile.username)
        assertEquals(120, profile.points)
        assertEquals(8, profile.gamesPlayed)
        assertFalse(profile.needsUsername)
        assertEquals(0.625, profile.winRate)
    }

    @Test
    fun `a profile with no username needs onboarding`() {
        val text = """{"id":"u2","username":null,"display_name":"Pat","avatar_url":null,"points":0,"wins":0,"losses":0,"draws":0,"games_played":0}"""
        val profile = json.decodeFromString<Profile>(text)
        assertTrue(profile.needsUsername)
        assertNull(profile.winRate)
    }
}

private fun row(
    id: String = "m1",
    revision: Int = 1,
    board: Board = List(27) { null },
    status: MatchStatus = MatchStatus.ACTIVE,
    guestDisconnectedAt: String? = null,
) = MatchRow(
    id = id, roomCode = "ABC234", hostId = "h", guestId = "g", status = status,
    config = MatchConfig(3, ViewMode.CUBE), board = board, layerWinners = emptyList(),
    isXNext = true, hostPlaysX = true, winner = null, draw = false, currentTurnUserId = "h",
    hostDisconnectedAt = null, guestDisconnectedAt = guestDisconnectedAt,
    hostLastSeenAt = null, guestLastSeenAt = null, abandonReason = null,
    createdAt = "", updatedAt = "", revision = revision,
)

// Ported from src/utils/matchMerge.test.ts.
class MatchMergeTest {
    @Test
    fun `takes a higher revision wholesale`() {
        val next = row(revision = 2, status = MatchStatus.FINISHED)
        assertEquals(next, mergeMatch(row(), next))
    }

    @Test
    fun `ignores a stale revision`() {
        val current = row(revision = 3)
        assertEquals(current, mergeMatch(current, row(revision = 2, guestDisconnectedAt = "x")))
    }

    @Test
    fun `applies a same-revision disconnect without touching the board`() {
        val board = MutableList<Player?>(27) { null }.also { it[4] = Player.X }
        val merged = mergeMatch(row(board = board), row(guestDisconnectedAt = "2026-01-01T00:00:00Z"))
        assertEquals("2026-01-01T00:00:00Z", merged?.guestDisconnectedAt)
        assertEquals(board, merged?.board)
    }

    @Test
    fun `keeps the current row when nothing changed`() {
        val current = row()
        assertEquals(current, mergeMatch(current, row()))
    }

    @Test
    fun `adopts a different match outright`() {
        val next = row(id = "m2")
        assertEquals(next, mergeMatch(row(), next))
    }

    @Test
    fun `a null incoming row keeps the current one`() {
        val current = row()
        assertEquals(current, mergeMatch(current, null))
    }

    @Test
    fun `decodes a server row`() {
        val text = """
            {"id":"m1","room_code":"ABC234","host_id":"h","guest_id":null,"status":"waiting",
             "config":{"size":3,"viewMode":"3D"},"board":[null,"X","O"],"layer_winners":[{"winner":null,"line":null}],
             "is_x_next":true,"host_plays_x":true,"winner":null,"draw":false,"current_turn_user_id":"h",
             "host_disconnected_at":null,"guest_disconnected_at":null,"host_last_seen_at":null,
             "guest_last_seen_at":null,"abandon_reason":null,"created_at":"a","updated_at":"b","revision":0}
        """
        val match = json.decodeFromString<MatchRow>(text)
        assertEquals(MatchStatus.WAITING, match.status)
        assertEquals(listOf(null, Player.X, Player.O), match.board)
        assertEquals(27, match.config.rulesConfig?.cellCount)
        assertEquals(Player.X, match.symbol("h"))
        assertNull(match.userId(Player.O))
    }
}
