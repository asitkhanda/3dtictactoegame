import Foundation
import Observation
import TwistedTacKit

/// The hidden 1×1 to 8×8 boards, unlocked by the Konami code like on the web.
/// Unlike the web (per session) the unlock is remembered between launches.
@Observable
final class SecretSizes {
    private(set) var unlocked: Bool
    private(set) var progress = 0
    /// Set for a moment after unlocking so the UI can celebrate.
    private(set) var justUnlocked = false

    var size = 3
    var isFlat = false

    private var tracker = KonamiTracker()
    private static let key = "secretSizesUnlocked"

    init() {
        unlocked = UserDefaults.standard.bool(forKey: Self.key)
        #if DEBUG
        unlocked = true
        #endif
    }

    var viewMode: ViewMode { isFlat && size > 0 ? .flat : .cube }

    func enter(_ step: KonamiStep) {
        guard !unlocked else { return }
        if tracker.advance(step) {
            unlocked = true
            justUnlocked = true
            UserDefaults.standard.set(true, forKey: Self.key)
            ArcadeFeedback.shared.play(.victory)
            Task {
                try? await Task.sleep(for: .seconds(3))
                justUnlocked = false
            }
        } else {
            ArcadeFeedback.shared.play(.tap)
        }
        progress = tracker.progress
    }

    func resetCode() {
        tracker.reset()
        progress = 0
    }

    /// Standard play is always the classic 3×3×3 until the code is entered.
    var effectiveSize: Int { unlocked ? size : 3 }
    var effectiveViewMode: ViewMode { unlocked ? viewMode : .cube }
}
