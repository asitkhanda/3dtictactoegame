import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

/** X / O drawn like the board pieces — glowing neon marks, not letters. */
export function MarkGlyph({ mark, size = 14 }: { mark: 'x' | 'o'; size?: number }) {
  const bar = Math.max(2, Math.round(size * 0.22));
  if (mark === 'x') {
    return (
      <span
        aria-hidden
        className="relative inline-block shrink-0"
        style={{ width: size, height: size, filter: 'drop-shadow(0 0 4px var(--neon-orange-glow))' }}
      >
        <span
          className="absolute top-1/2 left-0 w-full -translate-y-1/2 rotate-45 rounded-[1px] bg-[var(--neon-orange)]"
          style={{ height: bar }}
        />
        <span
          className="absolute top-1/2 left-0 w-full -translate-y-1/2 -rotate-45 rounded-[1px] bg-[var(--neon-orange)]"
          style={{ height: bar }}
        />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-full border-[var(--neon-violet)]"
      style={{
        width: size,
        height: size,
        borderWidth: bar,
        borderStyle: 'solid',
        filter: 'drop-shadow(0 0 4px var(--neon-violet-glow))',
      }}
    />
  );
}

function ThinkingDots({ color }: { color: string }) {
  return (
    <span className="inline-flex items-center gap-[3px]" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="hud-thinking-dot size-1 rounded-full"
          style={{ backgroundColor: color, animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </span>
  );
}

function ScorePips({
  score,
  threshold,
  neon,
  glow,
}: {
  score: number;
  threshold: number;
  neon: string;
  glow: string;
}) {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      {Array.from({ length: threshold }, (_, i) => {
        const filled = i < score;
        return (
          <motion.span
            key={i}
            initial={false}
            animate={filled ? { scale: [1, 1.7, 1] } : { scale: 1 }}
            transition={{ duration: 0.35 }}
            className="size-2 rounded-full border"
            style={
              filled
                ? { backgroundColor: neon, borderColor: neon, boxShadow: `0 0 6px ${glow}` }
                : { backgroundColor: 'transparent', borderColor: 'color-mix(in oklch, currentColor 35%, transparent)' }
            }
          />
        );
      })}
    </span>
  );
}

export function TurnBadge({
  active,
  label,
  thinking = false,
}: {
  active: boolean;
  label: string;
  thinking?: boolean;
}) {
  const neon = active ? 'var(--neon-orange)' : 'var(--neon-violet)';
  const glow = active ? 'var(--neon-orange-glow)' : 'var(--neon-violet-glow)';
  return (
    <span
      className={cn(
        'font-display relative shrink-0 overflow-hidden rounded-lg border-2 px-3 py-1 text-xs font-extrabold tracking-widest uppercase'
      )}
      style={{ borderColor: neon, color: neon }}
    >
      <span
        aria-hidden
        className="hud-active-glow absolute inset-0"
        style={{ backgroundColor: neon, opacity: 0.12 }}
      />
      <span className="relative inline-flex items-center gap-1.5">
        {label}
        {thinking && <ThinkingDots color={neon} />}
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-md"
        style={{ boxShadow: `inset 0 0 12px ${glow}` }}
      />
    </span>
  );
}

export function PlayerScore({
  label,
  score,
  threshold,
  active,
  tone,
  thinking = false,
}: {
  label: string;
  score: number;
  threshold: number;
  active: boolean;
  tone: 'x' | 'o';
  thinking?: boolean;
}) {
  const isX = tone === 'x';
  const neon = isX ? 'var(--neon-orange)' : 'var(--neon-violet)';
  const glow = isX ? 'var(--neon-orange-glow)' : 'var(--neon-violet-glow)';

  return (
    <div
      className={cn(
        'relative flex items-center gap-2 overflow-hidden rounded-lg border-2 px-2.5 py-1 transition-colors duration-200',
        active ? 'border-current' : 'border-transparent opacity-60'
      )}
      style={{ color: neon }}
    >
      {active && (
        <span
          aria-hidden
          className="hud-active-glow absolute inset-0"
          style={{ backgroundColor: neon, opacity: 0.12 }}
        />
      )}
      <MarkGlyph mark={tone} size={13} />
      <div className="relative flex flex-col leading-none">
        <span className="font-display max-w-20 truncate text-xs font-extrabold tracking-wider uppercase">
          {label}
        </span>
        <span className="mt-1 inline-flex min-h-2 items-center">
          {thinking && active ? (
            <ThinkingDots color={neon} />
          ) : (
            <ScorePips score={score} threshold={threshold} neon={neon} glow={glow} />
          )}
        </span>
      </div>
      {active && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-md"
          style={{ boxShadow: `inset 0 0 14px ${glow}` }}
        />
      )}
    </div>
  );
}
