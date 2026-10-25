import SwiftUI
import TwistedTacKit

/// An online match: waiting room, live game, and the result.
struct OnlineGameView: View {
    @State var model: OnlineMatchModel
    @State private var viewport = BoardViewport()
    @State private var showGameOver = false
    @State private var showExitDialog = false
    @State private var leaving = false
    @State private var showError = false
    @Environment(\.dismiss) private var dismiss
    @Environment(\.scenePhase) private var scenePhase
    @Environment(GameSettings.self) private var settings

    var body: some View {
        ZStack {
            Theme.background
            switch model.match.status {
            case .waiting: waitingRoom
            case .abandoned: abandonedScreen
            case .active, .finished: gameScreen
            }
        }
        .onAppear { model.start() }
        .onDisappear { model.stop() }
        .onChange(of: scenePhase) { _, phase in model.appBecameActive(phase == .active) }
        .onChange(of: model.errorMessage) { _, message in showError = message != nil }
        .alert("Something went wrong", isPresented: $showError) {
            Button("OK") { model.errorMessage = nil }
        } message: {
            Text(model.errorMessage ?? "")
        }
        .confirmationDialog(exitTitle, isPresented: $showExitDialog, titleVisibility: .visible) {
            Button(exitConfirmLabel, role: .destructive) { Task { await leave() } }
            Button("Stay", role: .cancel) {}
        } message: {
            Text(exitMessage)
        }
        .sensoryFeedback(.selection, trigger: model.lastMove)
    }

    // MARK: Exit

    private var exitTitle: String {
        switch model.match.status {
        case .waiting: model.isHost ? "Cancel room?" : "Leave room?"
        default: "Forfeit match?"
        }
    }

    private var exitConfirmLabel: String {
        model.match.status == .waiting ? "Exit" : "Forfeit & exit"
    }

    private var exitMessage: String {
        model.match.status == .waiting
            ? "This will end the room. You won't be able to resume this match."
            : "Your opponent will win. This match can't be resumed."
    }

    /// Back chevron: forfeiting is only needed while a match is unfinished.
    private func backTapped() {
        if model.match.status == .finished || model.match.status == .abandoned { dismiss() } else { showExitDialog = true }
    }

    private func leave() async {
        leaving = true
        if await model.forfeit() { dismiss() }
        leaving = false
    }

    // MARK: Waiting room

    private var waitingRoom: some View {
        VStack(spacing: 22) {
            Spacer()
            ProgressView().controlSize(.large)
            Text("Waiting for opponent")
                .font(.system(.title, design: .rounded, weight: .black))
            Text(model.isHost ? "Share this code or link with a friend." : "The host is setting up the room.")
                .font(.callout).foregroundStyle(Theme.muted)

            Text(model.match.roomCode)
                .font(.system(size: 44, weight: .black, design: .monospaced))
                .tracking(8)
                .padding(.horizontal, 24).padding(.vertical, 16)
                .glassEffect(.regular, in: .rect(cornerRadius: 22))
                .textSelection(.enabled)
                .accessibilityLabel("Room code \(model.match.roomCode.map(String.init).joined(separator: " "))")

            if model.isHost {
                ShareLink(
                    item: MatchService.inviteLink(code: model.match.roomCode),
                    message: Text("Play Twisted Tac with me! Room code \(model.match.roomCode)")
                ) {
                    Label("Share invite", systemImage: "square.and.arrow.up").frame(maxWidth: 260)
                }
                .buttonStyle(.glassProminent).tint(Theme.playerO.opacity(0.7))
                .controlSize(.large)
            }
            Text("Room expires after 10 minutes without a guest.")
                .font(.footnote).foregroundStyle(Theme.muted)
            Spacer()
            Button(role: .destructive) { showExitDialog = true } label: {
                Label(model.isHost ? "Cancel room" : "Leave room", systemImage: "xmark").frame(maxWidth: 260)
            }
            .buttonStyle(.glass)
            .disabled(leaving)
            .padding(.bottom, 24)
        }
        .padding(.horizontal, 24)
    }

    private var abandonedScreen: some View {
        let mutual = model.match.abandonReason == "mutual_disconnect"
        return VStack(spacing: 16) {
            Spacer()
            Image(systemName: mutual ? "wifi.slash" : "door.left.hand.closed").font(.system(size: 48)).foregroundStyle(Theme.muted)
            Text(mutual ? "Match abandoned" : "Room closed")
                .font(.system(.title, design: .rounded, weight: .black))
            Text(mutual ? "Both players disconnected, so nobody wins or loses points." : "This room is no longer open.")
                .font(.callout).foregroundStyle(Theme.muted).multilineTextAlignment(.center)
            Button { dismiss() } label: { Label("Back", systemImage: "chevron.left").frame(maxWidth: 220) }
                .buttonStyle(.glassProminent).controlSize(.large)
            Spacer()
        }
        .padding(24)
    }

    // MARK: Game

