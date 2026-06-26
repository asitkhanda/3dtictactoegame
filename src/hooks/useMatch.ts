import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { MatchRow } from '../types/database';
import { getMatch, updateMatchPresence } from '../services/matchService';

export type ConnectionStatus = 'synced' | 'reconnecting' | 'error';

export function useMatch(matchId: string | undefined, userId: string | undefined) {
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('reconnecting');
  const [error, setError] = useState<string | null>(null);
  const presenceInterval = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    if (!matchId || !isSupabaseConfigured) return;
    const { match: next, error: fetchError } = await getMatch(matchId);
    if (fetchError) {
      setError(fetchError);
      setConnectionStatus('error');
      return;
    }
    setMatch(next);
    setConnectionStatus('synced');
    setError(null);
  }, [matchId]);

  useEffect(() => {
    if (!matchId || !isSupabaseConfigured) return;

    void refresh();

    const channel = supabase
      .channel(`match:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${matchId}`,
        },
        (payload) => {
          setMatch(payload.new as MatchRow);
          setConnectionStatus('synced');
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void refresh();
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionStatus('reconnecting');
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [matchId, refresh]);

  useEffect(() => {
    if (!matchId || !userId || !isSupabaseConfigured) return;

    void updateMatchPresence(matchId, true);

    presenceInterval.current = window.setInterval(() => {
      void updateMatchPresence(matchId, true);
    }, 30000);

    const handleOffline = () => setConnectionStatus('reconnecting');
    const handleOnline = () => {
      setConnectionStatus('reconnecting');
      void updateMatchPresence(matchId, true);
      void refresh();
    };
    const handleBeforeUnload = () => {
      void updateMatchPresence(matchId, false);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (presenceInterval.current) clearInterval(presenceInterval.current);
      void updateMatchPresence(matchId, false);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [matchId, userId, refresh]);

  const applyMatch = useCallback((next: MatchRow) => {
    setMatch(next);
    setConnectionStatus('synced');
    setError(null);
  }, []);

  const opponentDisconnected =
    match && userId
      ? userId === match.host_id
        ? Boolean(match.guest_disconnected_at)
        : Boolean(match.host_disconnected_at)
      : false;

  return {
    match,
    connectionStatus,
    error,
    opponentDisconnected,
    refresh,
    applyMatch,
  };
}
