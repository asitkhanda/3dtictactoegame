import { cn } from '../../lib/utils';

export function TurnBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={cn(
        'font-body shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide',
        active
          ? 'border-[var(--neon-orange)]/45 bg-[var(--neon-orange)]/15 text-[var(--neon-orange)]'
          : 'border-[var(--neon-violet)]/45 bg-[var(--neon-violet)]/15 text-[var(--neon-violet)]'
      )}
    >
      {label}
    </span>
  );
}

export function PlayerScore({
  label,
  score,
  threshold,
  active,
  tone,
}: {
  label: string;
  score: number;
  threshold: number;
  active: boolean;
  tone: 'x' | 'o';
}) {
  const isX = tone === 'x';
  const neon = isX ? 'var(--neon-orange)' : 'var(--neon-violet)';

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-lg border border-transparent px-2 py-0.5 transition-colors',
        active &&
          (isX
            ? 'border-[var(--neon-orange)]/40 bg-[var(--neon-orange)]/10'
            : 'border-[var(--neon-violet)]/40 bg-[var(--neon-violet)]/10')
      )}
    >
      <div className="font-body flex items-center gap-1 text-xs font-medium tracking-wide uppercase arcade-text-muted">
        {active && (
          <span className="size-1.5 rounded-full" style={{ backgroundColor: neon }} aria-hidden />
        )}
        {label}
      </div>
      <div
        className="font-display text-sm font-bold tabular-nums leading-none"
        style={{ color: neon }}
      >
        {score}
        <span className="font-body text-xs font-normal arcade-text-muted">/{threshold}</span>
      </div>
    </div>
  );
}
