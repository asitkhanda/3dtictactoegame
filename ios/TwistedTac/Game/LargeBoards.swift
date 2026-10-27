import Foundation
import Observation
import TwistedTacKit

/// Boards beyond the classic 3×3×3 (1×1 through 8×8, and flat 2D) are a paid,
/// app-only feature, unlocked by the one-time "Larger Boards" purchase. The game
/// engine already supports them all; this decides whether the player can pick one.
@Observable
final class LargeBoards {
    /// Set from the App Store purchase (see `PurchaseManager`).
    var purchased = false

    /// Debug builds can try every size without buying; `-simulateRelease YES`
    /// turns that off so screenshots match what players see.
    private let debugUnlocked: Bool

    var isUnlocked: Bool { purchased || debugUnlocked }

    /// Chosen board size and style, used only while unlocked.
    var size = 3
    var isFlat = false

    init(debugUnlocked: Bool? = nil) {
        #if DEBUG
        self.debugUnlocked = debugUnlocked ?? !UserDefaults.standard.bool(forKey: "simulateRelease")
        #else
        self.debugUnlocked = false
        #endif
    }

    var effectiveSize: Int { isUnlocked ? size : 3 }
    var effectiveViewMode: ViewMode { isUnlocked && isFlat ? .flat : .cube }
}
