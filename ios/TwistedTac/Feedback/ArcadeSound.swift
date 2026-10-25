import Foundation

/// The same cue set as the web app's src/utils/arcadeSound.ts.
enum ArcadeSound: CaseIterable {
    case tap, placeX, placeO, yourTurn, opponentTurn
    case layerWin, layerLost, victory, defeat, draw, invalid

    /// Haptic pattern: alternating vibrate / pause durations in milliseconds,
    /// starting with a vibration — identical to the web's VIBRATIONS map.
    var hapticPattern: [Int] {
        switch self {
        case .tap: [8]
        case .placeX: [24]
        case .placeO: [12, 25, 20]
        case .yourTurn: [16, 45, 28]
        case .opponentTurn: [10]
        case .layerWin: [35, 35, 75]
        case .layerLost: [20, 50, 20]
        case .victory: [40, 60, 40, 60, 130]
        case .defeat: [90, 60, 170]
        case .draw: [30, 60, 30]
        case .invalid: [50]
        }
    }
}

enum FilterKind { case bandpass, lowpass, highpass }
enum Waveform { case sine, triangle }

/// One layer of a cue: an oscillator tone or a filtered noise burst.
enum SoundLayer {
    case tone(at: Double, freq: Double, glideTo: Double? = nil, duration: Double,
              wave: Waveform = .sine, gain: Double = 0.6, attack: Double = 0.008,
              detune: Double = 0, echo: Bool = false)
    case noise(at: Double, duration: Double, gain: Double = 0.6, filter: FilterKind,
               freq: Double, q: Double = 1, attack: Double = 0.008, echo: Bool = false)
}

extension ArcadeSound {
    /// Layer recipes ported 1:1 from the web SOUNDS table.
    var layers: [SoundLayer] {
        switch self {
        case .tap:
            [.noise(at: 0, duration: 0.045, gain: 0.55, filter: .bandpass, freq: 2400, q: 2),
             .tone(at: 0, freq: 1180, duration: 0.045, wave: .triangle, gain: 0.2)]
        case .placeX:
            [.tone(at: 0, freq: 190, glideTo: 110, duration: 0.16, wave: .triangle, gain: 0.78),
             .tone(at: 0.025, freq: 380, duration: 0.1, gain: 0.18),
             .noise(at: 0, duration: 0.05, gain: 0.5, filter: .lowpass, freq: 1050)]
        case .placeO:
            [.tone(at: 0, freq: 250, glideTo: 170, duration: 0.16, gain: 0.72),
             .tone(at: 0.03, freq: 500, duration: 0.12, gain: 0.2, echo: true),
             .noise(at: 0, duration: 0.05, gain: 0.42, filter: .lowpass, freq: 1350)]
        case .yourTurn:
            [.tone(at: 0, freq: 440, duration: 0.1, wave: .triangle, gain: 0.3),
             .tone(at: 0.09, freq: 659.3, duration: 0.18, gain: 0.38, echo: true)]
        case .opponentTurn:
            [.tone(at: 0, freq: 330, duration: 0.09, gain: 0.2),
             .noise(at: 0, duration: 0.045, gain: 0.16, filter: .bandpass, freq: 1200, q: 1.5)]
        case .layerWin:
            [.tone(at: 0, freq: 523.25, duration: 0.1, wave: .triangle, gain: 0.46, echo: true),
             .tone(at: 0.1, freq: 783.99, duration: 0.2, gain: 0.52, echo: true),
             .noise(at: 0.1, duration: 0.2, gain: 0.15, filter: .highpass, freq: 4500, echo: true)]
        case .layerLost:
            [.tone(at: 0, freq: 620, duration: 0.09, gain: 0.45, echo: true),
             .tone(at: 0.1, freq: 415, duration: 0.18, gain: 0.5, echo: true),
             .noise(at: 0, duration: 0.12, gain: 0.1, filter: .lowpass, freq: 800)]
        case .victory:
            [.tone(at: 0, freq: 72, glideTo: 48, duration: 0.35, gain: 0.9),
             .tone(at: 0.05, freq: 392, duration: 0.38, wave: .triangle, gain: 0.32, attack: 0.05, echo: true),
             .tone(at: 0.05, freq: 392, duration: 0.38, gain: 0.16, attack: 0.05, detune: 9, echo: true),
             .tone(at: 0.2, freq: 493.88, duration: 0.42, wave: .triangle, gain: 0.34, attack: 0.05, echo: true),
             .tone(at: 0.35, freq: 587.33, duration: 0.7, gain: 0.44, attack: 0.05, echo: true),
             .tone(at: 0.35, freq: 880, duration: 0.62, gain: 0.22, attack: 0.12, detune: -7, echo: true),
             .noise(at: 0.35, duration: 0.7, gain: 0.14, filter: .highpass, freq: 5200, attack: 0.08, echo: true)]
        case .defeat:
            [.tone(at: 0, freq: 58, glideTo: 40, duration: 0.55, gain: 0.85),
             .tone(at: 0.05, freq: 330, glideTo: 262, duration: 0.4, gain: 0.4, attack: 0.04, echo: true),
             .tone(at: 0.4, freq: 220, glideTo: 165, duration: 0.6, gain: 0.45, attack: 0.05, echo: true),
             .noise(at: 0, duration: 0.5, gain: 0.14, filter: .lowpass, freq: 500, attack: 0.05, echo: true)]
        case .draw:
            [.tone(at: 0, freq: 392, duration: 0.16, gain: 0.45, echo: true),
             .tone(at: 0.22, freq: 392, duration: 0.28, gain: 0.4, echo: true),
             .noise(at: 0, duration: 0.04, gain: 0.2, filter: .bandpass, freq: 1500, q: 1.2)]
        case .invalid:
            [.tone(at: 0, freq: 110, glideTo: 82, duration: 0.09, gain: 0.6),
             .noise(at: 0, duration: 0.05, gain: 0.25, filter: .lowpass, freq: 600)]
        }
    }
}
