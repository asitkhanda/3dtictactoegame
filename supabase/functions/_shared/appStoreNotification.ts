// What to do with an App Store Server Notification (version 2) about a purchase.
//
// Kept free of imports and of any Deno or Supabase API so it can be unit-tested
// with the web tests. The signature checks and database writes live in the
// app-store-notifications function.
//
// https://developer.apple.com/documentation/appstoreservernotifications/notificationtype

export interface NotificationPayload {
  notificationType: string;
  subtype?: string;
  signedDate: number;
  data?: {
    bundleId?: string;
    environment?: string;
    signedTransactionInfo?: string;
  };
}

export interface NotificationTransaction {
  originalTransactionId: string;
  bundleId: string;
  productId: string;
  revocationDate?: number;
}

export type NotificationDecision =
  | { action: 'revoke'; originalTransactionId: string; revokedAt: number }
  | { action: 'restore'; originalTransactionId: string; signedAt: number }
  | { action: 'ignore'; reason: string };

/** Notification types that mean the player no longer has the purchase. */
const REVOKING = new Set(['REFUND', 'REVOKE']);

export function decideNotification(
  notification: NotificationPayload,
  transaction: NotificationTransaction | null,
  expected: { bundleId: string; productId: string },
): NotificationDecision {
  const type = notification.notificationType;

  if (type !== 'REFUND' && type !== 'REVOKE' && type !== 'REFUND_REVERSED') {
    return { action: 'ignore', reason: `not relevant: ${type}` };
  }
  if (!transaction) return { action: 'ignore', reason: 'no transaction attached' };
  if (transaction.bundleId !== expected.bundleId || transaction.productId !== expected.productId) {
    return { action: 'ignore', reason: 'a different app or product' };
  }

  if (REVOKING.has(type)) {
    // Apple's own refund time is the right "revoked at"; fall back to when it told us.
    return {
      action: 'revoke',
      originalTransactionId: transaction.originalTransactionId,
      revokedAt: transaction.revocationDate ?? notification.signedDate,
    };
  }
  return {
    action: 'restore',
    originalTransactionId: transaction.originalTransactionId,
    signedAt: notification.signedDate,
  };
}

/**
 * True when a receipt predates a refund and so must not grant access again:
 * the same purchase was already revoked, and this receipt was made before then.
 * A fresh purchase after the refund has a later purchase date and passes.
 */
export function isStaleAfterRefund(revokedAt: string | null, purchaseDate: number): boolean {
  if (!revokedAt) return false;
  return purchaseDate <= Date.parse(revokedAt);
}
