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
  2: { color: 'var(--neon-cyan)', glow: 'color-mix(in oklch, var(--neon-cyan) 45%, transparent)' },
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
          <div className="chamfer-sm font-display mb-4 inline-flex items-center gap-1.5 bg-[var(--neon-orange)] px-3 py-1 text-[11px] font-bold tracking-[0.25em] text-white uppercase">
            <Trophy className="size-3.5" />
            Top 10
          </div>
          <h1 className="font-hero text-4xl tracking-tight text-[var(--arcade-fg)] uppercase sm:text-5xl">
            Hall of <span className="text-[var(--neon-orange)]">Fame</span>
          </h1>
          <p className="font-body mt-3 arcade-text-muted">
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

        {loading ? (
          <div className="arcade-glass rounded-2xl">
            <p className="font-body p-8 text-center text-sm arcade-text-muted">Loading…</p>
          </div>
        ) : error ? (
          <div className="arcade-glass rounded-2xl">
            <p className="font-body p-8 text-center text-sm text-destructive">{error}</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="arcade-glass rounded-2xl">
            <p className="font-body p-8 text-center text-sm arcade-text-muted">
              No ranked players yet. Be the first to claim the top spot.
            </p>
          </div>
        ) : (
          <>
            {/* Podium: 2nd · 1st (raised) · 3rd */}
            <div className="grid grid-cols-3 items-end gap-2 pt-4 sm:gap-3">
              {[entries[1], entries[0], entries[2]].map((entry, slot) => {
                if (!entry) return <div key={`empty-${slot}`} aria-hidden />;
                const rank = slot === 0 ? 2 : slot === 1 ? 1 : 3;
                const style = RANK_STYLES[rank - 1];
                const first = rank === 1;
                return (
                  <div
                    key={entry.id}
                    className={cn(
                      'arcade-glass relative flex flex-col items-center rounded-xl border-2 px-2 pt-7 pb-4 text-center shadow-[0_6px_0_rgba(0,0,0,0.35)] sm:px-4',
                      first ? 'sm:-translate-y-3' : 'sm:translate-y-1',
                      entry.id === user?.id && 'ring-2 ring-[var(--neon-lime)]/50'
                    )}
                    style={{ borderColor: style.color }}
                  >
                    <span
                      className="font-display absolute -top-3 left-1/2 -translate-x-1/2 -rotate-3 rounded-md px-2 py-0.5 text-xs font-extrabold text-black shadow-[2px_2px_0_rgba(0,0,0,0.55)]"
                      style={{ backgroundColor: style.color }}
                    >
                      #{rank}
                    </span>
                    <Avatar className={first ? 'size-14' : 'size-11'}>
                      <AvatarImage src={entry.avatar_url ?? undefined} alt="" />
                      <AvatarFallback>{entry.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-body mt-2 w-full truncate text-xs font-semibold sm:text-sm">
                      @{entry.username}
                    </span>
                    <span
                      className="font-display text-xl font-extrabold tabular-nums sm:text-2xl"
                      style={{ color: style.color }}
                    >
                      {entry.points}
                    </span>
                    <span className="font-body text-[10px] tabular-nums arcade-text-muted">
                      {entry.wins}–{entry.losses}–{entry.draws}
                    </span>
                  </div>
                );
              })}
            </div>

            {entries.length > 3 && (
              <div className="arcade-glass overflow-hidden rounded-2xl border-2 border-[var(--arcade-glass-border)]">
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
                    {entries.slice(3).map((entry, index) => (
                      <TableRow
                        key={entry.id}
                        className={cn(
                          'border-white/10',
                          entry.id === user?.id && 'bg-[var(--neon-lime)]/5'
                        )}
                      >
                        <TableCell className="font-display font-bold tabular-nums arcade-text-muted">
                          {index + 4}
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
              </div>
            )}
          </>
        )}

        <div className="text-center">
          <ArcadeButton variant="orange" size="md" onClick={() => navigate('/')}>
            Claim your spot
          </ArcadeButton>
        </div>
      </main>
    </ArcadeShell>
  );
}
