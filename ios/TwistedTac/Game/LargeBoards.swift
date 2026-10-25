import Foundation
import Observation
import TwistedTacKit

/// Boards beyond the classic 3×3×3 (1×1 through 8×8, and flat 2D) are reserved
/// for a future paid, app-only feature. The game engine already supports them
/// all; this switch is what decides whether the player can pick one.
///
/// Release builds keep it locked until a purchase exists. When in-app purchases
/// are added, set `isUnlocked` from the StoreKit entitlement.
@Observable
final class LargeBoards {
    private(set) var isUnlocked: Bool

    /// Chosen board size and style, used only while unlocked.
    var size = 3
    var isFlat = false

    init() {
        #if DEBUG
        // Developers can always try every size; `-simulateRelease YES` hides the
        // picker so screenshots match what players see.
        isUnlocked = !UserDefaults.standard.bool(forKey: "simulateRelease")
        #else
        isUnlocked = false
        #endif
    }

    var effectiveSize: Int { isUnlocked ? size : 3 }
    var effectiveViewMode: ViewMode { isUnlocked && isFlat ? .flat : .cube }
}
