import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { joinMatchByCode } from '../services/matchService';
import { useAuth } from '../contexts/AuthContext';
import { ArcadeShell } from '../components/ArcadeShell';
import { AppHeader } from '../components/layout/AppHeader';
import { SignInButton } from '../components/auth/SignInButton';

export function JoinMatchPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, needsUsername, isConfigured } = useAuth();
  const [error, setError] = useState<string | null>(null);

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
        <h1 className="font-display text-2xl font-bold text-white">Joining room…</h1>
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
      </main>
    </ArcadeShell>
  );
}
