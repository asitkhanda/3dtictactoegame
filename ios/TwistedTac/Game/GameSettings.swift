import Foundation
import Observation

/// Player preferences, persisted in UserDefaults.
@Observable
final class GameSettings {
    var soundMuted: Bool {
        didSet { UserDefaults.standard.set(soundMuted, forKey: Keys.soundMuted) }
    }
    var hapticsEnabled: Bool {
        didSet { UserDefaults.standard.set(hapticsEnabled, forKey: Keys.hapticsEnabled) }
    }

    private enum Keys {
        static let soundMuted = "soundMuted"
        static let hapticsEnabled = "hapticsEnabled"
    }

    init() {
        let defaults = UserDefaults.standard
        soundMuted = defaults.bool(forKey: Keys.soundMuted)
        hapticsEnabled = defaults.object(forKey: Keys.hapticsEnabled) as? Bool ?? true
    }
}
