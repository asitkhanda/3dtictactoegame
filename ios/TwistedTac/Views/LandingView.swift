import SwiftUI
import TwistedTacKit

struct LandingView: View {
    let onNavigate: (Destination) -> Void

    @Environment(AuthManager.self) private var auth
    @Environment(LargeBoards.self) private var largeBoards
    @State private var showRules = false
    @State private var showSignIn = false

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

                if largeBoards.isUnlocked { sizePicker }

                Spacer()
                Text("Local games are casual. Ranked play is online only.")
                    .font(.footnote)
                    .foregroundStyle(Theme.muted)
                    .padding(.bottom, 12)
            }
        }
        .overlay(alignment: .topTrailing) { accountButton }
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

    private var boardSize: Int { largeBoards.effectiveSize }
    private var boardViewMode: ViewMode { largeBoards.effectiveViewMode }

    private var sizePicker: some View {
        @Bindable var largeBoards = largeBoards
        return VStack(spacing: 6) {
            Text("LARGE BOARDS (DEV)").font(.caption2.weight(.bold)).foregroundStyle(Theme.playerO)
            HStack {
                Stepper(sizeLabel, value: $largeBoards.size, in: 1...8)
                    .accessibilityLabel("Board size")
                    .accessibilityValue(sizeLabel)
                Toggle("2D", isOn: $largeBoards.isFlat).labelsHidden()
                Text("2D").font(.caption)
            }
            .padding(.horizontal, 14).padding(.vertical, 8)
            .glassEffect(.regular, in: .rect(cornerRadius: 16))
        }
        .frame(maxWidth: 360)
        .padding(.horizontal, 28)
    }

    private var sizeLabel: String {
        largeBoards.size == 1 ? "The Void" : largeBoards.isFlat ? "\(largeBoards.size)×\(largeBoards.size) flat" : "\(largeBoards.size)×\(largeBoards.size)×\(largeBoards.size)"
    }
}
