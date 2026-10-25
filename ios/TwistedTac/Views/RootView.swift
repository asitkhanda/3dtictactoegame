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
        }
    }
}
