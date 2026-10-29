import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { joinMatchByCode } from '../services/matchService';
import { useAuth } from '../contexts/AuthContext';
import { ArcadeShell } from '../components/ArcadeShell';
import { AppHeader } from '../components/layout/AppHeader';
import { SignInButton } from '../components/auth/SignInButton';
import { normalizeRoomCode, openInAppUrl } from '../utils/inviteLinks';

export function JoinMatchPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, needsUsername, isConfigured } = useAuth();
  const [error, setError] = useState<string | null>(null);
  // Installed apps normally take this link before the page loads. On a phone whose browser
  // doesn't hand it over, a tap on this button opens the room in the app. Android sends people
  // without the app back here with ?app=missing.
  const [searchParams] = useSearchParams();
  const appMissing = searchParams.get('app') === 'missing';
  const roomCode = normalizeRoomCode(code);
  const openInAppHref = roomCode
    ? openInAppUrl(
        roomCode,
        navigator.userAgent,
        `${window.location.origin}/join/${roomCode}?app=missing`
      )
    : null;

  useEffect(() => {
    if (!isConfigured || !code) return;
    if (!user) return;
    if (needsUsername) return;

    void joinMatchByCode(code).then(({ match, error: joinError }) => {
      if (joinError) {
        setError(joinError);
        return;
      }
      if (match) navigate(`/play/${match.id}`, { replace: true });
    });
  }, [code, user, needsUsername, isConfigured, navigate]);

  return (
    <ArcadeShell variant="landing">
      <AppHeader />
      <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 pt-24 pb-10 text-center">
        <h1 className="font-display text-2xl font-bold text-[var(--arcade-fg)]">Joining room…</h1>
        {!isConfigured && (
          <p className="font-body text-sm arcade-text-muted">Supabase is not configured.</p>
        )}
        {!user && isConfigured && (
          <>
            <p className="font-body text-sm arcade-text-muted">Sign in to join this match.</p>
            <SignInButton />
          </>
        )}
        {needsUsername && (
          <p className="font-body text-sm arcade-text-muted">Pick a username to continue.</p>
        )}
        {error && <p className="font-body text-sm text-destructive">{error}</p>}
        {openInAppHref && (
          <div className="flex flex-col items-center gap-2">
            <a
              href={openInAppHref}
              className="chamfer-sm font-display bg-[var(--neon-orange)] px-5 py-3 text-xs font-bold tracking-[0.12em] text-white uppercase transition-[filter] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-[var(--neon-orange)]/70 focus-visible:outline-none"
            >
              Open in the Twisted Tac app
            </a>
            <p className="font-body text-xs arcade-text-muted">
              {appMissing
                ? "The app isn't installed on this phone yet. You can play in your browser below."
                : 'Have the app installed? Tap to open this room there.'}
            </p>
          </div>
        )}
      </main>
    </ArcadeShell>
  );
}
