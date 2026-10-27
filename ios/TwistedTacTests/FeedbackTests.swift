import AVFoundation
import CoreHaptics
import Testing
@testable import TwistedTac

@MainActor
struct FeedbackTests {
    @Test func everyCueHasAValidHapticPattern() {
        for sound in ArcadeSound.allCases {
            #expect(sound.hapticPattern != nil, "\(sound) has no haptic pattern")
        }
    }

    @Test func recordedCuesAreBundledAsMono44k() throws {
        for sound in ArcadeSound.allCases {
            guard let name = sound.recordingName else { continue }
            let url = try #require(Bundle.main.url(forResource: name, withExtension: "wav"), "\(name).wav missing")
            let file = try AVAudioFile(forReading: url)
            #expect(file.processingFormat.sampleRate == 44_100, "\(name) sample rate")
            #expect(file.processingFormat.channelCount == 1, "\(name) channels")
            #expect(file.length > 1_000, "\(name) is empty")
        }
    }

    private func meanSharpness(_ sound: ArcadeSound) -> Float {
        let values = sound.hapticEvents.compactMap { event in
            event.eventParameters.first { $0.parameterID == .hapticSharpness }?.value
        }
        return values.reduce(0, +) / Float(values.count)
    }

    private func duration(_ sound: ArcadeSound) -> Double {
        sound.hapticEvents.map { $0.relativeTime + $0.duration }.max() ?? 0
    }

    private func peak(_ sound: ArcadeSound) -> Float {
        sound.hapticEvents.compactMap { event in
            event.eventParameters.first { $0.parameterID == .hapticIntensity }?.value
        }.max() ?? 0
    }

    @Test func selectionIsLighterAndShorterThanEverythingElse() {
        #expect(duration(.tap) < 0.01)
        #expect(peak(.tap) < peak(.placeX))
        #expect(peak(.tap) < peak(.victory))
        #expect(peak(.tap) < peak(.defeat))
    }

    @Test func winningFeelsBrightAndLosingFeelsDull() {
        #expect(meanSharpness(.victory) > 0.7)
        #expect(meanSharpness(.defeat) < 0.2)
        #expect(meanSharpness(.victory) > meanSharpness(.defeat) + 0.5)
        #expect(duration(.victory) > duration(.tap) * 20)
        #expect(duration(.defeat) > 0.8)
    }

    @Test func victoryBuildsUpWhereDefeatHitsFirst() {
        let victoryTicks = ArcadeSound.victory.hapticEvents.filter { $0.type == .hapticTransient }
        let climb = victoryTicks.prefix(4).compactMap {
            $0.eventParameters.first { $0.parameterID == .hapticIntensity }?.value
        }
        #expect(climb == climb.sorted() && Set(climb).count == 4)

        let defeatFirst = ArcadeSound.defeat.hapticEvents.first {
            $0.eventParameters.first { $0.parameterID == .hapticIntensity }?.value == 1.0
        }
        #expect(defeatFirst?.relativeTime == 0)
    }

    @Test func placingXAndOFeelDifferent() {
        #expect(peak(.placeX) > peak(.placeO))
        #expect(meanSharpness(.placeX) > meanSharpness(.placeO))
    }
}
