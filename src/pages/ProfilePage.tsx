import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AppHeader } from '../components/layout/AppHeader';
import { ArcadeShell } from '../components/ArcadeShell';
import { SignInButton } from '../components/auth/SignInButton';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { GameResult } from '../types/database';

export function ProfilePage() {
  const navigate = useNavigate();
  const {
    user,
    profile,
    loading,
    signOut,
    setUsername,
    updateProfile,
    checkUsernameAvailable,
    isConfigured,
  } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [activity, setActivity] = useState<GameResult[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) return;
    if (profile) {
      setDisplayName(profile.display_name ?? '');
      setAvatarUrl(profile.avatar_url ?? '');
      setUsernameInput(profile.username ?? '');
    }
  }, [profile, loading, user]);

  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured) return;
    void supabase
      .from('game_results')
      .select('*')
      .eq('player_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setActivity((data ?? []) as GameResult[]));
  }, [user?.id, profile?.games_played]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);

    if (profile && usernameInput !== profile.username) {
      const available = await checkUsernameAvailable(usernameInput);
      if (!available) {
        setError('Username unavailable or invalid.');
        setSaving(false);
        return;
      }
      const usernameResult = await setUsername(usernameInput);
      if (usernameResult.error) {
        setError(usernameResult.error);
        setSaving(false);
        return;
      }
    }

    const profileResult = await updateProfile({
      display_name: displayName.trim() || null,
      avatar_url: avatarUrl.trim() || null,
    });

    setSaving(false);
    if (profileResult.error) {
      setError(profileResult.error);
      return;
    }
    setMessage('Profile saved.');
  };

  if (!isConfigured) {
    return (
      <ArcadeShell variant="landing">
        <AppHeader />
        <main className="mx-auto max-w-lg px-4 pt-24 pb-10 text-center">
          <p className="font-body arcade-text-muted">Supabase is not configured.</p>
          <Link to="/" className="font-body mt-4 inline-block text-sm underline">Back home</Link>
        </main>
      </ArcadeShell>
    );
  }

  if (!loading && !user) {
    return (
      <ArcadeShell variant="landing">
        <AppHeader />
        <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 pt-24 pb-10 text-center">
          <h1 className="font-display text-2xl font-bold text-white">Profile</h1>
          <p className="font-body text-sm arcade-text-muted">Sign in to manage your profile and stats.</p>
          <SignInButton />
        </main>
      </ArcadeShell>
    );
  }

  return (
    <ArcadeShell variant="landing">
      <AppHeader />

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 pt-24 pb-10 sm:px-6">
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            <AvatarImage src={profile?.avatar_url ?? undefined} alt="" />
            <AvatarFallback>{profile?.username?.slice(0, 2).toUpperCase() ?? '?'}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-display text-2xl font-bold text-white">Profile</h1>
            <p className="font-body text-sm arcade-text-muted">{user?.email}</p>
          </div>
        </div>

        {profile && (
          <div className="arcade-glass grid grid-cols-2 gap-3 rounded-2xl p-4 sm:grid-cols-4">
            <Stat label="Points" value={profile.points} />
            <Stat label="Wins" value={profile.wins} />
            <Stat label="Losses" value={profile.losses} />
            <Stat label="Games" value={profile.games_played} />
          </div>
        )}

        <div className="arcade-glass space-y-4 rounded-2xl p-5">
          <div className="space-y-2">
            <Label htmlFor="username" className="font-body">
              Username <span className="text-destructive">*</span>
            </Label>
            <Input
              id="username"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value.replace(/\s/g, ''))}
              maxLength={20}
              className="font-body"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName" className="font-body">
              Display name <span className="arcade-text-muted">(optional)</span>
            </Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="font-body"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatarUrl" className="font-body">
              Avatar URL <span className="arcade-text-muted">(optional)</span>
            </Label>
            <Input
              id="avatarUrl"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://…"
              className="font-body"
            />
          </div>

          {error && <p className="font-body text-sm text-destructive">{error}</p>}
          {message && <p className="font-body text-sm text-[var(--neon-lime)]">{message}</p>}

          <div className="flex flex-wrap gap-2">
            <Button type="button" className="font-body" disabled={saving} onClick={() => void handleSave()}>
              {saving ? 'Saving…' : 'Save profile'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="font-body arcade-glass"
              onClick={() => void signOut().then(() => navigate('/'))}
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          </div>
        </div>

        {activity.length > 0 && (
          <div className="arcade-glass rounded-2xl p-5">
            <h2 className="font-display mb-3 text-sm font-bold tracking-wider uppercase arcade-text-muted">
              Recent activity
            </h2>
            <ul className="space-y-2">
              {activity.map((item) => (
                <li key={item.id} className="font-body flex items-center justify-between text-sm">
                  <span className="capitalize arcade-text-muted">
                    {item.outcome} · {item.mode} · {item.board_size}× board
                  </span>
                  <span className="font-display tabular-nums">
                    {item.points_earned >= 0 ? '+' : ''}
                    {item.points_earned}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </ArcadeShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="font-display text-xl font-bold tabular-nums">{value}</p>
      <p className="font-body text-[10px] tracking-wider uppercase arcade-text-muted">{label}</p>
    </div>
  );
}
