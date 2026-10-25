import SwiftUI
import TwistedTacKit

struct GameView: View {
    @State var model: LocalGameModel
    @State private var viewport = BoardViewport()
    @State private var showGameOver = false
    @State private var showRules = false
    @Environment(\.dismiss) private var dismiss
    @Environment(GameSettings.self) private var settings

    var body: some View {
        ZStack {
            Theme.background
            VStack(spacing: 10) {
                topBar.readableWidth()
                scoreboard.readableWidth()
                BoardContainer(model: model, viewport: viewport)
                    .id(model.gameID)
                    .overlay(alignment: .top) { layerBanner }
                statusLine
                CameraControls(viewport: viewport, is3D: model.config.is3D)
                    .readableWidth()
                    .padding(.bottom, 6)
            }
            .padding(.horizontal, 14)

            if showGameOver, let outcome = model.outcome {
                GameOverOverlay(
                    title: overlayTitle(outcome),
                    subtitle: overlaySubtitle(outcome),
                    accent: overlayAccent(outcome),
                    primaryLabel: "Rematch",
                    onPrimary: { rematch() },
                    onViewBoard: { showGameOver = false },
                    onMenu: { dismiss() }
                )
                .transition(.opacity)
            }
        }
        .sheet(isPresented: $showRules) { RulesSheet() }
        .onChange(of: model.isFinished) { _, finished in
            guard finished else { showGameOver = false; return }
            // Let the final position land before the overlay takes the screen.
            Task {
                try? await Task.sleep(for: .milliseconds(model.winner == nil ? 450 : 950))
                withAnimation { showGameOver = model.isFinished }
            }
        }
        .onChange(of: model.layerEvent) { _, event in
            guard event != nil else { return }
            Task {
                try? await Task.sleep(for: .milliseconds(1400))
                model.clearLayerEvent()
            }
        }
        .onDisappear { model.stop() }
        .sensoryFeedback(.selection, trigger: model.lastMove)
    }

    // MARK: Pieces of the screen

    private var topBar: some View {
        GlassEffectContainer(spacing: 10) {
            HStack(spacing: 10) {
                Button { dismiss() } label: { Image(systemName: "chevron.left") }
                    .buttonStyle(.glass).accessibilityLabel("Back to menu")
                VStack(alignment: .leading, spacing: 0) {
                    Text(boardTitle).font(.headline)
                    Text(model.mode == .vsAI ? "vs AI" : "2 players").font(.caption).foregroundStyle(Theme.muted)
                }
                Spacer()
                Button { showRules = true } label: { Image(systemName: "info.circle") }
                    .buttonStyle(.glass).accessibilityLabel("Rules")
                Button { settings.soundMuted.toggle() } label: {
                    Image(systemName: settings.soundMuted ? "speaker.slash.fill" : "speaker.wave.2.fill")
                }
                .buttonStyle(.glass).accessibilityLabel(settings.soundMuted ? "Unmute" : "Mute")
                Button { model.restart(); viewport.reset() } label: { Image(systemName: "arrow.counterclockwise") }
                    .buttonStyle(.glass).accessibilityLabel("Restart game")
            }
        }
        .padding(.top, 4)
    }

    private var scoreboard: some View {
        ScoreboardView(
            xLabel: model.mode == .vsAI ? "You" : "X",
            oLabel: model.mode == .vsAI ? "AI" : "O",
            xScore: model.xLayers,
            oScore: model.oLayers,
            threshold: model.config.is3D && model.config.size > 1 ? model.config.matchWinThreshold : 0,
            xActive: model.winner == .x || (!model.isFinished && model.isXNext),
            oActive: model.winner == .o || (!model.isFinished && !model.isXNext),
            thinkingSide: model.thinking ? .o : nil
        )
    }

    @ViewBuilder
    private var layerBanner: some View {
        if let event = model.layerEvent {
            let who = model.mode == .vsAI ? (event.winner == .x ? "YOURS" : "AI'S") : event.winner.rawValue
            Text("LAYER \(event.layerNumber) · \(who)")
                .font(.headline.weight(.black))
                .padding(.horizontal, 18).padding(.vertical, 10)
                .glassEffect(.regular.tint(Theme.color(for: event.winner).opacity(0.55)), in: .capsule)
                .padding(.top, 8)
                .transition(.scale.combined(with: .opacity))
        }
    }

    private var statusLine: some View {
        Text(statusText)
            .font(.subheadline.weight(.medium))
            .foregroundStyle(Theme.foreground)
            .frame(maxWidth: .infinity)
            .accessibilityAddTraits(.updatesFrequently)
    }

    private var boardTitle: String {
        let size = model.config.size
        if size == 1 { return "THE VOID" }
        return model.config.is3D ? "\(size)×\(size)×\(size)" : "\(size)×\(size) 2D"
    }

    private var statusText: String {
        switch model.outcome {
        case .draw: return "Game ended in a draw."
        case let .win(player):
            if model.mode == .vsAI { return player == .x ? "You win!" : "AI wins!" }
            return "\(player.rawValue) wins!"
        case nil:
            if model.mode == .vsAI { return model.isXNext ? "Your turn." : "AI is thinking." }
            return "Player \(model.isXNext ? "X" : "O")'s turn."
        }
    }

    private func overlayTitle(_ outcome: GameOutcome) -> String {
        switch outcome {
        case .draw: "STALEMATE"
        case let .win(player):
            model.mode == .vsAI ? (player == .x ? "YOU WIN" : "AI WINS") : "\(player.rawValue) TAKES IT"
        }
    }

    private func overlaySubtitle(_ outcome: GameOutcome) -> String {
        switch outcome {
        case .draw: "The cube holds. Nobody cracked it."
        case .win:
            if model.config.size == 1 { "The void is claimed." }
            else if !model.config.is3D { "Line complete." }
            else { "The stack is yours." }
        }
    }

    private func overlayAccent(_ outcome: GameOutcome) -> Color {
        switch outcome {
        case .draw: Theme.playerO
        case let .win(player): model.mode == .twoPlayer ? Theme.color(for: player) : (player == .x ? Theme.playerX : Theme.playerO)
        }
    }

    private func rematch() {
        showGameOver = false
        model.restart()
        viewport.reset()
    }
}
