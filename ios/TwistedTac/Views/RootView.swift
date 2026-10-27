import SwiftUI
import TwistedTacKit

/// A request to start a local game from the landing screen.
struct GameRoute: Hashable {
    let mode: LocalMode
    let size: Int
    let viewMode: ViewMode
}

enum Destination: Hashable {
    case game(GameRoute)
    case leaderboard
    case profile
    case lobby(size: Int, viewMode: ViewMode)
    case online(MatchRow)
    #if DEBUG
    case debugOnline(String)
    case debugBoard(String)
    #endif
}

struct RootView: View {
    @Environment(GameSettings.self) private var settings
    @Environment(AuthManager.self) private var auth
    @Environment(DeepLinkRouter.self) private var links
    @State private var path: [Destination] = []
    @State private var showInviteSignIn = false
    @State private var joiningInvite = false

    var body: some View {
        NavigationStack(path: $path) {
            LandingView { path.append($0) }
                .navigationDestination(for: Destination.self) { destination in
                    switch destination {
                    case let .game(route):
                        if let config = GameRulesConfig(size: route.size, viewMode: route.viewMode) {
                            GameView(model: LocalGameModel(config: config, mode: route.mode))
                                .toolbar(.hidden, for: .navigationBar)
                        }
                    case .leaderboard:
                        LeaderboardView()
                    case .profile:
                        ProfileView()
                    case let .lobby(size, viewMode):
                        OnlineLobbyView(size: size, viewMode: viewMode) { path.append($0) }
                    #if DEBUG
                    case let .debugOnline(name):
                        DebugOnlinePreview.view(for: name)
                            .toolbar(.hidden, for: .navigationBar)
                    case let .debugBoard(spec):
                        DebugOnlinePreview.boardView(for: spec)
                            .toolbar(.hidden, for: .navigationBar)
                    #endif
                    case let .online(match):
                        if let userID = auth.userID, let model = OnlineMatchModel(match: match, userID: userID) {
                            OnlineGameView(model: model)
                                .toolbar(.hidden, for: .navigationBar)
                        } else {
                            ContentUnavailableView("Can't open this match", systemImage: "exclamationmark.triangle")
                        }
                    }
                }
        }
        // A new account can't do anything online until it has a username.
        .sheet(isPresented: .constant(auth.phase == .needsUsername)) {
            UsernameOnboardingSheet()
        }
        .sheet(isPresented: $showInviteSignIn) { SignInSheet() }
        .onOpenURL { url in
            // Invite links start a join; the Google sign-in return finishes a login.
            if !links.handle(url) { Task { await auth.handleCallback(url) } }
        }
        .task(id: InviteState(code: links.pendingRoomCode, phase: auth.phase)) { await continueInvite() }
        .alert("Couldn't join that room", isPresented: .constant(links.errorMessage != nil)) {
            Button("OK") { links.errorMessage = nil }
        } message: {
            Text(links.errorMessage ?? "")
        }
        .onAppear {
            ArcadeFeedback.shared.settings = settings
            auth.start()
            #if DEBUG
            if let preview = DebugOnlinePreview.scenario {
                path = [.debugOnline(preview)]
            } else if let spec = DebugOnlinePreview.boardSpec {
                path = [.debugBoard(spec)]
            }
            #endif
        }
    }

    private struct InviteState: Equatable {
        let code: String?
        let phase: AuthManager.Phase
    }

    /// An opened invite link waits for sign-in, then joins the room.
    private func continueInvite() async {
        guard let code = links.pendingRoomCode else { return }
        switch auth.phase {
        case .loading, .needsUsername:
            return   // the username sheet is already up; resume once ready
        case .signedOut:
            showInviteSignIn = auth.isConfigured
        case .ready:
            guard !joiningInvite else { return }
            joiningInvite = true
            defer { joiningInvite = false }
            links.consume()
            do {
                let match = try await MatchService.joinMatch(code: code)
                path = [.online(match)]
            } catch {
                links.errorMessage = error.localizedDescription
            }
        }
    }
}
