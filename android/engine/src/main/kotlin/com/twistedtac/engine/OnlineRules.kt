// Online-play rules shared with the web app: rank points
// (src/services/scoreService.ts) and the disconnect forfeit timer
// (formatForfeitCountdown in OnlinePage / settle-stale-matches).
// Ported from OnlineRules.swift and InviteLink.swift.

package com.twistedtac.engine

import java.net.URI
import java.net.URISyntaxException
import java.time.Duration
import java.time.Instant
import java.time.OffsetDateTime
import java.time.format.DateTimeParseException
import java.util.Locale

enum class RankOutcome { WIN, DRAW, LOSS }

object OnlineScoring {
    /** Points a finished online match is worth. Local games are unranked. */
    fun points(outcome: RankOutcome): Int = when (outcome) {
        RankOutcome.WIN -> 25
        RankOutcome.DRAW -> 5
        RankOutcome.LOSS -> -5
    }
}

object MatchTimestamp {
    /**
     * Parses Postgres timestamptz text such as `2026-10-25T10:24:21.123456+00:00`,
     * with or without fractional seconds. Null when it isn't a timestamp.
     */
    fun parse(text: String): Instant? = try {
        OffsetDateTime.parse(text).toInstant()
    } catch (_: DateTimeParseException) {
        null
    }
}

object DisconnectTimeout {
    /** How long a player can stay gone before the opponent wins by forfeit. */
    const val DURATION_SECONDS = 10.0 * 60

    /** Seconds left on the forfeit timer, or null when the opponent is connected. */
    fun remaining(disconnectedAt: String?, now: Instant = Instant.now()): Double? {
        val start = disconnectedAt?.let(MatchTimestamp::parse) ?: return null
        val deadline = start.plusMillis((DURATION_SECONDS * 1000).toLong())
        val left = Duration.between(now, deadline).toMillis() / 1000.0
        return maxOf(0.0, left)
    }

    /** `m:ss`, as shown in the "opponent disconnected" banner. */
    fun format(seconds: Double): String {
        val total = seconds.toInt()
        return "${total / 60}:" + String.format(Locale.ROOT, "%02d", total % 60)
    }
}

/**
 * Room invite links, as shared from the waiting room:
 * `https://www.twistedtac.com/join/ABC123`, plus a `twistedtac://join/ABC123`
 * scheme used for development and as a fallback.
 *
 * Links are shared on `www` because the apex domain redirects there, and the
 * platform only verifies the app's claim on a host that serves its association
 * file directly, with no redirect. The apex is still accepted when received.
 */
object InviteLink {
    const val CANONICAL_HOST = "www.twistedtac.com"
    val hosts = setOf("twistedtac.com", CANONICAL_HOST)
    const val SCHEME = "twistedtac"

    /** The room code in [url], upper-cased, or null if it isn't an invite. */
    fun roomCode(url: String): String? {
        val uri = try {
            URI(url)
        } catch (_: URISyntaxException) {
            return null
        }
        val scheme = uri.scheme?.lowercase()
        val parts = (uri.path ?: "").split('/').filter { it.isNotEmpty() }
        val candidate = when (scheme) {
            "https", "http" -> {
                val host = uri.host?.lowercase() ?: return null
                if (host !in hosts) return null
                if (parts.size == 2 && parts[0].lowercase() == "join") parts[1] else null
            }
            // twistedtac://join/ABC123 puts "join" in the host position.
            SCHEME -> if (uri.host?.lowercase() == "join" && parts.size == 1) parts[0] else null
            else -> return null
        }
        if (candidate == null || candidate.length != 6) return null
        if (!candidate.all { it.code < 128 && it.isLetterOrDigit() }) return null
        return candidate.uppercase()
    }

    fun url(code: String): String = "https://$CANONICAL_HOST/join/${code.uppercase()}"
}
