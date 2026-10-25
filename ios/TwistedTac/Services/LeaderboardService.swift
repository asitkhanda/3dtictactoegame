import Foundation
import Supabase
import TwistedTacKit

struct LeaderboardResult {
    var entries: [LeaderboardEntry]
    /// The signed-in player's place, or nil if they haven't played ranked yet.
    var userRank: Int?
}

/// Same queries as src/hooks/useLeaderboard.ts: top 10 by points, then wins,
/// then id for a stable order; players with no games don't appear.
enum LeaderboardService {
    private static let columns = "id, username, avatar_url, points, wins, losses, draws, games_played"

    static func load(for userID: String?) async throws -> LeaderboardResult {
        guard let client = Backend.client else { throw LeaderboardError.notConfigured }

        let entries: [LeaderboardEntry] = try await client.from("profiles")
            .select(columns)
            .not("username", operator: .is, value: "null")
            .gt("games_played", value: 0)
            .order("points", ascending: false)
            .order("wins", ascending: false)
            .order("id", ascending: true)
            .limit(10)
            .execute()
            .value

        var rank: Int?
        if let userID {
            let mine: [LeaderboardEntry] = try await client.from("profiles")
                .select(columns)
                .eq("id", value: userID)
                .limit(1)
                .execute()
                .value
            if let me = mine.first, me.username != nil, me.gamesPlayed > 0 {
                let ahead = try await client.from("profiles")
                    .select("*", head: true, count: .exact)
                    .not("username", operator: .is, value: "null")
                    .gt("games_played", value: 0)
                    .or("points.gt.\(me.points),and(points.eq.\(me.points),wins.gt.\(me.wins))")
                    .execute()
                    .count
                rank = (ahead ?? 0) + 1
            }
        }
        return LeaderboardResult(entries: entries, userRank: rank)
    }
}

enum LeaderboardError: LocalizedError {
    case notConfigured

    var errorDescription: String? {
        "The leaderboard needs a backend connection, and this build has none."
    }
}
