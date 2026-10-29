import { Link } from 'react-router-dom';
import { Smartphone } from 'lucide-react';

/** Announces the native apps, which are on their way. */
export function MobileAppsCard() {
  return (
    <aside
      data-hero-tag
      aria-labelledby="mobile-apps-title"
      className="chamfer relative flex flex-col gap-3 bg-[color-mix(in_oklch,var(--arcade-fg),transparent_93%)] p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5"
    >
      <span className="flex size-10 shrink-0 items-center justify-center bg-[var(--neon-violet)] text-[var(--on-accent)]">
        <Smartphone className="size-5" aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <p className="ui-eyebrow mb-0.5 flex items-center gap-2">
          <span className="chamfer-sm bg-[var(--neon-orange)] px-2 py-0.5 text-[10px] font-bold tracking-[0.2em] text-white uppercase">
            Coming soon
          </span>
          iOS &amp; Android
        </p>
        <h2
          id="mobile-apps-title"
          className="font-display text-base leading-tight font-bold tracking-[0.03em] uppercase"
        >
          Twisted Tac for iPhone, iPad &amp; Android
        </h2>
        <p className="font-body mt-1 text-xs leading-relaxed arcade-text-muted">
          Native apps with a smooth 3D board, sound and haptics, on the same account and
          leaderboard as the website. Coming soon.
        </p>
      </div>

      <Link
        to="/support#apps"
        className="font-body shrink-0 text-xs underline-offset-4 arcade-text-muted hover:text-[var(--neon-orange)] hover:underline"
      >
        Details
      </Link>
    </aside>
  );
}
