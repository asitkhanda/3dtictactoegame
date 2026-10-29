// Row shape of public.matches plus the client-side merge rule, ported from
// MatchModels.swift, src/types/database.ts and src/utils/matchMerge.ts.

package com.twistedtac.engine

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
enum class MatchStatus {
    @SerialName("waiting") WAITING,
    @SerialName("active") ACTIVE,
    @SerialName("finished") FINISHED,
    @SerialName("abandoned") ABANDONED,
}

@Serializable
data class MatchConfig(val size: Int, val viewMode: ViewMode) {
    /** Null when the server sent a size outside 1..8. */
    val rulesConfig: GameRulesConfig? get() = GameRulesConfig.of(size, viewMode)
}

@Serializable
data class MatchRow(
    val id: String,
    @SerialName("room_code") val roomCode: String,
    @SerialName("host_id") val hostId: String,
    @SerialName("guest_id") val guestId: String? = null,
    val status: MatchStatus,
    val config: MatchConfig,
    val board: Board,
    @SerialName("layer_winners") val layerWinners: List<LayerResult>,
    @SerialName("is_x_next") val isXNext: Boolean,
    @SerialName("host_plays_x") val hostPlaysX: Boolean,
    val winner: Player? = null,
    val draw: Boolean,
    @SerialName("current_turn_user_id") val currentTurnUserId: String? = null,
    @SerialName("host_disconnected_at") val hostDisconnectedAt: String? = null,
    @SerialName("guest_disconnected_at") val guestDisconnectedAt: String? = null,
    @SerialName("host_last_seen_at") val hostLastSeenAt: String? = null,
    @SerialName("guest_last_seen_at") val guestLastSeenAt: String? = null,
    @SerialName("abandon_reason") val abandonReason: String? = null,
    @SerialName("created_at") val createdAt: String,
    @SerialName("updated_at") val updatedAt: String,
    val revision: Int,
) {
    fun symbol(userId: String): Player {
        val isHost = userId == hostId
        return if (isHost == hostPlaysX) Player.X else Player.O
    }

    fun userId(symbol: Player): String? =
        if ((symbol == Player.X) == hostPlaysX) hostId else guestId
}

/**
 * Decides which copy of a match the client keeps.
 *
 * Moves, joins and settlements bump `revision`, so a higher revision always
 * wins. Presence heartbeats deliberately do not (a bump would invalidate
 * in-flight moves), so at the same revision only the presence fields are taken
 * from the incoming row — the board stays as the client has it.
 */
fun mergeMatch(current: MatchRow?, next: MatchRow?): MatchRow? {
    if (next == null) return current
    if (current == null || current.id != next.id) return next
    if (next.revision > current.revision) return next
    if (next.revision < current.revision) return current

    if (current.hostDisconnectedAt == next.hostDisconnectedAt &&
        current.guestDisconnectedAt == next.guestDisconnectedAt
    ) return current

    return current.copy(
        hostDisconnectedAt = next.hostDisconnectedAt,
        guestDisconnectedAt = next.guestDisconnectedAt,
        hostLastSeenAt = next.hostLastSeenAt,
        guestLastSeenAt = next.guestLastSeenAt,
    )
}
