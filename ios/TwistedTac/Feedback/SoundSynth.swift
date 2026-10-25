import Foundation

/// Offline renderer for ArcadeSound recipes: oscillators and filtered noise
/// shaped by the same envelopes as the web's WebAudio graph, plus the shared
/// feedback-delay "echo bus". Pure and nonisolated so it can run anywhere.
enum SoundSynth {
    static let sampleRate = 44_100.0
    static let masterVolume: Float = 0.22

    static func render(_ sound: ArcadeSound) -> [Float] {
        let layers = sound.layers
        let length = Int((totalDuration(layers) + 0.9) * sampleRate)
        var dry = [Float](repeating: 0, count: length)
        var echo = [Float](repeating: 0, count: length)
        var rng = SplitMix(seed: 0xC0FFEE)

        for layer in layers {
            switch layer {
            case let .tone(at, freq, glideTo, duration, wave, gain, attack, detune, useEcho):
                if useEcho {
                    mixTone(into: &echo, at: at, freq: freq, glideTo: glideTo, duration: duration,
                            wave: wave, gain: gain, attack: attack, detune: detune)
                } else {
                    mixTone(into: &dry, at: at, freq: freq, glideTo: glideTo, duration: duration,
                            wave: wave, gain: gain, attack: attack, detune: detune)
                }
            case let .noise(at, duration, gain, filter, freq, q, attack, useEcho):
                if useEcho {
                    mixNoise(into: &echo, rng: &rng, at: at, duration: duration, gain: gain,
                             filter: filter, freq: freq, q: q, attack: attack)
                } else {
                    mixNoise(into: &dry, rng: &rng, at: at, duration: duration, gain: gain,
                             filter: filter, freq: freq, q: q, attack: attack)
                }
            }
        }

        // Echo bus: direct signal, plus a 0.17s feedback delay (0.28) at 0.16 wet.
        let delay = Int(0.17 * sampleRate)
        var delayed = [Float](repeating: 0, count: length)
        for n in 0..<length {
            let previous = n >= delay ? echo[n - delay] + 0.28 * delayed[n - delay] : 0
            delayed[n] = previous
        }

        var out = [Float](repeating: 0, count: length)
        for n in 0..<length {
            let mixed = (dry[n] + echo[n] + 0.16 * delayed[n]) * masterVolume
            out[n] = max(-1, min(1, mixed))
        }
        return out
    }

    private static func totalDuration(_ layers: [SoundLayer]) -> Double {
        layers.map { layer -> Double in
            switch layer {
            case let .tone(at, _, _, duration, _, _, _, _, _): at + duration
            case let .noise(at, duration, _, _, _, _, _, _): at + duration
            }
        }.max() ?? 0.1
    }

    /// WebAudio-style envelope: linear attack to `peak`, then an exponential
    /// ramp down to 0.001 at the end of the layer.
    private static func envelope(_ t: Double, peak: Double, attack: Double, duration: Double) -> Double {
        if t < 0 || t > duration { return 0 }
        if t < attack { return peak * (t / attack) }
        let span = max(duration - attack, 1e-6)
        return peak * pow(0.001 / peak, (t - attack) / span)
    }

    private static func mixTone(
        into buffer: inout [Float], at: Double, freq: Double, glideTo: Double?, duration: Double,
        wave: Waveform, gain: Double, attack: Double, detune: Double
    ) {
        let start = Int(at * sampleRate)
        let count = Int(duration * sampleRate)
        let detuneFactor = pow(2, detune / 1200)
        var phase = 0.0
        for i in 0..<count where start + i < buffer.count {
            let t = Double(i) / sampleRate
            var f = freq
            if let glideTo { f = freq * pow(glideTo / freq, t / duration) }
            phase += 2 * .pi * f * detuneFactor / sampleRate
            let sample: Double = switch wave {
            case .sine: sin(phase)
            case .triangle: (2 / .pi) * asin(sin(phase))
            }
            buffer[start + i] += Float(sample * envelope(t, peak: gain, attack: attack, duration: duration))
        }
    }

    private static func mixNoise(
        into buffer: inout [Float], rng: inout SplitMix, at: Double, duration: Double, gain: Double,
        filter: FilterKind, freq: Double, q: Double, attack: Double
    ) {
        let start = Int(at * sampleRate)
        let count = Int(duration * sampleRate)
        var biquad = Biquad(kind: filter, freq: freq, q: q)
        for i in 0..<count where start + i < buffer.count {
            let t = Double(i) / sampleRate
            let white = Double(rng.nextUnit()) * 2 - 1
            let filtered = biquad.process(white)
            buffer[start + i] += Float(filtered * envelope(t, peak: gain, attack: attack, duration: duration))
        }
    }
}

/// RBJ biquad, matching WebAudio's BiquadFilterNode shapes.
private struct Biquad {
    private var b0 = 0.0, b1 = 0.0, b2 = 0.0, a1 = 0.0, a2 = 0.0
    private var x1 = 0.0, x2 = 0.0, y1 = 0.0, y2 = 0.0

    init(kind: FilterKind, freq: Double, q: Double) {
        let w0 = 2 * .pi * min(freq, SoundSynth.sampleRate / 2.1) / SoundSynth.sampleRate
        let alpha = sin(w0) / (2 * max(q, 0.01))
        let cosW = cos(w0)
        let a0 = 1 + alpha
        switch kind {
        case .bandpass:
            b0 = alpha / a0; b1 = 0; b2 = -alpha / a0
        case .lowpass:
            b0 = (1 - cosW) / 2 / a0; b1 = (1 - cosW) / a0; b2 = b0
        case .highpass:
            b0 = (1 + cosW) / 2 / a0; b1 = -(1 + cosW) / a0; b2 = b0
        }
        a1 = -2 * cosW / a0
        a2 = (1 - alpha) / a0
    }

    mutating func process(_ x: Double) -> Double {
        let y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        x2 = x1; x1 = x
        y2 = y1; y1 = y
        return y
    }
}

struct SplitMix {
    private var state: UInt64
    init(seed: UInt64) { state = seed }
    mutating func nextUnit() -> Float {
        state &+= 0x9E37_79B9_7F4A_7C15
        var z = state
        z = (z ^ (z >> 30)) &* 0xBF58_476D_1CE4_E5B9
        z = (z ^ (z >> 27)) &* 0x94D0_49BB_1331_11EB
        z ^= z >> 31
        return Float(z >> 40) / Float(1 << 24)
    }
}
