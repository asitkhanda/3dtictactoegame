import SwiftUI
import TwistedTacKit

struct LandingView: View {
    let onNavigate: (Destination) -> Void

    @Environment(AuthManager.self) private var auth
    @State private var showRules = false
    @State private var showSignIn = false
    #if DEBUG
    @State private var debugSize = 3
    @State private var debugFlat = false
    #endif

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
                        Button {} label: {
                            Label("Online (coming soon)", systemImage: "globe")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.glass)
                        .disabled(true)
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

                #if DEBUG
                debugPicker
                #endif

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

    private var boardSize: Int {
        #if DEBUG
        debugSize
        #else
        3
        #endif
    }

    private var boardViewMode: ViewMode {
        #if DEBUG
        debugFlat ? .flat : .cube
        #else
        .cube
        #endif
    }

    #if DEBUG
    /// Stands in for the web's Konami-code secret board sizes until that is ported.
    private var debugPicker: some View {
        VStack(spacing: 6) {
            Text("DEBUG · secret board sizes").font(.caption2).foregroundStyle(Theme.muted)
            HStack {
                Stepper("Size \(debugSize)", value: $debugSize, in: 1...8)
                Toggle("2D", isOn: $debugFlat).labelsHidden()
                Text("2D").font(.caption)
            }
            .padding(.horizontal, 14).padding(.vertical, 8)
            .glassEffect(.regular, in: .rect(cornerRadius: 16))
        }
        .frame(maxWidth: 360)
        .padding(.horizontal, 28)
    }
    #endif
}
