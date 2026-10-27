// Grants the 'large_boards' entitlement after an App Store purchase.
//
// The iOS app sends the StoreKit 2 signed transaction (a JWS) for the one-time
// "Larger Boards" purchase. This checks Apple's signature, that it is for this
// app and product and hasn't been refunded, and then records the entitlement
// with the service role (players can't write to the entitlements table).
//
// Request: POST { signedTransaction: string } with the user's JWT.
// Idempotent: the app calls it on every launch while signed in and owning it.
//
// Deploy with verify_jwt on. Secrets used: none beyond the built-in Supabase ones.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { verifyAppStoreTransaction } from '../_shared/appStoreTransaction.ts';

const BUNDLE_ID = 'com.twistedtac.TwistedTac';
const PRODUCT_ID = 'com.twistedtac.TwistedTac.largeboards';
const FEATURE = 'large_boards';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: CORS_HEADERS });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const signedTransaction = typeof body?.signedTransaction === 'string' ? body.signedTransaction : '';
    if (!signedTransaction) return json({ error: 'Missing transaction' }, 400);

    let transaction;
    try {
      transaction = await verifyAppStoreTransaction(signedTransaction);
    } catch (error) {
      console.error('Transaction verification failed', (error as Error).message);
      return json({ error: 'Could not verify the purchase' }, 400);
    }

    if (transaction.bundleId !== BUNDLE_ID || transaction.productId !== PRODUCT_ID) {
      return json({ error: 'This purchase is not for Larger Boards' }, 400);
    }
    if (transaction.revocationDate) return json({ error: 'This purchase was refunded' }, 400);
    // TestFlight and App Review purchases are signed as Sandbox.
    if (transaction.environment !== 'Production' && transaction.environment !== 'Sandbox') {
      return json({ error: 'Unsupported purchase environment' }, 400);
    }

    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // One purchase unlocks one account (unique index in migration 013).
    const { data: existing, error: lookupError } = await admin
      .from('entitlements')
      .select('user_id')
      .eq('original_transaction_id', transaction.originalTransactionId)
      .maybeSingle();
    if (lookupError) return json({ error: lookupError.message }, 500);
    if (existing && existing.user_id !== user.id) {
      return json({ error: 'This purchase is already linked to another account' }, 409);
    }

    const { error } = await admin.from('entitlements').upsert(
      {
        user_id: user.id,
        feature: FEATURE,
        source: `app_store_${transaction.environment.toLowerCase()}`,
        original_transaction_id: transaction.originalTransactionId,
      },
      { onConflict: 'user_id,feature' },
    );
    if (error) return json({ error: error.message }, 500);

    return json({ granted: true });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});
