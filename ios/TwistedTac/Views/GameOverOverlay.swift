import SwiftUI
import TwistedTacKit

struct GameOverOverlay: View {
    let outcome: GameOutcome
    let mode: LocalMode
    let boardSize: Int
    let isFlat: Bool
    let onRematch: () -> Void
    let onMenu: () -> Void
    let onViewBoard: () -> Void

    @State private var shown = false

    private var title: String {
        switch outcome {
        case .draw: "STALEMATE"
        case let .win(player):
            mode == .vsAI ? (player == .x ? "YOU WIN" : "AI WINS") : "\(player.rawValue) TAKES IT"
        }
    }

    private var subtitle: String {
        switch outcome {
        case .draw: "The cube holds. Nobody cracked it."
        case .win:
            if boardSize == 1 { "The void is claimed." } else if isFlat { "Line complete." } else { "The stack is yours." }
        }
    }

    private var accent: Color {
        switch outcome {
        case .draw: Theme.playerO
        case let .win(player): mode == .vsAI && player == .o ? Theme.playerO : (mode == .twoPlayer ? Theme.color(for: player) : Theme.playerX)
        }
    }

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
                GlassEffectContainer(spacing: 12) {
                    VStack(spacing: 12) {
                        Button(action: onRematch) { Label("Rematch", systemImage: "arrow.counterclockwise").frame(maxWidth: .infinity) }
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
            .scaleEffect(shown ? 1 : 0.8)
            .opacity(shown ? 1 : 0)
        }
        .onAppear { withAnimation(.spring(duration: 0.45, bounce: 0.3)) { shown = true } }
        .accessibilityAddTraits(.isModal)
    }
}
