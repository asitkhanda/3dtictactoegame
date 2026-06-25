import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { GameMode } from '../utils/gameConfig';

export type GameOutcome = 'win' | 'loss' | 'draw';

export function getLocalOutcome(
  mode: GameMode,
  winner: 'X' | 'O' | null,
  draw: boolean
): GameOutcome | null {
  if (draw) return 'draw';
  if (!winner) return null;
  if (mode === 'PVE') return winner === 'X' ? 'win' : 'loss';
  return 'win';
}

export function getPointsForOutcome(mode: GameMode, outcome: GameOutcome): number {
  if (outcome === 'win') {
    if (mode === 'PVE') return 10;
    if (mode === 'PVP') return 15;
    if (mode === 'PVP_ONLINE') return 25;
  }
  if (outcome === 'draw') {
    if (mode === 'PVE') return 3;
    if (mode === 'PVP' || mode === 'PVP_ONLINE') return 5;
  }
  if (outcome === 'loss' && mode === 'PVP_ONLINE') return -5;
  return 0;
}

export async function recordGameResult(
  mode: GameMode,
  boardSize: number,
  outcome: GameOutcome,
  opponentId?: string | null,
  matchId?: string | null
): Promise<{ error: string | null; pointsEarned: number }> {
  if (!isSupabaseConfigured) {
    return { error: 'Supabase not configured', pointsEarned: 0 };
  }

  const pointsEarned = getPointsForOutcome(mode, outcome);

  const { error } = await supabase.rpc('record_game_result', {
    p_mode: mode,
    p_board_size: boardSize,
    p_outcome: outcome,
    p_opponent_id: opponentId ?? null,
    p_match_id: matchId ?? null,
  });

  return { error: error?.message ?? null, pointsEarned };
}
