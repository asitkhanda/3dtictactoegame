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

// Extruded arcade buttons: a hard shadow acts as the button's "side"; pressing
// translates the face down onto it. Transform/box-shadow only — cheap on GPU.
const VARIANT_CLASSES: Record<ArcadeButtonVariant, string> = {
  orange: cn(
    'text-white bg-gradient-to-b from-[var(--neon-orange)] to-[#ea580c]',
    'border border-white/25',
    'shadow-[0_4px_0_#9a3d08,0_10px_24px_var(--neon-orange-glow)]',
    'hover:brightness-110',
    'active:translate-y-[3px] active:shadow-[0_1px_0_#9a3d08,0_4px_12px_var(--neon-orange-glow)]'
  ),
  violet: cn(
    'text-white bg-gradient-to-b from-[var(--neon-violet)] to-[#7c3aed]',
    'border border-white/25',
    'shadow-[0_4px_0_#4c1d95,0_10px_24px_var(--neon-violet-glow)]',
    'hover:brightness-110',
    'active:translate-y-[3px] active:shadow-[0_1px_0_#4c1d95,0_4px_12px_var(--neon-violet-glow)]'
  ),
  lime: cn(
    'text-[#0a2603] bg-gradient-to-b from-[var(--neon-lime)] to-[#2fd614]',
    'border border-white/30',
    'shadow-[0_4px_0_#1a7a08,0_10px_24px_rgba(80,255,50,0.35)]',
    'hover:brightness-110',
    'active:translate-y-[3px] active:shadow-[0_1px_0_#1a7a08,0_4px_12px_rgba(80,255,50,0.3)]'
  ),
  ghost: cn(
    'arcade-text bg-[var(--arcade-glass-bg)] border border-[var(--arcade-glass-border)]',
    'shadow-[0_4px_0_rgba(0,0,0,0.35)]',
    'hover:bg-white/10',
    'active:translate-y-[3px] active:shadow-[0_1px_0_rgba(0,0,0,0.35)]'
  ),
};

const SIZE_CLASSES: Record<ArcadeButtonSize, string> = {
  sm: 'min-h-9 px-4 text-sm gap-1.5 rounded-lg',
  md: 'min-h-11 px-6 text-base gap-2 rounded-xl',
  lg: 'min-h-13 px-8 text-lg gap-2.5 rounded-xl',
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
          'font-display inline-flex select-none items-center justify-center font-extrabold uppercase tracking-wider',
          'transition-[transform,box-shadow,filter] duration-100',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
          'disabled:pointer-events-none disabled:opacity-50',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className
        )}
        {...rest}
      >
        {children}
      </button>
    );
  }
);
