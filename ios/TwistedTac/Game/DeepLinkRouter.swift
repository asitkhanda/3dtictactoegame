import Foundation
import Observation
import TwistedTacKit

/// Turns an opened invite link into a pending room code. RootView joins it as
/// soon as the player is signed in and ready.
@Observable
final class DeepLinkRouter {
    private(set) var pendingRoomCode: String?
    var errorMessage: String?

    /// Returns true if the URL was one of ours.
    @discardableResult
    func handle(_ url: URL) -> Bool {
        guard let code = InviteLink.roomCode(from: url) else { return false }
        pendingRoomCode = code
        return true
    }

    func consume() { pendingRoomCode = nil }
}
