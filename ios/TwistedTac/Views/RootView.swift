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
    #endif
}

struct RootView: View {
    @Environment(GameSettings.self) private var settings
    @Environment(AuthManager.self) private var auth
    @State private var path: [Destination] = []

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
        .onAppear {
            ArcadeFeedback.shared.settings = settings
            auth.start()
            #if DEBUG
            if let preview = DebugOnlinePreview.scenario {
                path = [.debugOnline(preview)]
            }
            #endif
        }
    }
}
