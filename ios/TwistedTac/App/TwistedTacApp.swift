import SwiftUI

@main
struct TwistedTacApp: App {
    @State private var settings = GameSettings()
    @State private var auth = AuthManager()
    @State private var largeBoards = LargeBoards()
    @State private var links = DeepLinkRouter()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(settings)
                .environment(auth)
                .environment(largeBoards)
                .environment(links)
                .preferredColorScheme(.dark)
        }
    }
}
