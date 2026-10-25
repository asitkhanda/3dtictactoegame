// Permanently deletes the signed-in player's account.
//
// App Store guideline 5.1.1(v) requires in-app account deletion, and Sign in
// with Apple additionally requires revoking the user's Apple token. Revocation
// needs a client secret signed with the Apple key, so it lives here rather than
// in the app. The secret is generated fresh on every call, so there is nothing
// that expires every six months.
//
// Secrets (supabase secrets set ...): APPLE_TEAM_ID, APPLE_KEY_ID,
// APPLE_PRIVATE_KEY (the .p8 file contents), APPLE_CLIENT_ID (the app's bundle ID).
//
// Request: POST { authorizationCode?: string } with the user's JWT. The code
// comes from a fresh Sign in with Apple the app asks for at deletion time.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { SignJWT, importPKCS8 } from 'npm:jose@5.9.6';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: CORS_HEADERS });
}

interface AppleConfig {
  teamId: string;
  keyId: string;
  privateKey: string;
  clientId: string;
}

function readAppleConfig(): AppleConfig | null {
  const teamId = Deno.env.get('APPLE_TEAM_ID');
  const keyId = Deno.env.get('APPLE_KEY_ID');
  const privateKey = Deno.env.get('APPLE_PRIVATE_KEY');
  const clientId = Deno.env.get('APPLE_CLIENT_ID');
  if (!teamId || !keyId || !privateKey || !clientId) return null;
  // Secrets are often stored with escaped newlines.
  return { teamId, keyId, privateKey: privateKey.replace(/\\n/g, '\n'), clientId };
}

/** Apple's "client secret" is a short-lived ES256 JWT signed with the .p8 key. */
async function appleClientSecret(config: AppleConfig): Promise<string> {
  const key = await importPKCS8(config.privateKey, 'ES256');
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: config.keyId })
    .setIssuer(config.teamId)
    .setSubject(config.clientId)
    .setAudience('https://appleid.apple.com')
    .setIssuedAt(now)
    .setExpirationTime(now + 300)
    .sign(key);
}

async function postForm(url: string, params: Record<string, string>): Promise<Response> {
  return await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
}

/** Exchanges the one-time authorization code for a refresh token, then revokes it. */
async function revokeAppleAccess(config: AppleConfig, authorizationCode: string): Promise<boolean> {
  const clientSecret = await appleClientSecret(config);

  const tokenResponse = await postForm('https://appleid.apple.com/auth/token', {
    client_id: config.clientId,
    client_secret: clientSecret,
    code: authorizationCode,
    grant_type: 'authorization_code',
  });
  if (!tokenResponse.ok) {
    console.error('Apple token exchange failed', tokenResponse.status, await tokenResponse.text());
    return false;
  }
  const { refresh_token: refreshToken } = await tokenResponse.json();
  if (!refreshToken) return false;

  const revokeResponse = await postForm('https://appleid.apple.com/auth/revoke', {
    client_id: config.clientId,
    client_secret: clientSecret,
    token: refreshToken,
    token_type_hint: 'refresh_token',
  });
  if (!revokeResponse.ok) {
    console.error('Apple revoke failed', revokeResponse.status, await revokeResponse.text());
  }
  return revokeResponse.ok;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const authorizationCode =
      typeof body?.authorizationCode === 'string' && body.authorizationCode ? body.authorizationCode : null;

    // Revoke first: once the auth user is deleted there is nothing to retry from.
    // A failure here must not trap someone in an account they asked to delete.
    const isAppleUser = (user.identities ?? []).some((identity) => identity.provider === 'apple');
    let appleRevoked = false;
    if (isAppleUser && authorizationCode) {
      const config = readAppleConfig();
      if (config) {
        try {
          appleRevoked = await revokeAppleAccess(config, authorizationCode);
        } catch (error) {
          console.error('Apple revocation threw', error);
        }
      } else {
        console.error('Apple secrets are not configured; skipping token revocation');
      }
    }

    // Forfeits any open match and deletes the auth user (migration 011).
    const { error } = await userClient.rpc('delete_my_account');
    if (error) return json({ error: error.message }, 500);

    return json({ deleted: true, appleRevoked });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});
