import Foundation
import Testing
@testable import TwistedTacKit

@Suite("Secret code")
struct SecretCodeTests {
    private func enter(_ steps: [KonamiStep]) -> (tracker: KonamiTracker, unlocked: Bool) {
        var tracker = KonamiTracker()
        var unlocked = false
        for step in steps where tracker.advance(step) { unlocked = true }
        return (tracker, unlocked)
    }

    @Test("the full sequence unlocks")
    func unlocks() {
        let result = enter(KonamiTracker.sequence)
        #expect(result.unlocked)
        #expect(result.tracker.progress == 0)
    }

    @Test("progress counts correct steps")
    func progress() {
        #expect(enter([.up, .up, .down]).tracker.progress == 3)
    }

    @Test("a wrong key resets the code")
    func wrongKey() {
        let result = enter([.up, .up, .down, .left])
        #expect(result.tracker.progress == 0)
        #expect(!result.unlocked)
    }

    @Test("a fresh up after a mistake counts as the first step")
    func restartWithUp() {
        #expect(enter([.up, .up, .down, .up]).tracker.progress == 1)
    }

    @Test("garbage then the real code still unlocks")
    func recovers() {
        let steps: [KonamiStep] = [.a, .b, .left] + KonamiTracker.sequence
        #expect(enter(steps).unlocked)
    }

    @Test("swipes map to dominant directions")
    func swipes() {
        #expect(konamiSwipeStep(dx: 0, dy: -50) == .up)
        #expect(konamiSwipeStep(dx: 0, dy: 50) == .down)
        #expect(konamiSwipeStep(dx: -50, dy: 0) == .left)
        #expect(konamiSwipeStep(dx: 50, dy: 10) == .right)
        #expect(konamiSwipeStep(dx: 10, dy: 10) == nil)
    }

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
        #expect(InviteLink.url(for: "k7m2qx").absoluteString == "https://twistedtac.com/join/K7M2QX")
    }
}
