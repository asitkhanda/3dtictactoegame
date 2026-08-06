import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  applyMove,
  createGameRulesConfig,
  type BoardState,
  type LayerResult,
} from '../_shared/gameRules.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: CORS_HEADERS });
}

function getPlayerUserId(match: Record<string, unknown>, player: 'X' | 'O') {
  const hostPlaysX = Boolean(match.host_plays_x);
  if (player === 'X') return hostPlaysX ? match.host_id : match.guest_id;
  return hostPlaysX ? match.guest_id : match.host_id;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { matchId, cellIndex } = await req.json();
    if (!matchId || typeof cellIndex !== 'number') {
      return json({ error: 'Invalid payload' }, 400);
    }

    const { data: match, error: fetchError } = await adminClient
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (fetchError || !match) return json({ error: 'Match not found' }, 404);
    if (match.status !== 'active') return json({ error: 'Match not active' }, 400);
    if (match.current_turn_user_id !== user.id) return json({ error: 'Not your turn' }, 403);
    if (user.id !== match.host_id && user.id !== match.guest_id) {
      return json({ error: 'Not a participant' }, 403);
    }

    const config = createGameRulesConfig(match.config.size, match.config.viewMode);
    const board = match.board as BoardState;
    const layerWinners = match.layer_winners as LayerResult[];
    const result = applyMove(config, board, layerWinners, cellIndex, match.is_x_next);
    if (!result) return json({ error: 'Invalid move' }, 400);

    const nextTurnUserId = result.isXNext
      ? getPlayerUserId(match, 'X')
      : getPlayerUserId(match, 'O');

    const finished = Boolean(result.winner || result.draw);
    const updates = {
      board: result.board,
      layer_winners: result.layerWinners,
      is_x_next: result.isXNext,
      winner: result.winner,
      draw: result.draw,
      status: finished ? 'finished' : 'active',
      current_turn_user_id: finished ? null : nextTurnUserId,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error: updateError } = await adminClient
      .from('matches')
      .update(updates)
      .eq('id', matchId)
      .select('*')
      .single();

    if (updateError) return json({ error: updateError.message }, 500);

    if (finished && match.host_id && match.guest_id) {
      const winner = result.winner as 'X' | 'O' | null;
      for (const player of ['X', 'O'] as const) {
        const playerId = getPlayerUserId(match, player) as string;
        const opponentId = getPlayerUserId(match, player === 'X' ? 'O' : 'X') as string;
        let outcome = 'draw';
        let pts = 5;
        if (!result.draw && winner) {
          outcome = winner === player ? 'win' : 'loss';
          pts = winner === player ? 25 : -5;
        }
        await adminClient.rpc('apply_match_result', {
          p_player_id: playerId,
          p_opponent_id: opponentId,
          p_board_size: match.config.size,
          p_match_id: matchId,
          p_outcome: outcome,
          p_points: pts,
        });
      }
    }

    return json({ match: updated });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});
