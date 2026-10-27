// Receives App Store Server Notifications (version 2) and keeps the
// 'large_boards' entitlement in step with refunds.
//
// Apple calls this with POST { signedPayload } and no Authorization header, so the
// function is deployed with verify_jwt off. It authenticates the request the only
// way that matters: the payload is a JWS whose certificate chain must lead to the
// pinned Apple root (see _shared/appStoreTransaction.ts), so nobody else can forge
// one. Set the same URL as both the Production and Sandbox server URL in
// App Store Connect (App Information > App Store Server Notifications).
//
// REFUND / REVOKE      -> stamp revoked_at, which turns create_match's check off
// REFUND_REVERSED      -> clear revoked_at again
// anything else        -> acknowledged and ignored
//
// Always answer 200 once the signature checks out: Apple retries any other status
// for days, and an irrelevant notification should not be retried.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { decideNotification, type NotificationPayload } from '../_shared/appStoreNotification.ts';
import { type AppStoreTransaction, verifyAppleJws } from '../_shared/appStoreTransaction.ts';

const BUNDLE_ID = 'com.twistedtac.TwistedTac';
const PRODUCT_ID = 'com.twistedtac.TwistedTac.largeboards';
const FEATURE = 'large_boards';

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const body = await req.json().catch(() => ({}));
  const signedPayload = typeof body?.signedPayload === 'string' ? body.signedPayload : '';
  if (!signedPayload) return json({ error: 'Missing payload' }, 400);

  let notification: NotificationPayload & { signedDate: number };
  let transaction: AppStoreTransaction | null = null;
  try {
    notification = await verifyAppleJws<NotificationPayload & { signedDate: number }>(signedPayload);
    const signedTransaction = notification.data?.signedTransactionInfo;
    if (signedTransaction) transaction = await verifyAppleJws<AppStoreTransaction>(signedTransaction);
  } catch (error) {
    console.error('Notification verification failed', (error as Error).message);
    return json({ error: 'Could not verify the notification' }, 400);
  }

  const decision = decideNotification(notification, transaction, { bundleId: BUNDLE_ID, productId: PRODUCT_ID });
  if (decision.action === 'ignore') return json({ ok: true, ignored: decision.reason });

  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const query = admin
      .from('entitlements')
      .update({ revoked_at: decision.action === 'revoke' ? new Date(decision.revokedAt).toISOString() : null })
      .eq('feature', FEATURE)
      .eq('original_transaction_id', decision.originalTransactionId);

    // A reversal only counts if it is newer than the refund it undoes.
    const { error } = decision.action === 'restore'
      ? await query.lt('revoked_at', new Date(decision.signedAt).toISOString())
      : await query;
    if (error) {
      console.error('Entitlement update failed', error.message);
      return json({ error: 'Could not update the entitlement' }, 500); // 5xx: Apple retries
    }
    return json({ ok: true, applied: decision.action });
  } catch (error) {
    console.error('Notification handling failed', (error as Error).message);
    return json({ error: 'Could not handle the notification' }, 500);
  }
});
