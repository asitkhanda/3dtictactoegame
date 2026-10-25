import Foundation
import Testing
@testable import TwistedTacKit

@Suite("Invite links")
struct InviteLinkTests {
    @Test("accepts invite links", arguments: [
        "https://twistedtac.com/join/K7M2QX",
        "https://www.twistedtac.com/join/k7m2qx",
        "https://twistedtac.com/join/K7M2QX/",
        "twistedtac://join/K7M2QX",
    ])
    func invites(text: String) {
        #expect(InviteLink.roomCode(from: URL(string: text)!) == "K7M2QX")
    }

    @Test("rejects everything else", arguments: [
        "https://evil.example/join/K7M2QX",
        "https://twistedtac.com/play/K7M2QX",
        "https://twistedtac.com/join/SHORT",
        "https://twistedtac.com/join/TOOLONGCODE",
        "https://twistedtac.com/join/K7M2Q;",
        "https://twistedtac.com/",
        "twistedtac://play/K7M2QX",
        "mailto:a@b.c",
    ])
    func notInvites(text: String) {
        #expect(InviteLink.roomCode(from: URL(string: text)!) == nil)
    }

    @Test("builds the shareable link")
    func build() {
        #expect(InviteLink.url(for: "k7m2qx").absoluteString == "https://www.twistedtac.com/join/K7M2QX")
        // What we share must be a link we recognise.
        #expect(InviteLink.roomCode(from: InviteLink.url(for: "k7m2qx")) == "K7M2QX")
    }
}
