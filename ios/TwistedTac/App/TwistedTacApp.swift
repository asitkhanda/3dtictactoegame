import SwiftUI

@main
struct TwistedTacApp: App {
    @State private var settings = GameSettings()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(settings)
                .preferredColorScheme(.dark)
        }
    }
}
