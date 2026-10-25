import Foundation
import Supabase
import TwistedTacKit

/// Server calls for online matches, mirroring src/services/matchService.ts.
/// Moves go through the `submit-move` edge function, which re-validates them
/// with the same rules engine; everything else is a security-definer RPC.
enum MatchService {
    struct ServiceError: LocalizedError {
        let message: String
        var errorDescription: String? { message }
    }

    private static func requireClient() throws -> SupabaseClient {
        guard let client = Backend.client else { throw ServiceError(message: "No backend connection.") }
        return client
    }

    /// Postgres raises plain-English messages ("Room full"); show those and
    /// hide transport noise.
    private static func message(from error: Error, fallback: String) -> ServiceError {
        if let functions = error as? FunctionsError, case let .httpError(_, data) = functions,
           let body = try? JSONDecoder().decode([String: String].self, from: data), let text = body["error"] {
            return ServiceError(message: text)
        }
        if let postgrest = error as? PostgrestError, !postgrest.message.isEmpty {
            return ServiceError(message: postgrest.message)
        }
        return ServiceError(message: fallback)
    }

    static func createMatch(size: Int, viewMode: ViewMode) async throws -> MatchRow {
        let client = try requireClient()
        do {
            return try await client
                .rpc("create_match", params: CreateParams(p_board_size: size, p_view_mode: viewMode.rawValue))
                .execute().value
        } catch { throw message(from: error, fallback: "Couldn't create the room.") }
    }

    static func joinMatch(code: String) async throws -> MatchRow {
        let client = try requireClient()
        do {
            return try await client
                .rpc("join_match_by_code", params: ["p_room_code": code.uppercased().trimmingCharacters(in: .whitespaces)])
                .execute().value
        } catch { throw message(from: error, fallback: "Couldn't join that room.") }
    }

    static func fetchMatch(id: String) async throws -> MatchRow? {
        let client = try requireClient()
        let rows: [MatchRow] = try await client.from("matches").select().eq("id", value: id).limit(1).execute().value
        return rows.first
    }

    /// The player's newest unfinished match, for the "resume" banner.
    static func activeMatch(for userID: String) async -> MatchRow? {
        guard let client = Backend.client else { return nil }
        let rows: [MatchRow]? = try? await client.from("matches")
            .select()
            .or("host_id.eq.\(userID),guest_id.eq.\(userID)")
            .in("status", values: ["waiting", "active"])
            .order("updated_at", ascending: false)
            .limit(1)
            .execute().value
        return rows?.first
    }

    static func setPresence(matchID: String, connected: Bool) async {
        guard let client = Backend.client else { return }
        _ = try? await client.rpc("update_match_presence", params: PresenceParams(p_match_id: matchID, p_connected: connected)).execute()
    }

    /// Returns the server's authoritative row after a move.
    static func submitMove(matchID: String, cellIndex: Int) async throws -> MatchRow {
        let client = try requireClient()
        nonisolated struct Reply: Decodable { let match: MatchRow }
        do {
            let reply: Reply = try await client.functions.invoke(
                "submit-move",
                options: FunctionInvokeOptions(body: MoveBody(matchId: matchID, cellIndex: cellIndex))
            )
            return reply.match
        } catch { throw message(from: error, fallback: "Your move didn't go through.") }
    }

    static func forfeit(matchID: String) async throws -> MatchRow {
        let client = try requireClient()
        do {
            return try await client.rpc("forfeit_match", params: ["p_match_id": matchID]).execute().value
        } catch { throw message(from: error, fallback: "Couldn't leave the match.") }
    }

    static func username(of userID: String) async -> String? {
        guard let client = Backend.client else { return nil }
        nonisolated struct Row: Decodable { let username: String? }
        let rows: [Row]? = try? await client.from("profiles").select("username").eq("id", value: userID).limit(1).execute().value
        return rows?.first?.username
    }

    static func inviteLink(code: String) -> URL {
        URL(string: "https://twistedtac.com/join/\(code)")!
    }

    private nonisolated struct CreateParams: Encodable { let p_board_size: Int; let p_view_mode: String }
    private nonisolated struct PresenceParams: Encodable { let p_match_id: String; let p_connected: Bool }
    private nonisolated struct MoveBody: Encodable { let matchId: String; let cellIndex: Int }
}
