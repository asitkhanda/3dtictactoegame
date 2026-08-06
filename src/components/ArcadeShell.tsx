import type { ReactNode } from 'react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { cn } from '../lib/utils';
import { LandingBackground } from './landing/LandingBackground';

interface ArcadeShellProps {
  children: ReactNode;
  variant?: 'landing' | 'gameplay';
  className?: string;
}

export function ArcadeShell({
  children,
  variant = 'landing',
  className,
}: ArcadeShellProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Pre-mount, guess from the device preference so the first frame matches
  // what next-themes will resolve in system mode.
  const isDark = mounted
    ? resolvedTheme === 'dark'
    : window.matchMedia('(prefers-color-scheme: dark)').matches;

  return (
    <div
      className={cn(
        'font-body relative flex min-h-dvh flex-col',
        isDark ? 'text-white' : 'arcade-text',
        className
      )}
    >
      <LandingBackground variant={variant} />
      <div className="relative z-10 flex min-h-dvh flex-1 flex-col">{children}</div>
    </div>
  );
}
