import CoreHaptics

/// One Core Haptics pattern per cue. Each is shaped to its meaning so the hand
/// can tell them apart without looking: a light, crisp tick for selecting, a
/// weighty thud for placing a piece, a bright rising run for winning, and a
/// heavy sinking thud for losing.
///
/// Intensity is how strong a tap is; sharpness is how crisp it feels (high is a
/// tick, low is a dull thud). Continuous events can fade with an intensity curve.
extension ArcadeSound {
    var hapticPattern: CHHapticPattern? {
        try? CHHapticPattern(events: hapticEvents, parameterCurves: hapticCurves)
    }

    private func tick(_ time: Double, _ intensity: Float, _ sharpness: Float) -> CHHapticEvent {
        CHHapticEvent(
            eventType: .hapticTransient,
            parameters: [
                CHHapticEventParameter(parameterID: .hapticIntensity, value: intensity),
                CHHapticEventParameter(parameterID: .hapticSharpness, value: sharpness),
            ],
            relativeTime: time
        )
    }

    /// A sustained event at full base intensity; a curve in `hapticCurves` shapes it.
    private func hum(_ time: Double, _ duration: Double, _ sharpness: Float, intensity: Float = 1) -> CHHapticEvent {
        CHHapticEvent(
            eventType: .hapticContinuous,
            parameters: [
                CHHapticEventParameter(parameterID: .hapticIntensity, value: intensity),
                CHHapticEventParameter(parameterID: .hapticSharpness, value: sharpness),
            ],
            relativeTime: time,
            duration: duration
        )
    }

    var hapticEvents: [CHHapticEvent] {
        switch self {
        case .tap:
            // Selection: the lightest, crispest tick, so frequent taps never tire the hand.
            [tick(0, 0.45, 0.9)]
        case .placeX:
            // A firm thump with a short body behind it.
            [tick(0, 0.9, 0.35), hum(0, 0.05, 0.15, intensity: 0.5)]
        case .placeO:
            // Rounder and softer than X, with a small settle after it lands.
            [tick(0, 0.7, 0.2), hum(0, 0.035, 0.1, intensity: 0.35), tick(0.065, 0.3, 0.3)]
        case .yourTurn:
            // A gentle rising nudge: it's you.
            [tick(0, 0.35, 0.6), tick(0.09, 0.55, 0.75)]
        case .opponentTurn:
            [tick(0, 0.2, 0.5)]
        case .layerWin:
            // Bright double hit that rings out.
            [tick(0, 0.7, 0.8), tick(0.1, 0.9, 0.9), hum(0.1, 0.2, 0.7)]
        case .layerLost:
            // A soft low sink, nothing sharp.
            [hum(0, 0.28, 0.1)]
        case .victory:
            // A climbing run of ticks, then a shimmering tail of sparkles.
            [tick(0, 0.5, 0.5), tick(0.12, 0.65, 0.65), tick(0.24, 0.8, 0.8), tick(0.36, 1.0, 0.95),
             hum(0.36, 0.7, 0.6),
             tick(0.5, 0.45, 1.0), tick(0.62, 0.38, 1.0), tick(0.75, 0.3, 1.0), tick(0.9, 0.22, 1.0)]
        case .defeat:
            // A heavy, dull thud that sinks away into a low rumble.
            [tick(0, 1.0, 0.1), hum(0, 0.9, 0.05), tick(0.38, 0.5, 0.1)]
        case .draw:
            // Two even, neutral taps.
            [tick(0, 0.5, 0.4), tick(0.18, 0.5, 0.4)]
        case .invalid:
            // A quick, sharp double tick: "no".
            [tick(0, 0.8, 1.0), tick(0.07, 0.8, 1.0)]
        }
    }

    var hapticCurves: [CHHapticParameterCurve] {
        func fade(_ start: Double, _ points: [(Double, Float)]) -> CHHapticParameterCurve {
            CHHapticParameterCurve(
                parameterID: .hapticIntensityControl,
                controlPoints: points.map { .init(relativeTime: $0.0, value: $0.1) },
                relativeTime: start
            )
        }
        switch self {
        case .layerWin: return [fade(0.1, [(0, 0.5), (0.2, 0)])]
        case .layerLost: return [fade(0, [(0, 0.5), (0.28, 0.05)])]
        case .victory: return [fade(0.36, [(0, 0.9), (0.7, 0)])]
        case .defeat: return [fade(0, [(0, 0.85), (0.9, 0)])]
        default: return []
        }
    }
}
