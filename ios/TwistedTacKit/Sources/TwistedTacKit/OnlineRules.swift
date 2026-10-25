import Foundation

// Online-play rules shared with the web app: rank points
// (src/services/scoreService.ts) and the disconnect forfeit timer
// (formatForfeitCountdown in OnlinePage / settle-stale-matches).

public enum RankOutcome: Sendable {
    case win, draw, loss
}

public enum OnlineScoring {
    /// Points a finished online match is worth. Local games are unranked.
    public static func points(for outcome: RankOutcome) -> Int {
        switch outcome {
        case .win: 25
        case .draw: 5
        case .loss: -5
        }
    }
}

public enum MatchTimestamp {
    /// Parses Postgres timestamptz text such as `2026-10-25T10:24:21.123456+00:00`,
    /// with or without fractional seconds.
    public static func parse(_ text: String) -> Date? {
        let withFraction = ISO8601DateFormatter()
        withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = withFraction.date(from: text) { return date }
        let plain = ISO8601DateFormatter()
        plain.formatOptions = [.withInternetDateTime]
        if let date = plain.date(from: text) { return date }
        // Postgres may emit more than 3 fractional digits, which the formatter
        // rejects; trim to milliseconds and retry.
        guard let dot = text.firstIndex(of: "."),
              let zone = text[dot...].firstIndex(where: { $0 == "+" || $0 == "-" || $0 == "Z" })
        else { return nil }
        let digits = text[text.index(after: dot)..<zone].prefix(3)
        return withFraction.date(from: String(text[..<dot]) + "." + digits + String(text[zone...]))
    }
}

public enum DisconnectTimeout {
    /// How long a player can stay gone before the opponent wins by forfeit.
    public static let duration: TimeInterval = 10 * 60

    /// Time left on the forfeit timer, or nil when the opponent is connected.
    public static func remaining(disconnectedAt: String?, now: Date = Date()) -> TimeInterval? {
        guard let disconnectedAt, let start = MatchTimestamp.parse(disconnectedAt) else { return nil }
        return max(0, start.addingTimeInterval(duration).timeIntervalSince(now))
    }

    /// `m:ss`, as shown in the "opponent disconnected" banner.
    public static func format(_ seconds: TimeInterval) -> String {
        let total = Int(seconds.rounded(.down))
        return "\(total / 60):" + String(format: "%02d", total % 60)
    }
}
