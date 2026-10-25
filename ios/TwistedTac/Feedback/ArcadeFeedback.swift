import AVFoundation
import CoreHaptics
import Observation

/// Plays an ArcadeSound's audio and haptic together, honouring settings.
@MainActor
final class ArcadeFeedback {
    static let shared = ArcadeFeedback()

    var settings: GameSettings?

    private let engine = AVAudioEngine()
    private var players: [AVAudioPlayerNode] = []
    private var nextPlayer = 0
    private var buffers: [ArcadeSound: AVAudioPCMBuffer] = [:]
    private var engineReady = false
    private var hapticEngine: CHHapticEngine?

    private init() {
        configureAudio()
        configureHaptics()
    }

    func play(_ sound: ArcadeSound) {
        if settings?.hapticsEnabled ?? true { playHaptic(sound) }
        if settings?.soundMuted ?? false { return }
        playAudio(sound)
    }

    // MARK: Audio

    private func configureAudio() {
        // .ambient respects the silent switch and mixes with the player's music.
        try? AVAudioSession.sharedInstance().setCategory(.ambient, mode: .default)
        try? AVAudioSession.sharedInstance().setActive(true)

        let format = AVAudioFormat(standardFormatWithSampleRate: SoundSynth.sampleRate, channels: 1)!
        for _ in 0..<6 {
            let node = AVAudioPlayerNode()
            engine.attach(node)
            engine.connect(node, to: engine.mainMixerNode, format: format)
            players.append(node)
        }
        engine.prepare()
        engineReady = (try? engine.start()) != nil
    }

    private func buffer(for sound: ArcadeSound) -> AVAudioPCMBuffer? {
        if let cached = buffers[sound] { return cached }
        let samples = SoundSynth.render(sound)
        guard let format = AVAudioFormat(standardFormatWithSampleRate: SoundSynth.sampleRate, channels: 1),
              let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(samples.count))
        else { return nil }
        buffer.frameLength = AVAudioFrameCount(samples.count)
        samples.withUnsafeBufferPointer { source in
            buffer.floatChannelData![0].update(from: source.baseAddress!, count: samples.count)
        }
        buffers[sound] = buffer
        return buffer
    }

    private func playAudio(_ sound: ArcadeSound) {
        if !engine.isRunning { engineReady = (try? engine.start()) != nil }
        guard engineReady, let buffer = buffer(for: sound) else { return }
        let player = players[nextPlayer]
        nextPlayer = (nextPlayer + 1) % players.count
        player.stop()
        player.scheduleBuffer(buffer, at: nil, options: [], completionHandler: nil)
        player.play()
    }

    // MARK: Haptics

    private func configureHaptics() {
        guard CHHapticEngine.capabilitiesForHardware().supportsHaptics else { return }
        hapticEngine = try? CHHapticEngine()
        hapticEngine?.isAutoShutdownEnabled = true
        hapticEngine?.resetHandler = { [weak self] in
            Task { @MainActor in try? self?.hapticEngine?.start() }
        }
        try? hapticEngine?.start()
    }

    private func playHaptic(_ sound: ArcadeSound) {
        guard let hapticEngine else { return }
        var events: [CHHapticEvent] = []
        var time = 0.0
        for (i, milliseconds) in sound.hapticPattern.enumerated() {
            let seconds = Double(milliseconds) / 1000
            if i % 2 == 0 {
                let parameters = [
                    CHHapticEventParameter(parameterID: .hapticIntensity, value: 0.8),
                    CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.5),
                ]
                events.append(
                    seconds < 0.03
                        ? CHHapticEvent(eventType: .hapticTransient, parameters: parameters, relativeTime: time)
                        : CHHapticEvent(eventType: .hapticContinuous, parameters: parameters,
                                        relativeTime: time, duration: seconds)
                )
            }
            time += seconds
        }
        do {
            try hapticEngine.start()
            let pattern = try CHHapticPattern(events: events, parameters: [])
            try hapticEngine.makePlayer(with: pattern).start(atTime: 0)
        } catch {
            // Haptics are decoration; never let them break a move.
        }
    }
}
