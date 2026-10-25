import { Link } from 'react-router-dom';
import { Smartphone } from 'lucide-react';
import { getIosBetaCta } from '../../config/app';

/** Announces the iPhone/iPad app while it is in TestFlight beta. */
export function IosBetaCard() {
  const cta = getIosBetaCta();

  return (
    <aside
      data-hero-tag
      aria-labelledby="ios-beta-title"
      className="chamfer relative flex flex-col gap-3 bg-[color-mix(in_oklch,var(--arcade-fg),transparent_93%)] p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5"
    >
      <span className="flex size-10 shrink-0 items-center justify-center bg-[var(--neon-violet)] text-[var(--on-accent)]">
        <Smartphone className="size-5" aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <p className="ui-eyebrow mb-0.5 flex items-center gap-2">
          <span className="chamfer-sm bg-[var(--neon-orange)] px-2 py-0.5 text-[10px] font-bold tracking-[0.2em] text-white uppercase">
            New
          </span>
          iOS beta
        </p>
        <h2
          id="ios-beta-title"
          className="font-display text-base leading-tight font-bold tracking-[0.03em] uppercase"
        >
          Twisted Tac for iPhone &amp; iPad
        </h2>
        <p className="font-body mt-1 text-xs leading-relaxed arcade-text-muted">
          A native 3D board with haptics and Liquid Glass, on the same leaderboard. Now in beta on
          TestFlight.
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2">
        <a
          href={cta.href}
          {...(cta.external ? { target: '_blank', rel: 'noreferrer' } : {})}
          className="chamfer-sm font-display bg-[var(--neon-orange)] px-4 py-2.5 text-xs font-bold tracking-[0.12em] text-white uppercase transition-[filter] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-[var(--neon-orange)]/70 focus-visible:outline-none"
        >
          {cta.label}
        </a>
        <Link
          to="/support#ios-beta"
          className="font-body text-xs underline-offset-4 arcade-text-muted hover:text-[var(--neon-orange)] hover:underline"
        >
          Details
        </Link>
      </div>
    </aside>
  );
}
