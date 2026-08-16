import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  applyMove,
  createGameRulesConfig,
  isValidGameRulesConfig,
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
    if (!matchId || typeof matchId !== 'string' || !Number.isInteger(cellIndex)) {
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

    const configInput = match.config as { size?: unknown; viewMode?: unknown };
    if (
      !Number.isInteger(configInput.size) ||
      configInput.size < 1 ||
      configInput.size > 8 ||
      (configInput.viewMode !== '2D' && configInput.viewMode !== '3D')
    ) {
      return json({ error: 'Invalid match configuration' }, 500);
    }

    const config = createGameRulesConfig(
      configInput.size as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8,
      configInput.viewMode
    );
    if (!isValidGameRulesConfig(config) || cellIndex < 0 || cellIndex >= config.cellCount) {
      return json({ error: 'Invalid move' }, 400);
    }
    const board = match.board as BoardState;
    const layerWinners = match.layer_winners as LayerResult[];
    const result = applyMove(config, board, layerWinners, cellIndex, match.is_x_next);
    if (!result) return json({ error: 'Invalid move' }, 400);

    const nextTurnUserId = result.isXNext
      ? getPlayerUserId(match, 'X')
      : getPlayerUserId(match, 'O');

    const finished = Boolean(result.winner || result.draw);
    const { data: updated, error: updateError } = await adminClient.rpc('commit_match_move', {
      p_match_id: matchId,
      p_expected_revision: match.revision,
      p_board: result.board,
      p_layer_winners: result.layerWinners,
      p_is_x_next: result.isXNext,
      p_winner: result.winner,
      p_draw: result.draw,
      p_current_turn_user_id: finished ? null : nextTurnUserId,
      p_status: finished ? 'finished' : 'active',
    });

    if (updateError) {
      const isConflict = updateError.message.includes('Match state conflict');
      return json({ error: isConflict ? 'Match changed; refresh and try again.' : updateError.message }, isConflict ? 409 : 500);
    }

    return json({ match: updated });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});
