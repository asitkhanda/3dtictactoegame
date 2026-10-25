import Foundation
import Testing
@testable import TwistedTacKit

@Suite("Online rules")
struct OnlineRulesTests {
    @Test("rank points match the server")
    func points() {
        #expect(OnlineScoring.points(for: .win) == 25)
        #expect(OnlineScoring.points(for: .draw) == 5)
        #expect(OnlineScoring.points(for: .loss) == -5)
    }

    @Test("parses Postgres timestamps", arguments: [
        "2026-10-25T10:24:21+00:00",
        "2026-10-25T10:24:21Z",
        "2026-10-25T10:24:21.123+00:00",
        "2026-10-25T10:24:21.123456+00:00",
        "2026-10-25T15:54:21.987654+05:30",
    ])
    func parses(text: String) {
        #expect(MatchTimestamp.parse(text) != nil)
    }

    @Test("rejects garbage timestamps")
    func rejects() {
        #expect(MatchTimestamp.parse("not a date") == nil)
        #expect(MatchTimestamp.parse("") == nil)
    }

    @Test("microsecond and offset forms agree")
    func sameInstant() throws {
        let utc = try #require(MatchTimestamp.parse("2026-10-25T10:24:21.500000+00:00"))
        let ist = try #require(MatchTimestamp.parse("2026-10-25T15:54:21.500000+05:30"))
        #expect(abs(utc.timeIntervalSince(ist)) < 0.001)
    }

    @Test("forfeit timer counts down from ten minutes")
    func countdown() throws {
        let start = try #require(MatchTimestamp.parse("2026-10-25T10:00:00+00:00"))
        let now = start.addingTimeInterval(125)
        let left = try #require(DisconnectTimeout.remaining(disconnectedAt: "2026-10-25T10:00:00+00:00", now: now))
        #expect(left == 475)
        #expect(DisconnectTimeout.format(left) == "7:55")
    }

    @Test("timer never goes negative and is nil when connected")
    func bounds() throws {
        let start = try #require(MatchTimestamp.parse("2026-10-25T10:00:00+00:00"))
        let late = start.addingTimeInterval(3600)
        #expect(DisconnectTimeout.remaining(disconnectedAt: "2026-10-25T10:00:00+00:00", now: late) == 0)
        #expect(DisconnectTimeout.remaining(disconnectedAt: nil) == nil)
        #expect(DisconnectTimeout.format(0) == "0:00")
        #expect(DisconnectTimeout.format(65) == "1:05")
    }
}
