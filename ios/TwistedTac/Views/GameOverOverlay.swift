import SwiftUI
import TwistedTacKit

/// End-of-game card. Callers supply the words and colour so local and online
/// games can share it.
struct GameOverOverlay: View {
    let title: String
    let subtitle: String
    let accent: Color
    /// Ranked points earned (or lost) — online games only.
    var points: Int?
    let primaryLabel: String
    var primaryIcon: String = "arrow.counterclockwise"
    let onPrimary: () -> Void
    let onViewBoard: () -> Void
    let onMenu: () -> Void

    @State private var shown = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        ZStack {
            Rectangle().fill(.black.opacity(0.55)).ignoresSafeArea()
            VStack(spacing: 18) {
                Text(title)
                    .font(.system(size: 46, weight: .black, design: .rounded))
                    .foregroundStyle(accent)
                    .shadow(color: accent.opacity(0.6), radius: 18)
                    .minimumScaleFactor(0.5)
                    .lineLimit(1)
                Text(subtitle).font(.callout).foregroundStyle(Theme.muted)
                    .multilineTextAlignment(.center)
                if let points {
                    Text(points > 0 ? "+\(points) rank points" : points < 0 ? "\(points) rank points" : "No rank points")
                        .font(.headline)
                        .padding(.horizontal, 14).padding(.vertical, 6)
                        .glassEffect(.regular.tint(accent.opacity(0.3)), in: .capsule)
                }
                GlassEffectContainer(spacing: 12) {
                    VStack(spacing: 12) {
                        Button(action: onPrimary) { Label(primaryLabel, systemImage: primaryIcon).frame(maxWidth: .infinity) }
                            .buttonStyle(.glassProminent).tint(accent)
                        Button(action: onViewBoard) { Label("View board", systemImage: "cube").frame(maxWidth: .infinity) }
                            .buttonStyle(.glass)
                        Button(action: onMenu) { Label("Menu", systemImage: "house").frame(maxWidth: .infinity) }
                            .buttonStyle(.glass)
                    }
                }
                .controlSize(.large)
                .frame(maxWidth: 300)
            }
            .padding(32)
            .glassEffect(.regular, in: .rect(cornerRadius: 28))
            .padding(24)
            .scaleEffect(shown || reduceMotion ? 1 : 0.8)
            .opacity(shown ? 1 : 0)
        }
        .onAppear { withAnimation(reduceMotion ? nil : .spring(duration: 0.45, bounce: 0.3)) { shown = true } }
        .accessibilityAddTraits(.isModal)
    }
}
