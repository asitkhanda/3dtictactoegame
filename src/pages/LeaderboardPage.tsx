import { useNavigate } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { ArcadeButton } from '../components/arcade/ArcadeButton';
import { useAuth } from '../contexts/AuthContext';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { SignInButton } from '../components/auth/SignInButton';
import { AppHeader } from '../components/layout/AppHeader';
import { ArcadeShell } from '../components/ArcadeShell';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { cn } from '../lib/utils';

const RANK_STYLES: Record<number, { color: string; glow: string }> = {
  0: { color: 'var(--neon-orange)', glow: 'var(--neon-orange-glow)' },
  1: { color: 'var(--neon-violet)', glow: 'var(--neon-violet-glow)' },
  2: { color: 'var(--neon-cyan)', glow: 'rgba(34, 211, 238, 0.5)' },
};

export function LeaderboardPage() {
  const navigate = useNavigate();
  const { user, profile, isConfigured } = useAuth();
  const { entries, userRank, loading, error } = useLeaderboard(user?.id);

  return (
    <ArcadeShell variant="landing">
      <AppHeader />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pt-24 pb-10 sm:px-6">
        <div className="text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--neon-orange)]/30 bg-[var(--neon-orange)]/10 px-3 py-1">
            <Trophy className="size-4 text-[var(--neon-orange)]" />
            <span className="font-body text-[10px] font-semibold tracking-[0.2em] text-[var(--neon-orange)] uppercase">
              Top 10
            </span>
          </div>
          <h1
            className="font-display bg-gradient-to-r from-[var(--neon-orange)] via-[#ff9a4d] to-[var(--neon-violet)] bg-clip-text text-4xl font-extrabold tracking-tight text-transparent uppercase sm:text-5xl"
            style={{ textShadow: '0 0 40px var(--neon-orange-glow)' }}
          >
            Hall of Fame
          </h1>
          <p className="font-body mt-2 arcade-text-muted">
            The sharpest minds across the stack.
          </p>
        </div>

        {!isConfigured && (
          <div className="arcade-glass rounded-2xl p-4 text-center">
            <p className="font-body text-sm arcade-text-muted">
              Connect Supabase to enable the live leaderboard.
            </p>
          </div>
        )}

        {isConfigured && !user && (
          <div className="arcade-glass flex flex-col items-center gap-3 rounded-2xl p-5 text-center sm:flex-row sm:justify-between sm:text-left">
            <p className="font-body text-sm arcade-text-muted">
              Sign in and pick a username to compete for a spot on the board.
            </p>
            <SignInButton />
          </div>
        )}

        {user && profile?.username && userRank && (
          <div className="arcade-glass rounded-2xl px-4 py-3 text-center sm:text-left">
            <p className="font-body text-sm">
              Your rank:{' '}
              <span className="font-display font-bold text-[var(--neon-lime)]">#{userRank}</span>
              {' · '}
              <span className="tabular-nums">{profile.points} pts</span>
            </p>
          </div>
        )}

        <div className="arcade-glass overflow-hidden rounded-2xl">
          {loading ? (
            <p className="font-body p-8 text-center text-sm arcade-text-muted">Loading…</p>
          ) : error ? (
            <p className="font-body p-8 text-center text-sm text-destructive">{error}</p>
          ) : entries.length === 0 ? (
            <p className="font-body p-8 text-center text-sm arcade-text-muted">
              No ranked players yet. Be the first to claim the top spot.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="font-body w-12">#</TableHead>
                  <TableHead className="font-body">Player</TableHead>
                  <TableHead className="font-body text-right">Pts</TableHead>
                  <TableHead className="font-body hidden text-right sm:table-cell">W–L–D</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry, index) => (
                  <TableRow
                    key={entry.id}
                    className={cn(
                      'border-white/10',
                      entry.id === user?.id && 'bg-[var(--neon-lime)]/5'
                    )}
                  >
                    <TableCell>
                      {index < 3 ? (
                        <span
                          className="font-display inline-flex size-7 items-center justify-center rounded-full border-2 text-sm font-extrabold tabular-nums"
                          style={{
                            color: RANK_STYLES[index].color,
                            borderColor: RANK_STYLES[index].color,
                            boxShadow: `0 0 10px ${RANK_STYLES[index].glow}`,
                          }}
                        >
                          {index + 1}
                        </span>
                      ) : (
                        <span className="font-display inline-flex size-7 items-center justify-center font-bold tabular-nums arcade-text-muted">
                          {index + 1}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-8">
                          <AvatarImage src={entry.avatar_url ?? undefined} alt="" />
                          <AvatarFallback>{entry.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="font-body font-medium">@{entry.username}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-display text-right font-bold tabular-nums">
                      {entry.points}
                    </TableCell>
                    <TableCell className="font-body hidden text-right tabular-nums sm:table-cell arcade-text-muted">
                      {entry.wins}–{entry.losses}–{entry.draws}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="text-center">
          <ArcadeButton variant="orange" size="md" onClick={() => navigate('/')}>
            Claim your spot
          </ArcadeButton>
        </div>
      </main>
    </ArcadeShell>
  );
}
