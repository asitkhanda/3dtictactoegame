import type { TouchEvent } from 'react';
import { Sparkles } from 'lucide-react';

interface LandingHeroProps {
  konamiUnlocked: boolean;
  onKonamiTouchStart: (e: TouchEvent) => void;
  onKonamiTouchEnd: (e: TouchEvent) => void;
  onKonamiButtonTap: (code: 'KeyB' | 'KeyA') => void;
  onSecretPressStart: () => void;
  onSecretPressEnd: () => void;
}

/** Editorial esports hero — GSAP (in GameSetupMenu) owns the entrance. */
export function LandingHero({
  konamiUnlocked,
  onKonamiTouchStart,
  onKonamiTouchEnd,
  onKonamiButtonTap,
  onSecretPressStart,
  onSecretPressEnd,
}: LandingHeroProps) {
  return (
    <div
      className="relative touch-none select-none"
      onTouchStart={onKonamiTouchStart}
      onTouchEnd={onKonamiTouchEnd}
    >
      <div data-hero-tag className="mb-4 flex flex-wrap items-center gap-2">
        <span className="chamfer-sm ui-eyebrow inline-block bg-[var(--neon-orange)] px-3 py-2 text-white">
          A deeper way to play
        </span>
        {konamiUnlocked && (
          <span className="chamfer-sm font-display inline-flex items-center gap-1 bg-[var(--neon-violet)] px-3 py-1 text-[11px] font-bold tracking-[0.2em] text-[var(--on-accent)] uppercase">
            <Sparkles className="size-3" />
            Secret boards
          </span>
        )}
      </div>

      <h1
        className="font-hero cursor-default leading-[0.86] tracking-tight uppercase"
        onPointerDown={onSecretPressStart}
        onPointerUp={onSecretPressEnd}
        onPointerCancel={onSecretPressEnd}
        onContextMenu={(event) => event.preventDefault()}
        title=""
      >
        <span data-hero-line className="block overflow-hidden">
          <span className="block text-[clamp(3.35rem,9.5vw,5.8rem)] text-[var(--arcade-fg)]">
            Twisted
          </span>
        </span>
        <span data-hero-line className="block overflow-hidden">
          <span className="block text-[clamp(3.35rem,9.5vw,5.8rem)] text-[var(--neon-orange)]">
            Tac<span className="text-[var(--arcade-fg)]">/</span>
          </span>
        </span>
      </h1>

      <p
        data-hero-tag
        className="font-body mt-4 max-w-md text-sm leading-relaxed arcade-text-muted"
      >
        Stack layers, strike through depth, and win the cube.
      </p>

      {!konamiUnlocked && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="absolute bottom-0 left-0 z-10 size-12 opacity-0"
            onClick={() => onKonamiButtonTap('KeyB')}
          />
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="absolute right-0 bottom-0 z-10 size-12 opacity-0"
            onClick={() => onKonamiButtonTap('KeyA')}
          />
        </>
      )}
    </div>
  );
}
