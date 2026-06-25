import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { usePageVisible } from '../../hooks/usePageVisible';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { cn } from '../../lib/utils';

const PARTICLE_COUNT = { landing: 36, gameplay: 18 } as const;

const PARTICLES = Array.from({ length: 36 }, (_, i) => ({
  id: i,
  left: `${(i * 17 + 7) % 100}%`,
  top: `${(i * 23 + 11) % 100}%`,
  size: 2 + (i % 4),
  delay: (i % 8) * 0.4,
  duration: 4 + (i % 5),
}));

interface LandingBackgroundProps {
  variant?: 'landing' | 'gameplay';
}

export function LandingBackground({ variant = 'landing' }: LandingBackgroundProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const pageVisible = usePageVisible();
  const isGameplay = variant === 'gameplay';

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme !== 'light' : true;
  const particleCount = PARTICLE_COUNT[variant];
  const blobOpacity = isGameplay ? 0.45 : isDark ? 0.6 : 0.35;
  const gridOpacity = isGameplay ? 0.22 : isDark ? 0.3 : 0.18;
  const paused = reducedMotion || !pageVisible;

  const bgStyle = isDark
    ? { backgroundColor: 'var(--landing-bg)' }
    : { backgroundColor: 'var(--landing-bg-light)' };

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-0 overflow-hidden',
        paused && 'arcade-animations-paused'
      )}
      style={bgStyle}
    >
      <div
        className={cn(
          'landing-blob landing-blob-orange absolute -top-1/4 -left-1/4 h-[70%] w-[70%] rounded-full blur-[100px]',
          isGameplay && 'h-[55%] w-[55%]'
        )}
        style={{
          background: 'radial-gradient(circle, var(--neon-orange) 0%, transparent 70%)',
          opacity: blobOpacity,
        }}
      />
      <div
        className={cn(
          'landing-blob landing-blob-violet absolute -right-1/4 top-1/4 h-[60%] w-[60%] rounded-full blur-[120px]',
          isGameplay && 'h-[50%] w-[50%]'
        )}
        style={{
          background: 'radial-gradient(circle, var(--neon-violet) 0%, transparent 70%)',
          opacity: blobOpacity * 0.85,
        }}
      />
      {!isGameplay && (
        <div
          className="landing-blob landing-blob-cyan absolute bottom-0 left-1/3 h-[45%] w-[45%] rounded-full blur-[90px]"
          style={{
            background: 'radial-gradient(circle, var(--neon-cyan) 0%, transparent 70%)',
            opacity: isDark ? 0.35 : 0.2,
          }}
        />
      )}

      <div
        className="landing-grid-drift absolute inset-0"
        style={{
          opacity: gridOpacity,
          backgroundImage: `
            linear-gradient(color-mix(in oklch, var(--neon-lime) ${isDark ? 25 : 18}%, transparent) 1px, transparent 1px),
            linear-gradient(90deg, color-mix(in oklch, var(--neon-lime) ${isDark ? 25 : 18}%, transparent) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          maskImage:
            'radial-gradient(ellipse 80% 60% at 50% 55%, black 20%, transparent 75%)',
        }}
      />

      {!isGameplay && (
        <div
          className="absolute inset-x-0 bottom-0 h-[45%]"
          style={{
            background:
              'linear-gradient(to top, color-mix(in oklch, var(--neon-violet) 12%, transparent), transparent)',
            transform: 'perspective(600px) rotateX(55deg)',
            transformOrigin: 'bottom center',
            opacity: isDark ? 0.35 : 0.2,
          }}
        />
      )}

      {PARTICLES.slice(0, particleCount).map((p) => (
        <span
          key={p.id}
          className="landing-particle absolute rounded-full"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            backgroundColor: isDark ? 'white' : 'var(--neon-violet)',
            opacity: isDark ? 1 : 0.5,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}

      <div className="landing-noise absolute inset-0 opacity-60" />
    </div>
  );
}