    private var gameScreen: some View {
        VStack(spacing: 10) {
            topBar
            banner
            ScoreboardView(
                xLabel: model.xName, oLabel: model.oName,
                xScore: model.state.layerWinners.filter { $0.winner == .x }.count,
                oScore: model.state.layerWinners.filter { $0.winner == .o }.count,
                threshold: model.config.is3D && model.config.size > 1 ? model.config.matchWinThreshold : 0,
                xActive: model.match.winner == .x || (model.isPlaying && model.match.isXNext),
                oActive: model.match.winner == .o || (model.isPlaying && !model.match.isXNext),
                thinkingSide: model.isPlaying && !model.isMyTurn ? model.mySymbol.opponent : nil
            )
            .padding(.horizontal, 14)
            BoardView(model: model, viewport: viewport)
                .overlay(alignment: .top) { layerBanner }
            Text(statusText)
                .font(.subheadline.weight(.medium))
                .foregroundStyle(Theme.foreground)
                .accessibilityAddTraits(.updatesFrequently)
            CameraControls(viewport: viewport, is3D: model.config.is3D)
                .padding(.horizontal, 14).padding(.bottom, 6)
        }
        .overlay {
            if showGameOver, let outcome = model.outcome, let result = model.rankOutcome {
                GameOverOverlay(
                    title: result == .win ? "YOU WIN" : result == .loss ? "YOU LOSE" : "STALEMATE",
                    subtitle: resultSubtitle(outcome),
                    accent: result == .loss ? Theme.playerO : result == .draw ? Theme.playerO : Theme.playerX,
                    points: OnlineScoring.points(for: result),
                    primaryLabel: "New game",
                    primaryIcon: "plus",
                    onPrimary: { dismiss() },
                    onViewBoard: { showGameOver = false },
                    onMenu: { dismiss() }
                )
                .transition(.opacity)
            }
        }
        .onChange(of: model.outcome) { _, outcome in
            guard outcome != nil else { showGameOver = false; return }
            // Let the final position land before the overlay takes the screen.
            Task {
                try? await Task.sleep(for: .milliseconds(model.match.winner == nil ? 450 : 950))
                withAnimation { showGameOver = model.outcome != nil }
            }
        }
        .onAppear { if model.outcome != nil { showGameOver = true } }
    }

    private var topBar: some View {
        GlassEffectContainer(spacing: 10) {
            HStack(spacing: 10) {
                Button { backTapped() } label: { Image(systemName: "chevron.left") }
                    .buttonStyle(.glass).accessibilityLabel("Leave match")
                VStack(alignment: .leading, spacing: 0) {
                    Text(boardTitle).font(.headline)
                    Text("Online · You are \(model.mySymbol.rawValue)").font(.caption).foregroundStyle(Theme.muted)
                }
                Spacer()
                Button { settings.soundMuted.toggle() } label: {
                    Image(systemName: settings.soundMuted ? "speaker.slash.fill" : "speaker.wave.2.fill")
                }
                .buttonStyle(.glass).accessibilityLabel(settings.soundMuted ? "Unmute" : "Mute")
            }
        }
        .padding(.horizontal, 14).padding(.top, 4)
    }

    @ViewBuilder
    private var banner: some View {
        if model.connection == .reconnecting {
            statusBanner("Reconnecting…", icon: "wifi.slash")
        } else if model.isPlaying, let since = model.opponentDisconnectedAt {
            TimelineView(.periodic(from: .now, by: 1)) { context in
                let left = DisconnectTimeout.remaining(disconnectedAt: since, now: context.date) ?? 0
                statusBanner("Opponent disconnected — you win if they don't return in \(DisconnectTimeout.format(left))", icon: "wifi.slash")
            }
        }
    }

    private func statusBanner(_ text: String, icon: String) -> some View {
        Label(text, systemImage: icon)
            .font(.caption)
            .padding(.horizontal, 12).padding(.vertical, 8)
            .frame(maxWidth: .infinity, alignment: .leading)
            .glassEffect(.regular.tint(Theme.playerX.opacity(0.15)), in: .rect(cornerRadius: 12))
            .padding(.horizontal, 14)
    }

    @ViewBuilder
    private var layerBanner: some View {
        if let event = model.layerEvent {
            Text("LAYER \(event.layerNumber) · \(event.winner == model.mySymbol ? "YOURS" : model.opponentName.uppercased())")
                .font(.headline.weight(.black))
                .padding(.horizontal, 18).padding(.vertical, 10)
                .glassEffect(.regular.tint(Theme.color(for: event.winner).opacity(0.55)), in: .capsule)
                .padding(.top, 8)
                .transition(.scale.combined(with: .opacity))
        }
    }

    // MARK: Text

    private var boardTitle: String {
        let size = model.config.size
        if size == 1 { return "THE VOID" }
        return model.config.is3D ? "\(size)×\(size)×\(size)" : "\(size)×\(size) 2D"
    }

    private var statusText: String {
        switch model.outcome {
        case .draw: return "Game ended in a draw."
        case let .win(player):
            let mine = player == model.mySymbol
            switch model.match.abandonReason {
            case "voluntary_forfeit": return mine ? "Opponent forfeited — you win!" : "You forfeited."
            case "disconnect_timeout": return mine ? "Opponent disconnected — you win!" : "You were disconnected too long."
            default: return mine ? "You win!" : "\(model.opponentName) wins."
            }
        case nil:
            return model.isMyTurn ? "Your turn." : "Opponent's turn."
        }
    }

    private func resultSubtitle(_ outcome: GameOutcome) -> String {
        guard case let .win(player) = outcome else { return "The cube holds. Nobody cracked it." }
        let mine = player == model.mySymbol
        switch model.match.abandonReason {
        case "voluntary_forfeit": return mine ? "\(model.opponentName) forfeited the match." : "You forfeited the match."
        case "disconnect_timeout": return mine ? "\(model.opponentName) left and never came back." : "You were away too long."
        default: return mine ? "\(model.opponentName) has been out-stacked." : "\(model.opponentName) out-stacked you."
        }
    }
}
