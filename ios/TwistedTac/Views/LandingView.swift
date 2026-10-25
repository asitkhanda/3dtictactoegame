import SwiftUI
import TwistedTacKit

struct LandingView: View {
    let onNavigate: (Destination) -> Void

    @Environment(AuthManager.self) private var auth
    @Environment(SecretSizes.self) private var secrets
    @State private var showRules = false
    @State private var showSignIn = false
    @State private var showSecretCode = false

    var body: some View {
        ZStack {
            Theme.background
            VStack(spacing: 28) {
                Spacer(minLength: 24)
                VStack(spacing: 10) {
                    Text("TWISTED TAC")
                        .font(.system(size: 44, weight: .black, design: .rounded))
                        .tracking(2)
                        .foregroundStyle(Theme.foreground)
                        .minimumScaleFactor(0.6)
                        .lineLimit(1)
                        .onLongPressGesture(minimumDuration: 0.9) {
                            secrets.resetCode()
                            showSecretCode = true
                        }
                        .accessibilityAddTraits(.isHeader)
                    Text("Stack layers. Strike through depth. Win the cube.")
                        .font(.callout)
                        .foregroundStyle(Theme.muted)
                        .multilineTextAlignment(.center)
                }
                .padding(.horizontal)

                GlassEffectContainer(spacing: 14) {
                    VStack(spacing: 14) {
                        menuButton("Play vs AI", systemImage: "cpu", mode: .vsAI, prominent: true)
                        menuButton("2 Player", systemImage: "person.2.fill", mode: .twoPlayer, prominent: false)
                        if auth.isConfigured {
                            Button {
                                ArcadeFeedback.shared.play(.tap)
                                if auth.phase == .ready {
                                    onNavigate(.lobby(size: boardSize, viewMode: boardViewMode))
                                } else {
                                    showSignIn = true
                                }
                            } label: {
                                Label(auth.phase == .ready ? "Play online" : "Sign in to play online", systemImage: "globe")
                                    .font(.headline)
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.glassProminent)
                            .tint(Theme.playerO.opacity(0.6))
                        }
                        if auth.isConfigured {
                            Button { onNavigate(.leaderboard) } label: {
                                Label("Leaderboard", systemImage: "trophy")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.glass)
                        }
                        Button { showRules = true } label: {
                            Label("How to play", systemImage: "questionmark.circle")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.glass)
                    }
                }
                .controlSize(.extraLarge)
                .frame(maxWidth: 420)
                .padding(.horizontal, 28)

                if secrets.unlocked { sizePicker }

                Spacer()
                Text("Local games are casual. Ranked play is online only.")
                    .font(.footnote)
                    .foregroundStyle(Theme.muted)
                    .padding(.bottom, 12)
            }
        }
        .overlay(alignment: .topTrailing) { accountButton }
        .overlay(alignment: .top) { unlockBanner }
        // Swiping ↑ ↑ ↓ ↓ ← → ← → anywhere on the menu feeds the secret code.
        .simultaneousGesture(
            DragGesture(minimumDistance: 40).onEnded { value in
                if let step = konamiSwipeStep(dx: value.translation.width, dy: value.translation.height) {
                    secrets.enter(step)
                }
            }
        )
        .sheet(isPresented: $showSecretCode) { SecretCodeSheet() }
        .sheet(isPresented: $showRules) { RulesSheet() }
        .sheet(isPresented: $showSignIn) { SignInSheet() }
    }

    @ViewBuilder
    private var accountButton: some View {
        if auth.isConfigured {
            Button {
                if auth.phase == .ready { onNavigate(.profile) } else { showSignIn = true }
            } label: {
                if let profile = auth.profile, auth.phase == .ready {
                    AvatarView(urlString: profile.avatarURL, name: profile.username ?? "?", size: 34)
                } else {
                    Image(systemName: "person.crop.circle").font(.title3)
                }
            }
            .buttonStyle(.glass)
            .padding(.trailing, 16).padding(.top, 8)
            .accessibilityLabel(auth.phase == .ready ? "Profile" : "Sign in")
        }
    }

    private func menuButton(_ title: String, systemImage: String, mode: LocalMode, prominent: Bool) -> some View {
        let route = { GameRoute(mode: mode, size: boardSize, viewMode: boardViewMode) }
        return Button {
            ArcadeFeedback.shared.play(.tap)
            onNavigate(.game(route()))
        } label: {
            Label(title, systemImage: systemImage)
                .font(.headline)
                .frame(maxWidth: .infinity)
        }
        .buttonStyle(.glassProminent)
        .tint(prominent ? Theme.playerX : Theme.playerO.opacity(0.6))
    }

    private var boardSize: Int { secrets.effectiveSize }
    private var boardViewMode: ViewMode { secrets.effectiveViewMode }

    @ViewBuilder
    private var unlockBanner: some View {
        if secrets.justUnlocked {
            Label("Secret boards unlocked — 1×1 through 8×8", systemImage: "sparkles")
                .font(.subheadline.weight(.semibold))
                .padding(.horizontal, 16).padding(.vertical, 10)
                .glassEffect(.regular.tint(Theme.playerO.opacity(0.4)), in: .capsule)
                .padding(.top, 60)
                .transition(.scale.combined(with: .opacity))
        }
    }

    private var sizePicker: some View {
        @Bindable var secrets = secrets
        return VStack(spacing: 6) {
            Text("SECRET BOARDS").font(.caption2.weight(.bold)).foregroundStyle(Theme.playerO)
            HStack {
                Stepper(sizeLabel, value: $secrets.size, in: 1...8)
                    .accessibilityLabel("Board size")
                    .accessibilityValue(sizeLabel)
                Toggle("2D", isOn: $secrets.isFlat).labelsHidden()
                Text("2D").font(.caption)
            }
            .padding(.horizontal, 14).padding(.vertical, 8)
            .glassEffect(.regular, in: .rect(cornerRadius: 16))
        }
        .frame(maxWidth: 360)
        .padding(.horizontal, 28)
    }

    private var sizeLabel: String {
        secrets.size == 1 ? "The Void" : secrets.isFlat ? "\(secrets.size)×\(secrets.size) flat" : "\(secrets.size)×\(secrets.size)×\(secrets.size)"
    }
}
