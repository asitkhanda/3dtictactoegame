import CoreGraphics

// The secret-board unlock, ported from KONAMI_SEQUENCE, getKonamiSwipeStep and
// advanceKonami in src/utils/gameConfig.ts and src/hooks/useKonamiUnlock.tsx.

public enum KonamiStep: String, CaseIterable, Sendable {
    case up, down, left, right, b, a
}

/// Tracks progress through ↑ ↑ ↓ ↓ ← → ← → B A.
public struct KonamiTracker: Sendable, Equatable {
    public static let sequence: [KonamiStep] = [.up, .up, .down, .down, .left, .right, .left, .right, .b, .a]

    public private(set) var progress = 0

    public init() {}

    /// Feeds one input. Returns true on the step that completes the code.
    @discardableResult
    public mutating func advance(_ step: KonamiStep) -> Bool {
        if step == Self.sequence[progress] {
            progress += 1
            if progress == Self.sequence.count {
                progress = 0
                return true
            }
            return false
        }
        // A wrong key restarts the code, but a fresh first "up" counts.
        progress = step == Self.sequence[0] ? 1 : 0
        return false
    }

    public mutating func reset() { progress = 0 }
}

/// Maps a swipe to a direction, or nil when it is too short to count.
public func konamiSwipeStep(dx: CGFloat, dy: CGFloat, threshold: CGFloat = 40) -> KonamiStep? {
    let absX = abs(dx), absY = abs(dy)
    if absX < threshold && absY < threshold { return nil }
    if absX > absY { return dx > 0 ? .right : .left }
    return dy > 0 ? .down : .up
}
