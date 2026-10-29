// Row shapes of public.profiles plus the username rules, ported from
// Profile.swift, src/types/database.ts, src/utils/profileValidation.ts and
// UsernameOnboardingModal.tsx.

package com.twistedtac.engine

import java.net.URI
import java.net.URISyntaxException
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Profile(
    val id: String,
    val username: String? = null,
    @SerialName("display_name") val displayName: String? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null,
    val points: Int = 0,
    val wins: Int = 0,
    val losses: Int = 0,
    val draws: Int = 0,
    @SerialName("games_played") val gamesPlayed: Int = 0,
) {
    /** Signed in but hasn't picked a username yet. */
    val needsUsername: Boolean get() = username.isNullOrEmpty()

    /** Wins as a share of games played, 0..1. Null before the first game. */
    val winRate: Double? get() = if (gamesPlayed > 0) wins.toDouble() / gamesPlayed else null
}

/** One leaderboard row. The leaderboard query selects the same columns the web app does. */
typealias LeaderboardEntry = Profile

object UsernameRules {
    const val MIN_LENGTH = 3
    const val MAX_LENGTH = 20
    const val REQUIREMENT = "Use 3–20 characters: letters, numbers, underscore."

    /** `^[a-zA-Z0-9_]{3,20}$` — also enforced by the database. */
    fun isValid(username: String): Boolean {
        if (username.length !in MIN_LENGTH..MAX_LENGTH) return false
        return username.all { it in '0'..'9' || it in 'A'..'Z' || it in 'a'..'z' || it == '_' }
    }
}

/** Port of isSafeAvatarUrl: only http(s) URLs are ever loaded. */
fun isSafeAvatarUrl(value: String): Boolean {
    val trimmed = value.trim()
    if (trimmed.isEmpty()) return true
    val scheme = try {
        URI(trimmed).scheme?.lowercase()
    } catch (_: URISyntaxException) {
        null
    } ?: return false
    return scheme == "https" || scheme == "http"
}
