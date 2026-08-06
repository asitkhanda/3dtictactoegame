import { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Profile } from '../types/database';

export interface LeaderboardEntry extends Pick<
  Profile,
  'id' | 'username' | 'avatar_url' | 'points' | 'wins' | 'losses' | 'draws' | 'games_played'
> {}

export function useLeaderboard(userId?: string | null) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      // Dev-only sample data so the leaderboard is previewable without a backend.
      if (import.meta.env.DEV) {
        setEntries(
          [
            ['stackmaster', 420, 16, 2, 1],
            ['cube_crusher', 385, 14, 4, 2],
            ['neonninja', 310, 12, 5, 0],
            ['gridlock', 255, 10, 6, 3],
            ['depthcharge', 190, 7, 8, 1],
            ['voidwalker', 120, 5, 9, 0],
          ].map(([username, points, wins, losses, draws], i) => ({
            id: `mock-${i}`,
            username: username as string,
            avatar_url: null,
            points: points as number,
            wins: wins as number,
            losses: losses as number,
            draws: draws as number,
            games_played: (wins as number) + (losses as number) + (draws as number),
          }))
        );
        setLoading(false);
        return;
      }
      setLoading(false);
      setError('Leaderboard requires Supabase configuration.');
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, points, wins, losses, draws, games_played')
      .not('username', 'is', null)
      .gt('games_played', 0)
      .order('points', { ascending: false })
      .order('wins', { ascending: false })
      .limit(10);

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setEntries((data ?? []) as LeaderboardEntry[]);

    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('points, wins, games_played, username')
        .eq('id', userId)
        .maybeSingle();

      if (profile?.username && profile.games_played > 0) {
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .not('username', 'is', null)
          .gt('games_played', 0)
          .or(`points.gt.${profile.points},and(points.eq.${profile.points},wins.gt.${profile.wins})`);

        setUserRank((count ?? 0) + 1);
      } else {
        setUserRank(null);
      }
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { entries, userRank, loading, error, refresh: load };
}
