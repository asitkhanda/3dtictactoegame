import Foundation
import Observation
import StoreKit
import Supabase

/// The one-time "Larger Boards" purchase (StoreKit 2, non-consumable).
///
/// The App Store is the source of truth on this device: ownership comes from
/// `Transaction.currentEntitlements`, so it survives reinstalls and works for
/// local games with no account. Online play is enforced by the server, so when
/// the player is signed in the signed transaction is also sent to the
/// `verify-purchase` function, which records the entitlement on their account.
@Observable
final class PurchaseManager {
    static let productID = "com.twistedtac.TwistedTac.largeboards"

    enum Activity: Equatable { case idle, purchasing, restoring }

    private(set) var product: Product?
    private(set) var ownsLargeBoards = false
    private(set) var activity = Activity.idle
    /// A short, player-facing result of the last attempt (nil when there is nothing to say).
    private(set) var message: String?

    /// Signed form of the owned transaction, kept so it can be sent to the server.
    private var ownedTransactionJWS: String?
    private var syncedUserID: String?

    init() {
        // Lives as long as the app, so the listener is never cancelled.
        Task { [weak self] in
            for await update in Transaction.updates {
                await self?.process(update)
            }
        }
    }

    // MARK: Loading

    /// Fetches the product (for its localized price) and the current ownership.
    func load() async {
        product = try? await Product.products(for: [Self.productID]).first
        await refreshOwnership()
    }

    private func refreshOwnership() async {
        var owned: String?
        for await result in Transaction.currentEntitlements {
            if case .verified(let transaction) = result,
               transaction.productID == Self.productID,
               transaction.revocationDate == nil {
                owned = result.jwsRepresentation
            }
        }
        ownedTransactionJWS = owned
        ownsLargeBoards = owned != nil
    }

    // MARK: Buying and restoring

    func purchase() async {
        guard let product, activity == .idle else { return }
        activity = .purchasing
        message = nil
        defer { activity = .idle }
        do {
            switch try await product.purchase() {
            case .success(let result):
                await process(result)
            case .pending:
                message = "Your purchase is waiting for approval."
            case .userCancelled:
                break
            @unknown default:
                break
            }
        } catch {
            message = "The purchase couldn't be completed. You haven't been charged."
        }
    }

    /// Re-checks purchases made with this Apple Account (needed on a new device).
    func restore() async {
        guard activity == .idle else { return }
        activity = .restoring
        message = nil
        defer { activity = .idle }
        do {
            try await AppStore.sync()
        } catch {
            message = "Couldn't reach the App Store. Please try again."
            return
        }
        await refreshOwnership()
        if !ownsLargeBoards { message = "No earlier purchase was found for this Apple Account." }
    }

    private func process(_ result: VerificationResult<Transaction>) async {
        switch result {
        case .verified(let transaction):
            if transaction.productID == Self.productID {
                await refreshOwnership()
            }
            await transaction.finish()
        case .unverified:
            message = "The App Store couldn't verify that purchase."
        }
    }

    // MARK: Server sync

    /// Records the purchase on the signed-in account so online games can use
    /// larger boards. Safe to call repeatedly; it does nothing until there is
    /// both a purchase and a signed-in player, and only once per account.
    func syncToAccount(userID: String) async {
        guard let jws = ownedTransactionJWS, syncedUserID != userID, let client = Backend.client else { return }
        do {
            try await client.functions.invoke(
                "verify-purchase",
                options: FunctionInvokeOptions(body: VerifyBody(signedTransaction: jws))
            )
            syncedUserID = userID
        } catch {
            // Local unlock still works; the next launch or sign-in tries again.
        }
    }

    private nonisolated struct VerifyBody: Encodable { let signedTransaction: String }
}
