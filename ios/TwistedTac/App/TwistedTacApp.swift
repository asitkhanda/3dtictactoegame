import SwiftUI

@main
struct TwistedTacApp: App {
    @State private var settings = GameSettings()
    @State private var auth = AuthManager()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(settings)
                .environment(auth)
                .preferredColorScheme(.dark)
        }
    }
}
