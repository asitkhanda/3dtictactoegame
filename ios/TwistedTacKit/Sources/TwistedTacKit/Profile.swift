import Foundation

// Row shapes of public.profiles plus the username rules, ported from
// src/types/database.ts, src/utils/profileValidation.ts and
// UsernameOnboardingModal.tsx.

public struct Profile: Codable, Sendable, Hashable, Identifiable {
    public var id: String
    public var username: String?
    public var displayName: String?
    public var avatarURL: String?
    public var points: Int
    public var wins: Int
    public var losses: Int
    public var draws: Int
    public var gamesPlayed: Int

    public init(
        id: String, username: String? = nil, displayName: String? = nil, avatarURL: String? = nil,
        points: Int = 0, wins: Int = 0, losses: Int = 0, draws: Int = 0, gamesPlayed: Int = 0
    ) {
        self.id = id
        self.username = username
        self.displayName = displayName
        self.avatarURL = avatarURL
        self.points = points
        self.wins = wins
        self.losses = losses
        self.draws = draws
        self.gamesPlayed = gamesPlayed
    }

    enum CodingKeys: String, CodingKey {
        case id, username, points, wins, losses, draws
        case displayName = "display_name"
        case avatarURL = "avatar_url"
        case gamesPlayed = "games_played"
    }

    /// Signed in but hasn't picked a username yet.
    public var needsUsername: Bool { username?.isEmpty ?? true }

    /// Wins as a share of games played, 0...1. Nil before the first game.
    public var winRate: Double? {
        gamesPlayed > 0 ? Double(wins) / Double(gamesPlayed) : nil
    }
}

/// One leaderboard row. The leaderboard query selects the same columns the
/// web app does, so it decodes into the same shape.
public typealias LeaderboardEntry = Profile

public enum UsernameRules {
    public static let minLength = 3
    public static let maxLength = 20
    public static let requirement = "Use 3–20 characters: letters, numbers, underscore."

    /// `^[a-zA-Z0-9_]{3,20}$` — also enforced by the database.
    public static func isValid(_ username: String) -> Bool {
        let scalars = username.unicodeScalars
        guard (minLength...maxLength).contains(scalars.count) else { return false }
        return scalars.allSatisfy { scalar in
            (scalar.value >= 0x30 && scalar.value <= 0x39)      // 0-9
                || (scalar.value >= 0x41 && scalar.value <= 0x5A) // A-Z
                || (scalar.value >= 0x61 && scalar.value <= 0x7A) // a-z
                || scalar == "_"
        }
    }
}

/// Port of isSafeAvatarUrl: only http(s) URLs are ever loaded.
public func isSafeAvatarURL(_ value: String) -> Bool {
    let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
    if trimmed.isEmpty { return true }
    guard let url = URL(string: trimmed), let scheme = url.scheme?.lowercased() else { return false }
    return scheme == "https" || scheme == "http"
}
