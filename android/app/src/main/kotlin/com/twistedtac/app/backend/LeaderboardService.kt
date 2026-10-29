package com.twistedtac.app.backend

import com.twistedtac.engine.LeaderboardEntry
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import io.github.jan.supabase.postgrest.query.Count
import io.github.jan.supabase.postgrest.query.Order
import io.github.jan.supabase.postgrest.query.filter.FilterOperator

class LeaderboardResult(
    val entries: List<LeaderboardEntry>,
    /** The signed-in player's place, or null if they haven't played ranked yet. */
    val userRank: Int?,
)

/**
 * Same queries as src/hooks/useLeaderboard.ts: top 10 by points, then wins, then
 * id for a stable order; players with no games don't appear.
 */
object LeaderboardService {
    private val columns = Columns.list("id", "username", "avatar_url", "points", "wins", "losses", "draws", "games_played")

    suspend fun load(userId: String?): LeaderboardResult {
        val client = Backend.client ?: throw ServiceException("The leaderboard needs a backend connection, and this build has none.")

        val entries = client.from("profiles").select(columns) {
            filter {
                filterNot("username", FilterOperator.IS, "null")
                gt("games_played", 0)
            }
            order("points", Order.DESCENDING)
            order("wins", Order.DESCENDING)
            order("id", Order.ASCENDING)
            limit(10)
        }.decodeList<LeaderboardEntry>()

        var rank: Int? = null
        if (userId != null) {
            val me = client.from("profiles").select(columns) {
                filter { eq("id", userId) }
                limit(1)
            }.decodeList<LeaderboardEntry>().firstOrNull()
            if (me != null && me.username != null && me.gamesPlayed > 0) {
                val ahead = client.from("profiles").select(Columns.list("id")) {
                    count(Count.EXACT)
                    limit(1)
                    filter {
                        filterNot("username", FilterOperator.IS, "null")
                        gt("games_played", 0)
                        or {
                            gt("points", me.points)
                            and {
                                eq("points", me.points)
                                gt("wins", me.wins)
                            }
                        }
                    }
                }.countOrNull() ?: 0
                rank = (ahead + 1).toInt()
            }
        }
        return LeaderboardResult(entries, rank)
    }
}
