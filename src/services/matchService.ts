import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { MatchRow, Profile } from '../types/database';
import type { BoardSize } from '../utils/gameConfig';

export function getSymbolForUser(match: MatchRow, userId: string): 'X' | 'O' {
  const isHost = userId === match.host_id;
  if (isHost) return match.host_plays_x ? 'X' : 'O';
  return match.host_plays_x ? 'O' : 'X';
}

export function getUserIdForSymbol(match: MatchRow, symbol: 'X' | 'O'): string | null {
  if (symbol === 'X') return match.host_plays_x ? match.host_id : match.guest_id;
  return match.host_plays_x ? match.guest_id : match.host_id;
}

export async function createMatch(
  boardSize: BoardSize,
  viewMode: '2D' | '3D' = '3D'
): Promise<{ match: MatchRow | null; error: string | null }> {
  if (!isSupabaseConfigured) return { match: null, error: 'Supabase not configured' };

  const { data, error } = await supabase.rpc('create_match', {
    p_board_size: boardSize,
    p_view_mode: viewMode,
  });

  return { match: data, error: error?.message ?? null };
}

export async function joinMatchByCode(
  roomCode: string
): Promise<{ match: MatchRow | null; error: string | null }> {
  if (!isSupabaseConfigured) return { match: null, error: 'Supabase not configured' };

  const { data, error } = await supabase.rpc('join_match_by_code', {
    p_room_code: roomCode.toUpperCase().trim(),
  });

  return { match: data, error: error?.message ?? null };
}

export async function getMatch(matchId: string): Promise<{ match: MatchRow | null; error: string | null }> {
  if (!isSupabaseConfigured) return { match: null, error: 'Supabase not configured' };

  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .maybeSingle();

  return { match: data, error: error?.message ?? null };
}

export async function getActiveMatchForUser(): Promise<{ match: MatchRow | null; error: string | null }> {
  if (!isSupabaseConfigured) return { match: null, error: 'Supabase not configured' };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { match: null, error: null };

  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .or(`host_id.eq.${user.id},guest_id.eq.${user.id}`)
    .in('status', ['waiting', 'active'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return { match: data, error: error?.message ?? null };
}

export async function updateMatchPresence(
  matchId: string,
  connected: boolean
): Promise<void> {
  if (!isSupabaseConfigured) return;
  await supabase.rpc('update_match_presence', {
    p_match_id: matchId,
    p_connected: connected,
  });
}

export async function submitMatchMove(
  matchId: string,
  cellIndex: number
): Promise<{ match: MatchRow | null; error: string | null }> {
  if (!isSupabaseConfigured) return { match: null, error: 'Supabase not configured' };

  const { data, error } = await supabase.functions.invoke('submit-move', {
    body: { matchId, cellIndex },
  });

  if (error) return { match: null, error: error.message };
  if (data?.error) return { match: null, error: data.error as string };
  return { match: data?.match as MatchRow, error: null };
}

export function getInviteLink(roomCode: string): string {
  return `${window.location.origin}/join/${roomCode}`;
}

export async function getOpponentProfile(
  opponentId: string
): Promise<{ profile: Pick<Profile, 'username'> | null; error: string | null }> {
  if (!isSupabaseConfigured) return { profile: null, error: 'Supabase not configured' };

  const { data, error } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', opponentId)
    .maybeSingle();

  return { profile: data, error: error?.message ?? null };
}

export async function forfeitMatch(
  matchId: string
): Promise<{ match: MatchRow | null; error: string | null }> {
  if (!isSupabaseConfigured) return { match: null, error: 'Supabase not configured' };

  const { data, error } = await supabase.rpc('forfeit_match', {
    p_match_id: matchId,
  });

  return { match: data, error: error?.message ?? null };
}
