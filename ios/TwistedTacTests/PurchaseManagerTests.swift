import Foundation
import StoreKit
import StoreKitTest
import Testing
@testable import TwistedTac

/// Runs the real purchase code against the local StoreKit configuration
/// (Config/TwistedTac.storekit), so no App Store account is involved.
@MainActor
@Suite(.timeLimit(.minutes(1)))
struct PurchaseManagerTests {
    private func makeSession() throws -> SKTestSession {
        let url = try #require(Bundle(for: BundleToken.self).url(forResource: "TwistedTac", withExtension: "storekit"))
        let session = try SKTestSession(contentsOf: url)
        session.resetToDefaultState()
        session.clearTransactions()
        session.disableDialogs = true
        session.askToBuyEnabled = false
        return session
    }

    @Test func loadsTheProductAtRs150() async throws {
        _ = try makeSession()
        let purchases = PurchaseManager()
        await purchases.load()
        let product = try #require(purchases.product)
        #expect(product.id == PurchaseManager.productID)
        #expect(product.type == .nonConsumable)
        #expect(product.price == 150)
        #expect(!purchases.ownsLargeBoards)
    }

    @Test func buyingUnlocksAndRestoreFindsItAgain() async throws {
        let session = try makeSession()
        let purchases = PurchaseManager()
        await purchases.load()

        await purchases.purchase()
        #expect(purchases.ownsLargeBoards)

        // A fresh manager (a reinstall) still knows about the purchase.
        let reinstalled = PurchaseManager()
        await reinstalled.load()
        #expect(reinstalled.ownsLargeBoards)

        // A refund removes it.
        let transaction = try #require(session.allTransactions().first)
        try session.refundTransaction(identifier: transaction.identifier)
        // StoreKit applies the refund asynchronously, so give it a moment.
        let afterRefund = PurchaseManager()
        for _ in 0..<20 {
            await afterRefund.load()
            if !afterRefund.ownsLargeBoards { break }
            try await Task.sleep(for: .milliseconds(250))
        }
        #expect(!afterRefund.ownsLargeBoards)
    }

    @Test func restoreWithNothingBoughtSaysSo() async throws {
        _ = try makeSession()
        let purchases = PurchaseManager()
        await purchases.load()
        await purchases.restore()
        #expect(!purchases.ownsLargeBoards)
        #expect(purchases.message != nil)
    }
}

private final class BundleToken {}
