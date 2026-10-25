import SwiftUI
import TwistedTacKit

/// A request to start a local game from the landing screen.
struct GameRoute: Hashable {
    let mode: LocalMode
    let size: Int
    let viewMode: ViewMode
}

struct RootView: View {
    @Environment(GameSettings.self) private var settings
    @State private var path: [GameRoute] = []

    var body: some View {
        NavigationStack(path: $path) {
            LandingView { route in path.append(route) }
                .navigationDestination(for: GameRoute.self) { route in
                    if let config = GameRulesConfig(size: route.size, viewMode: route.viewMode) {
                        GameView(model: LocalGameModel(config: config, mode: route.mode))
                            .toolbar(.hidden, for: .navigationBar)
                    }
                }
        }
        .onAppear { ArcadeFeedback.shared.settings = settings }
    }
}
