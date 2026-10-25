// Row shape of public.matches plus the client-side merge rule, ported from
// src/types/database.ts and src/utils/matchMerge.ts.

public enum MatchStatus: String, Codable, Sendable {
    case waiting, active, finished, abandoned
}

public struct MatchConfig: Codable, Sendable, Hashable {
    public var size: Int
    public var viewMode: ViewMode

    public init(size: Int, viewMode: ViewMode) {
        self.size = size
        self.viewMode = viewMode
    }

    /// Nil when the server sent a size outside 1...8.
    public var rulesConfig: GameRulesConfig? { GameRulesConfig(size: size, viewMode: viewMode) }
}

public struct MatchRow: Codable, Sendable, Hashable, Identifiable {
    public var id: String
    public var roomCode: String
    public var hostId: String
    public var guestId: String?
    public var status: MatchStatus
    public var config: MatchConfig
    public var board: Board
    public var layerWinners: [LayerResult]
    public var isXNext: Bool
    public var hostPlaysX: Bool
    public var winner: Player?
    public var draw: Bool
    public var currentTurnUserId: String?
    public var hostDisconnectedAt: String?
    public var guestDisconnectedAt: String?
    public var hostLastSeenAt: String?
    public var guestLastSeenAt: String?
    public var abandonReason: String?
    public var createdAt: String
    public var updatedAt: String
    public var revision: Int

    enum CodingKeys: String, CodingKey {
        case id, status, config, board, winner, draw, revision
        case roomCode = "room_code"
        case hostId = "host_id"
        case guestId = "guest_id"
        case layerWinners = "layer_winners"
        case isXNext = "is_x_next"
        case hostPlaysX = "host_plays_x"
        case currentTurnUserId = "current_turn_user_id"
        case hostDisconnectedAt = "host_disconnected_at"
        case guestDisconnectedAt = "guest_disconnected_at"
        case hostLastSeenAt = "host_last_seen_at"
        case guestLastSeenAt = "guest_last_seen_at"
        case abandonReason = "abandon_reason"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

public extension MatchRow {
    func symbol(for userId: String) -> Player {
        let isHost = userId == hostId
        return isHost == hostPlaysX ? .x : .o
    }

    func userId(for symbol: Player) -> String? {
        (symbol == .x) == hostPlaysX ? hostId : guestId
    }
}

/// Decides which copy of a match the client keeps.
///
/// Moves, joins and settlements bump `revision`, so a higher revision always
/// wins. Presence heartbeats deliberately do not (a bump would invalidate
/// in-flight moves), so at the same revision only the presence fields are taken
/// from the incoming row — the board stays as the client has it.
public func mergeMatch(current: MatchRow?, next: MatchRow?) -> MatchRow? {
    guard let next else { return current }
    guard let current, current.id == next.id else { return next }
    if next.revision > current.revision { return next }
    if next.revision < current.revision { return current }

    if current.hostDisconnectedAt == next.hostDisconnectedAt,
       current.guestDisconnectedAt == next.guestDisconnectedAt {
        return current
    }
    var merged = current
    merged.hostDisconnectedAt = next.hostDisconnectedAt
    merged.guestDisconnectedAt = next.guestDisconnectedAt
    merged.hostLastSeenAt = next.hostLastSeenAt
    merged.guestLastSeenAt = next.guestLastSeenAt
    return merged
}
