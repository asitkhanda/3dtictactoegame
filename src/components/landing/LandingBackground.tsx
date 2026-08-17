import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { usePageVisible } from '../../hooks/usePageVisible';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { useIsMobile } from '../ui/use-mobile';
import { cn } from '../../lib/utils';

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  left: `${(i * 17 + 7) % 100}%`,
  top: `${(i * 23 + 11) % 100}%`,
  size: 2 + (i % 3),
  delay: (i % 8) * 0.4,
  duration: 4 + (i % 5),
}));

interface LandingBackgroundProps {
  variant?: 'landing' | 'gameplay';
}

/** Tactical canvas: flat deep navy (or ivory), a faint technical grid, and a
 *  handful of drifting motes. No blurs — texture comes from the grid + noise. */
export function LandingBackground({ variant = 'landing' }: LandingBackgroundProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const pageVisible = usePageVisible();
  const isGameplay = variant === 'gameplay';

  useEffect(() => {
    setMounted(true);
  }, []);

  const isMobile = useIsMobile();
  const isDark = mounted
    ? resolvedTheme === 'dark'
    : window.matchMedia('(prefers-color-scheme: dark)').matches;
  const staticGameplay = isGameplay && isMobile;
  const paused = reducedMotion || !pageVisible || staticGameplay;

  const gridInk = isDark
    ? 'color-mix(in oklch, #93a8b5 16%, transparent)'
    : 'color-mix(in oklch, #1b2733 12%, transparent)';

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-0 overflow-hidden',
        paused && 'arcade-animations-paused'
      )}
      style={{ backgroundColor: isDark ? 'var(--landing-bg)' : 'var(--landing-bg-light)' }}
    >
      <div
        className="absolute inset-0"
        style={{
          opacity: isGameplay ? 0.5 : 0.8,
          backgroundImage: `
            linear-gradient(${gridInk} 1px, transparent 1px),
            linear-gradient(90deg, ${gridInk} 1px, transparent 1px)
          `,
          backgroundSize: '56px 56px',
          maskImage:
            'radial-gradient(ellipse 85% 70% at 50% 45%, black 25%, transparent 80%)',
        }}
      />

      {/* Corner accents — thin signature-red rules, pure decoration */}
      <div
        aria-hidden
        className="absolute top-0 left-0 h-[2px] w-40 bg-[var(--neon-orange)] opacity-70"
      />
      <div
        aria-hidden
        className="absolute right-0 bottom-0 h-[2px] w-40 bg-[var(--neon-orange)] opacity-70"
      />

      {isDark &&
        !staticGameplay &&
        PARTICLES.slice(0, isMobile ? 5 : 12).map((p) => (
          <span
            key={p.id}
            className="landing-particle absolute rounded-full"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              backgroundColor: '#ece8e1',
              opacity: 0.6,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}

      <div className="landing-noise absolute inset-0 opacity-50" />
    </div>
  );
}
