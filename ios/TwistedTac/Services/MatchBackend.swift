import Foundation
import Supabase
import TwistedTacKit

/// What the realtime channel reports about one match.
enum MatchEvent {
    /// The channel is connected; fetch once so nothing from the gap is missed.
    case subscribed
    case row(MatchRow)
    /// The channel dropped; the client will keep trying to reconnect.
    case lost
}

/// The server surface an online match needs. The live implementation talks to
/// Supabase; tests and debug previews use a scripted fake.
protocol MatchBackend: AnyObject {
    func fetch(id: String) async throws -> MatchRow?
    func submitMove(id: String, cellIndex: Int) async throws -> MatchRow
    func forfeit(id: String) async throws -> MatchRow
    func setPresence(id: String, connected: Bool) async
    func username(of userID: String) async -> String?
    func events(for id: String) -> AsyncStream<MatchEvent>
}

final class LiveMatchBackend: MatchBackend {
    func fetch(id: String) async throws -> MatchRow? { try await MatchService.fetchMatch(id: id) }
    func submitMove(id: String, cellIndex: Int) async throws -> MatchRow {
        try await MatchService.submitMove(matchID: id, cellIndex: cellIndex)
    }
    func forfeit(id: String) async throws -> MatchRow { try await MatchService.forfeit(matchID: id) }
    func setPresence(id: String, connected: Bool) async { await MatchService.setPresence(matchID: id, connected: connected) }
    func username(of userID: String) async -> String? { await MatchService.username(of: userID) }

    /// Postgres changes for one match row. Cancelling the consumer removes the channel.
    func events(for id: String) -> AsyncStream<MatchEvent> {
        AsyncStream { continuation in
            guard let client = Backend.client else {
                continuation.yield(.lost)
                continuation.finish()
                return
            }
            let channel = client.channel("match:\(id)")
            let changes = channel.postgresChange(UpdateAction.self, schema: "public", table: "matches", filter: "id=eq.\(id)")
            let task = Task {
                do {
                    try await channel.subscribeWithError()
                    continuation.yield(.subscribed)
                } catch {
                    continuation.yield(.lost)
                }
                for await change in changes {
                    if let row = try? change.decodeRecord(as: MatchRow.self, decoder: JSONDecoder()) {
                        continuation.yield(.row(row))
                    }
                }
                continuation.yield(.lost)
                continuation.finish()
            }
            continuation.onTermination = { _ in
                task.cancel()
                Task { await client.removeChannel(channel) }
            }
        }
    }
}
