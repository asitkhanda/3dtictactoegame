/** Editorial esports hero — GSAP (in GameSetupMenu) owns the entrance. */
export function LandingHero() {
  return (
    <div className="relative select-none">
      <div data-hero-tag className="mb-4 flex flex-wrap items-center gap-2">
        <span className="chamfer-sm ui-eyebrow inline-block bg-[var(--neon-orange)] px-3 py-2 text-white">
          A deeper way to play
        </span>
      </div>

      <h1 className="font-hero cursor-default leading-[0.86] tracking-tight uppercase">
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
    </div>
  );
}
