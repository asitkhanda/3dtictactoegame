import SwiftUI

@main
struct TwistedTacApp: App {
    @State private var settings = GameSettings()
    @State private var auth = AuthManager()
    @State private var largeBoards = LargeBoards()
    @State private var purchases = PurchaseManager()
    @State private var links = DeepLinkRouter()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(settings)
                .environment(auth)
                .environment(largeBoards)
                .environment(purchases)
                .environment(links)
                .preferredColorScheme(.dark)
                .task { await purchases.load() }
                .onChange(of: purchases.ownsLargeBoards, initial: true) { _, owns in
                    largeBoards.purchased = owns
                }
                .task(id: SyncKey(userID: auth.profile?.id, owns: purchases.ownsLargeBoards)) {
                    // Record the purchase on the account so online games accept larger boards.
                    guard auth.phase == .ready, purchases.ownsLargeBoards, let id = auth.profile?.id else { return }
                    await purchases.syncToAccount(userID: id)
                }
        }
    }

    private struct SyncKey: Equatable {
        let userID: String?
        let owns: Bool
    }
}
