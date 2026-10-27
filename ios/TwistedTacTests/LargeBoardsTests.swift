import Testing
import TwistedTacKit
@testable import TwistedTac

@MainActor
struct LargeBoardsTests {
    @Test func lockedPlayersGetTheClassicBoard() {
        let boards = LargeBoards(debugUnlocked: false)
        boards.size = 6
        boards.isFlat = true
        #expect(!boards.isUnlocked)
        #expect(boards.effectiveSize == 3)
        #expect(boards.effectiveViewMode == .cube)
    }

    @Test func purchaseUnlocksEverySizeAndFlat() {
        let boards = LargeBoards(debugUnlocked: false)
        boards.purchased = true
        boards.size = 6
        boards.isFlat = true
        #expect(boards.isUnlocked)
        #expect(boards.effectiveSize == 6)
        #expect(boards.effectiveViewMode == .flat)
    }

    @Test func productIDMatchesTheServerFunction() {
        #expect(PurchaseManager.productID == "com.twistedtac.TwistedTac.largeboards")
    }
}
