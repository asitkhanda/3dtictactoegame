import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

/** X / O drawn like the board pieces — marks, not letters. */
export function MarkGlyph({
  mark,
  size = 14,
  color,
}: {
  mark: 'x' | 'o';
  size?: number;
  /** Override mark color (e.g. white on a colored plate). */
  color?: string;
}) {
  const bar = Math.max(2, Math.round(size * 0.22));
  if (mark === 'x') {
    const fill = color ?? 'var(--neon-orange)';
    return (
      <span
        aria-hidden
        className="relative inline-block shrink-0"
        style={{ width: size, height: size }}
      >
        <span
          className="absolute top-1/2 left-0 w-full -translate-y-1/2 rotate-45 rounded-[1px]"
          style={{ height: bar, backgroundColor: fill }}
        />
        <span
          className="absolute top-1/2 left-0 w-full -translate-y-1/2 -rotate-45 rounded-[1px]"
          style={{ height: bar, backgroundColor: fill }}
        />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        borderWidth: bar,
        borderStyle: 'solid',
        borderColor: color ?? 'var(--neon-violet)',
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

interface ScoreHalfProps {
  tone: 'x' | 'o';
  label: string;
  score: number;
  threshold: number;
  active: boolean;
  thinking: boolean;
  side: 'left' | 'right';
}

function ScoreHalf({ tone, label, score, threshold, active, thinking, side }: ScoreHalfProps) {
  const isX = tone === 'x';
  return (
    <div
      className={cn(
        'relative flex min-w-28 -skew-x-[10deg] flex-col items-center gap-0.5 px-5 py-2 sm:min-w-36 sm:px-6',
        // Ice cyan is a light fill in dark mode — it takes navy ink, not white.
        isX ? 'bg-[var(--neon-orange)] text-white' : 'bg-[var(--neon-violet)] text-white dark:text-[#0f1923]',
        side === 'left' ? 'mr-[3px]' : 'ml-[3px]',
        'shadow-[0_10px_28px_rgba(0,0,0,0.35)]'
      )}
    >
      <div className="flex skew-x-[10deg] flex-col items-center gap-0.5">
        <span className="font-display flex max-w-full items-center gap-1.5 text-[11px] font-bold tracking-[0.22em] uppercase opacity-90">
          <MarkGlyph mark={tone} size={9} color="currentColor" />
          <span className="truncate">{label}</span>
          {thinking && active && <ThinkingDots color="currentColor" />}
        </span>

        {threshold > 0 ? (
          <>
            <span className="font-hero text-3xl leading-none tabular-nums sm:text-4xl">
              {score}
            </span>
            <ScorePips
              score={score}
              threshold={threshold}
              neon="currentColor"
              glow="transparent"
            />
          </>
        ) : (
          <span className="py-1.5">
            <MarkGlyph mark={tone} size={26} color="currentColor" />
          </span>
        )}
      </div>

      {active ? (
        <span
          aria-hidden
          className="hud-active-glow pointer-events-none absolute inset-0 bg-white"
          style={{ opacity: 0.08 }}
        />
      ) : (
        <span aria-hidden className="pointer-events-none absolute inset-0 bg-black/45" />
      )}
    </div>
  );
}

/** The big joined versus card — the HUD centerpiece on game screens. */
export function VersusScoreboard({
  xLabel,
  oLabel,
  xScore,
  oScore,
  threshold,
  xActive,
  oActive,
  thinking = false,
  thinkingSide = 'o',
  className,
}: {
  xLabel: string;
  oLabel: string;
  xScore: number;
  oScore: number;
  /** 0 hides scores/pips and shows big marks instead (2D and void boards). */
  threshold: number;
  xActive: boolean;
  oActive: boolean;
  thinking?: boolean;
  thinkingSide?: 'x' | 'o';
  className?: string;
}) {
  return (
    <div className={cn('relative inline-flex select-none', className)}>
      <ScoreHalf
        tone="x"
        label={xLabel}
        score={xScore}
        threshold={threshold}
        active={xActive}
        thinking={thinking && thinkingSide === 'x'}
        side="left"
      />
      <ScoreHalf
        tone="o"
        label={oLabel}
        score={oScore}
        threshold={threshold}
        active={oActive}
        thinking={thinking && thinkingSide === 'o'}
        side="right"
      />
      <span
        aria-hidden
        className="absolute top-1/2 left-1/2 z-20 flex size-8 -translate-x-1/2 -translate-y-1/2 rotate-45 items-center justify-center bg-[var(--neon-lime)] shadow-[0_4px_14px_rgba(0,0,0,0.4)]"
      >
        <span className="font-display -rotate-45 text-[11px] font-extrabold text-[var(--on-accent)]">
          VS
        </span>
      </span>
    </div>
  );
}
