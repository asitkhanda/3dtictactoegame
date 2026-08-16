import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  createGameRulesConfig,
  isValidGameRulesConfig,
  type BoardState,
  type LayerResult,
} from '../_shared/gameRules.ts';
import { chooseTimeoutWinner } from '../_shared/timeoutResolution.ts';

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

Deno.serve(async (req) => {
  const configuredSecret = Deno.env.get('STALE_MATCH_SECRET');
  if (!configuredSecret || req.headers.get('x-cron-secret') !== configuredSecret) {
    return json({ error: 'Unauthorized' }, 401);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: matches, error } = await admin
      .from('matches')
      .select('*')
      .eq('status', 'active');

    if (error) return json({ error: error.message }, 500);

    let settled = 0;
    for (const match of matches ?? []) {
      const hostDisconnected = Boolean(match.host_disconnected_at);
      const guestDisconnected = Boolean(match.guest_disconnected_at);
      if (hostDisconnected === guestDisconnected) continue;

      const disconnectedAt = hostDisconnected
        ? match.host_disconnected_at
        : match.guest_disconnected_at;
      if (!disconnectedAt || Date.now() - Date.parse(disconnectedAt) < 10 * 60 * 1000) continue;

      const rawConfig = match.config as { size?: unknown; viewMode?: unknown };
      if (
        !Number.isInteger(rawConfig.size) ||
        rawConfig.size < 1 ||
        rawConfig.size > 8 ||
        (rawConfig.viewMode !== '2D' && rawConfig.viewMode !== '3D')
      ) continue;

      const config = createGameRulesConfig(
        rawConfig.size as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8,
        rawConfig.viewMode
      );
      if (!isValidGameRulesConfig(config)) continue;

      const connectedPlayerId = hostDisconnected ? match.guest_id : match.host_id;
      const connectedPlayer: 'X' | 'O' =
        connectedPlayerId === (match.host_plays_x ? match.host_id : match.guest_id) ? 'X' : 'O';
      const winner = chooseTimeoutWinner(
        config,
        match.board as BoardState,
        match.layer_winners as LayerResult[],
        connectedPlayer
      );

      const { data: settledMatch, error: settleError } = await admin.rpc('settle_stale_match', {
        p_match_id: match.id,
        p_expected_revision: match.revision,
        p_winner: winner,
        p_draw: false,
        p_reason: 'disconnect_timeout',
      });
      if (!settleError && settledMatch?.status === 'finished') settled++;
    }

    return json({ settled });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});
