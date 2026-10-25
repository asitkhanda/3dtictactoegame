import Foundation
import Testing
@testable import TwistedTacKit

@Suite("Profile and username rules")
struct ProfileTests {
    @Test("accepts valid usernames", arguments: ["abc", "Player_1", "a_b_c_d_e_f_g_h_i_j", "ZZZ", "x1y2z3"])
    func valid(name: String) {
        #expect(UsernameRules.isValid(name))
    }

    @Test("rejects invalid usernames", arguments: ["", "ab", "has space", "dash-ed", "émile", "twenty_one_chars_long", "emoji🙂ok", "semi;colon"])
    func invalid(name: String) {
        #expect(!UsernameRules.isValid(name))
    }

    @Test("length bounds are 3 and 20")
    func bounds() {
        #expect(UsernameRules.isValid(String(repeating: "a", count: 20)))
        #expect(!UsernameRules.isValid(String(repeating: "a", count: 21)))
        #expect(!UsernameRules.isValid(String(repeating: "a", count: 2)))
    }

    @Test("avatar URLs must be http or https")
    func avatarURLs() {
        #expect(isSafeAvatarURL(""))
        #expect(isSafeAvatarURL("  https://example.com/a.png "))
        #expect(isSafeAvatarURL("http://example.com/a.png"))
        #expect(!isSafeAvatarURL("javascript:alert(1)"))
        #expect(!isSafeAvatarURL("file:///etc/passwd"))
        #expect(!isSafeAvatarURL("not a url"))
    }

    @Test("decodes a profiles row")
    func decodes() throws {
        let json = """
        {"id":"u1","username":"neon","display_name":null,"avatar_url":"https://x/y.png",
         "points":120,"wins":5,"losses":2,"draws":1,"games_played":8}
        """
        let profile = try JSONDecoder().decode(Profile.self, from: Data(json.utf8))
        #expect(profile.username == "neon")
        #expect(profile.points == 120)
        #expect(profile.gamesPlayed == 8)
        #expect(!profile.needsUsername)
        #expect(profile.winRate == 0.625)
    }

    @Test("a profile with no username needs onboarding")
    func needsUsername() throws {
        let json = #"{"id":"u2","username":null,"display_name":"Pat","avatar_url":null,"points":0,"wins":0,"losses":0,"draws":0,"games_played":0}"#
        let profile = try JSONDecoder().decode(Profile.self, from: Data(json.utf8))
        #expect(profile.needsUsername)
        #expect(profile.winRate == nil)
    }
}
