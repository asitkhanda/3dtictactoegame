import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArcadeButton } from '../arcade/ArcadeButton';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { playArcadeSound } from '../../utils/arcadeSound';
import { cn } from '../../lib/utils';

export type GameOverOutcome = 'win' | 'lose' | 'draw';

interface GameOverOverlayProps {
  outcome: GameOverOutcome;
  /** Big slam text, e.g. "YOU WIN" / "X TAKES IT" / "STALEMATE". */
  title: string;
  /** Smaller flavor line, e.g. "3D line through the stack". */
  subtitle?: string;
  pointsEarned?: number;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Extra content (e.g. sign-in prompt) under the buttons. */
  footer?: React.ReactNode;
  /** Color override, e.g. violet celebration when O wins a local 2P match. */
  accent?: 'orange' | 'violet' | 'cyan';
  /** Local match — shows why no rank points were awarded. */
  casual?: boolean;
}

const OUTCOME_STYLES: Record<
  GameOverOutcome,
  { color: string; glow: string; particles: string[] }
> = {
  win: {
    color: 'var(--neon-orange)',
    glow: 'var(--neon-orange-glow)',
    particles: ['var(--neon-orange)', 'var(--player-x-light)', 'var(--neon-lime)', '#ffffff'],
  },
  lose: {
    color: 'var(--neon-violet)',
    glow: 'var(--neon-violet-glow)',
    particles: ['var(--neon-violet)', 'var(--player-o-light)'],
  },
  draw: {
    color: 'var(--neon-cyan)',
    glow: 'color-mix(in oklch, var(--neon-cyan) 45%, transparent)',
    particles: ['var(--neon-cyan)', '#ffffff'],
  },
};

const OUTCOME_SOUND = { win: 'victory', lose: 'defeat', draw: 'draw' } as const;

const ACCENT_TO_OUTCOME = { orange: 'win', violet: 'lose', cyan: 'draw' } as const;

function ParticleBurst({ styleKey }: { styleKey: GameOverOutcome }) {
  const { particles } = OUTCOME_STYLES[styleKey];
  const pieces = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => {
        const angle = (i / 26) * Math.PI * 2 + Math.random() * 0.4;
        const distance = 130 + Math.random() * 190;
        return {
          id: i,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance - 40,
          rotate: Math.random() * 540 - 270,
          size: 5 + Math.random() * 7,
          color: particles[i % particles.length],
          delay: Math.random() * 0.12,
          round: i % 3 === 0,
        };
      }),
    [particles]
  );

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className={cn('absolute', p.round ? 'rounded-full' : 'rounded-[2px]')}
          style={{ width: p.size, height: p.size, backgroundColor: p.color }}
          initial={{ x: 0, y: 0, scale: 1, opacity: 1, rotate: 0 }}
          animate={{ x: p.x, y: p.y, scale: 0, opacity: [1, 1, 0], rotate: p.rotate }}
          transition={{ duration: 0.9 + Math.random() * 0.4, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

/** Counts the rank-point change up (or down) from zero on arrival. */
function PointsCounter({ points }: { points: number }) {
  const [shown, setShown] = useState(0);
  const rafRef = useRef<number | null>(null);
  const gained = points >= 0;

  useEffect(() => {
    const duration = 700;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setShown(Math.round(points * (1 - Math.pow(1 - t, 3))));
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);

    // Frames are throttled while a tab is backgrounded, which would otherwise
    // strand the tally at zero. Land on the real figure regardless.
    const settle = setTimeout(() => setShown(points), duration + 80);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      clearTimeout(settle);
    };
  }, [points]);

  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 16 }}
      className="flex flex-col items-center gap-1"
    >
      <span
        className="font-hero text-3xl tracking-wide tabular-nums"
        style={{ color: gained ? 'var(--neon-lime)' : 'var(--neon-orange)' }}
      >
        {gained ? '+' : '−'}
        {Math.abs(shown)}
      </span>
      <span className="font-display text-[10px] font-bold tracking-[0.3em] text-white/60 uppercase">
        {gained ? 'Rank points' : 'Rank points lost'}
      </span>
    </motion.div>
  );
}

export function GameOverOverlay({
  outcome,
  title,
  subtitle,
  pointsEarned,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  footer,
  accent,
  casual = false,
}: GameOverOverlayProps) {
  const reducedMotion = usePrefersReducedMotion();
  const styleKey = accent ? ACCENT_TO_OUTCOME[accent] : outcome;
  const { color, glow } = OUTCOME_STYLES[styleKey];
  const primaryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    playArcadeSound(OUTCOME_SOUND[outcome]);
    const timer = setTimeout(() => primaryRef.current?.focus(), 650);
    return () => clearTimeout(timer);
  }, [outcome]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      // `dark` scope: the dimmed backdrop is a dark surface in BOTH themes, so
      // everything inside must resolve dark-mode tokens (light-mode ink colors
      // would be invisible on black — e.g. the ghost button and points count).
      className="dark fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-6"
    >
      {!reducedMotion && <ParticleBurst styleKey={styleKey} />}

      <div className="relative flex max-w-md flex-col items-center text-center">
        <motion.h2
          initial={
            reducedMotion
              ? { opacity: 0 }
              : { scale: 2.6, opacity: 0, rotate: outcome === 'draw' ? 0 : -4 }
          }
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={
            reducedMotion
              ? { duration: 0.3 }
              : { type: 'spring', stiffness: 340, damping: 17, delay: 0.08 }
          }
          className="font-hero text-[clamp(3rem,14vw,5.5rem)] leading-none tracking-tight uppercase"
          style={{ textShadow: `0 0 44px ${glow}`, color }}
        >
          {title}
        </motion.h2>

        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.35 }}
            className="font-body mt-3 text-base text-white/80 sm:text-lg"
          >
            {subtitle}
          </motion.p>
        )}

        {typeof pointsEarned === 'number' && pointsEarned !== 0 && (
          <div className="mt-5">
            <PointsCounter points={pointsEarned} />
          </div>
        )}

        {casual && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="chamfer-sm font-display mt-5 bg-white/10 px-3 py-1.5 text-[10px] font-bold tracking-[0.22em] text-white/70 uppercase"
          >
            Casual match · no rank points
          </motion.p>
        )}

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, type: 'spring', stiffness: 220, damping: 20 }}
          className="mt-8 flex flex-col items-center gap-3 sm:flex-row"
        >
          <ArcadeButton
            ref={primaryRef}
            variant={outcome === 'lose' ? 'violet' : outcome === 'draw' ? 'ghost' : 'lime'}
            size="lg"
            onClick={onPrimary}
          >
            {primaryLabel}
          </ArcadeButton>
          {secondaryLabel && onSecondary && (
            <ArcadeButton variant="ghost" size="lg" onClick={onSecondary}>
              {secondaryLabel}
            </ArcadeButton>
          )}
        </motion.div>

        {footer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.75 }}
            className="mt-4"
          >
            {footer}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
