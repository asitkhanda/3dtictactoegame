import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import { playArcadeSound } from '../../utils/arcadeSound';

export type ArcadeButtonVariant = 'orange' | 'violet' | 'lime' | 'ghost';
export type ArcadeButtonSize = 'sm' | 'md' | 'lg';

interface ArcadeButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ArcadeButtonVariant;
  size?: ArcadeButtonSize;
  /** Set false for buttons that fire their own sound (e.g. the mute toggle). */
  sound?: boolean;
}

// Tactical esports buttons: chamfered corners, flat signature fills, a skewed
// sheen that sweeps across on hover, and a tight press. Transform/opacity only.
const VARIANT_CLASSES: Record<ArcadeButtonVariant, string> = {
  orange: 'chamfer text-white bg-[var(--neon-orange)] hover:brightness-110',
  violet: 'chamfer text-white dark:text-[#0f1923] bg-[var(--neon-violet)] hover:brightness-110',
  lime: 'chamfer text-[var(--on-accent)] bg-[var(--neon-lime)] hover:brightness-95',
  ghost:
    'chamfer bg-[color-mix(in_oklch,var(--arcade-fg),transparent_92%)] arcade-text hover:bg-[color-mix(in_oklch,var(--arcade-fg),transparent_85%)]',
};

const SIZE_CLASSES: Record<ArcadeButtonSize, string> = {
  sm: 'min-h-9 px-4 text-sm gap-1.5',
  md: 'min-h-11 px-6 text-base gap-2',
  lg: 'min-h-13 px-8 text-lg gap-2.5',
};

export const ArcadeButton = forwardRef<HTMLButtonElement, ArcadeButtonProps>(
  function ArcadeButton(
    { variant = 'orange', size = 'md', sound = true, className, onClick, children, ...rest },
    ref
  ) {
    return (
      <button
        ref={ref}
        type="button"
        onClick={(e) => {
          if (sound) playArcadeSound('tap');
          onClick?.(e);
        }}
        className={cn(
          'group font-display relative inline-flex select-none items-center justify-center overflow-hidden font-extrabold uppercase tracking-[0.14em]',
          'transition-[transform,filter] duration-100',
          'active:translate-x-[2px] active:scale-[0.98]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon-orange)]/70',
          'disabled:pointer-events-none disabled:opacity-50',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className
        )}
        {...rest}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-[-60%] w-[45%] -skew-x-[20deg] bg-white/25 transition-transform duration-300 ease-out group-hover:translate-x-[320%]"
        />
        <span className="relative z-10 inline-flex items-center gap-[inherit]">{children}</span>
      </button>
    );
  }
);
