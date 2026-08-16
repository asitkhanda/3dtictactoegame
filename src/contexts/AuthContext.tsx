import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Profile } from '../types/database';
import { logger } from '../utils/logger';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  needsUsername: boolean;
  isConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setUsername: (username: string) => Promise<{ error: string | null }>;
  checkUsernameAvailable: (username: string) => Promise<boolean>;
  updateProfile: (fields: { display_name?: string | null; avatar_url?: string | null }) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    logger.error('Failed to load profile', error);
    return null;
  }
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  const refreshProfile = useCallback(async () => {
    if (!session?.user?.id) {
      setProfile(null);
      setProfileLoaded(true);
      return;
    }
    const next = await fetchProfile(session.user.id);
    setProfile(next);
    setProfileLoaded(true);
  }, [session?.user?.id]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user?.id) {
      setProfile(null);
      setProfileLoaded(!session?.user);
      return;
    }
    setProfileLoaded(false);
    void refreshProfile();
  }, [session?.user?.id, refreshProfile]);

  const signInWithGoogle = useCallback(async () => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env');
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const setUsername = useCallback(async (username: string) => {
    if (!isSupabaseConfigured) return { error: 'Supabase not configured' };
    const { data, error } = await supabase.rpc('set_username', {
      desired_username: username.trim(),
    });
    if (error) return { error: error.message };
    setProfile(data);
    return { error: null };
  }, []);

  const checkUsernameAvailable = useCallback(async (username: string) => {
    if (!isSupabaseConfigured) return false;
    const { data, error } = await supabase.rpc('check_username_available', {
      desired_username: username.trim(),
    });
    if (error) return false;
    return Boolean(data);
  }, []);

  const updateProfile = useCallback(
    async (fields: { display_name?: string | null; avatar_url?: string | null }) => {
      if (!session?.user?.id || !isSupabaseConfigured) {
        return { error: 'Not authenticated' };
      }
      const { data, error } = await supabase
        .from('profiles')
        .update(fields)
        .eq('id', session.user.id)
        .select('*')
        .single();
      if (error) return { error: error.message };
      setProfile(data);
      return { error: null };
    },
    [session?.user?.id]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      needsUsername: Boolean(session?.user && profileLoaded && !profile?.username),
      isConfigured: isSupabaseConfigured,
      signInWithGoogle,
      signOut,
      refreshProfile,
      setUsername,
      checkUsernameAvailable,
      updateProfile,
    }),
    [
      session,
      profile,
      profileLoaded,
      loading,
      signInWithGoogle,
      signOut,
      refreshProfile,
      setUsername,
      checkUsernameAvailable,
      updateProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
