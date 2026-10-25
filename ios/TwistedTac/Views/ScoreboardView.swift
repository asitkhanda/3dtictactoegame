import SwiftUI
import TwistedTacKit

/// X vs O plate showing whose turn it is and, on 3D boards, layers claimed.
struct ScoreboardView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let xLabel: String
    let oLabel: String
    let xScore: Int
    let oScore: Int
    /// Layers needed to win; 0 hides the pips.
    let threshold: Int
    let xActive: Bool
    let oActive: Bool
    let thinkingSide: Player?

    var body: some View {
        GlassEffectContainer(spacing: 12) {
            HStack(spacing: 12) {
                plate(.x, label: xLabel, score: xScore, active: xActive)
                Text("VS").font(.caption.weight(.heavy)).foregroundStyle(Theme.muted)
                plate(.o, label: oLabel, score: oScore, active: oActive)
            }
        }
        .accessibilityElement(children: .combine)
    }

    private func plate(_ player: Player, label: String, score: Int, active: Bool) -> some View {
        let color = Theme.color(for: player)
        return VStack(spacing: 4) {
            HStack(spacing: 6) {
                MarkGlyph(player: player, size: 14)
                Text(label).font(.caption.weight(.bold)).lineLimit(1)
                if thinkingSide == player { ThinkingDots(color: color) }
            }
            Text("\(score)")
                .font(.system(size: 34, weight: .black, design: .rounded))
                .contentTransition(.numericText())
            if threshold > 0 {
                HStack(spacing: 4) {
                    ForEach(0..<threshold, id: \.self) { i in
                        Circle()
                            .strokeBorder(color, lineWidth: 1.5)
                            .background(Circle().fill(i < score ? color : .clear))
                            .frame(width: 7, height: 7)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .glassEffect(.regular.tint(color.opacity(active ? 0.45 : 0.12)), in: .rect(cornerRadius: 18))
        .scaleEffect(active ? 1.03 : 1)
        .animation(reduceMotion ? nil : .spring(duration: 0.3), value: active)
    }
}

/// X / O drawn like the board pieces — marks, not letters.
struct MarkGlyph: View {
    let player: Player
    var size: CGFloat = 14

    var body: some View {
        let color = Theme.lightColor(for: player)
        let bar = max(2, size * 0.22)
        Group {
            if player == .x {
                ZStack {
                    Capsule().fill(color).frame(width: size, height: bar).rotationEffect(.degrees(45))
                    Capsule().fill(color).frame(width: size, height: bar).rotationEffect(.degrees(-45))
                }
            } else {
                Circle().strokeBorder(color, lineWidth: bar)
            }
        }
        .frame(width: size, height: size)
        .accessibilityHidden(true)
    }
}

struct ThinkingDots: View {
    let color: Color
    @State private var phase = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        HStack(spacing: 3) {
            ForEach(0..<3, id: \.self) { i in
                Circle().fill(color).frame(width: 4, height: 4)
                    .opacity(phase ? 1 : 0.25)
                    .animation(reduceMotion ? nil : .easeInOut(duration: 0.6).repeatForever().delay(Double(i) * 0.18), value: phase)
            }
        }
        .onAppear { phase = true }
        .accessibilityHidden(true)
    }
}
