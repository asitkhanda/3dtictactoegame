import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AppHeader } from '../layout/AppHeader';
import { ArcadeShell } from '../ArcadeShell';

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

export function LegalPageLayout({ title, lastUpdated, children }: LegalPageLayoutProps) {
  return (
    <ArcadeShell variant="landing">
      <AppHeader />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 pt-24 pb-10 sm:px-6">
        <header className="text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {title}
          </h1>
          <p className="font-body mt-2 text-sm arcade-text-muted">Last updated: {lastUpdated}</p>
        </header>

        <article className="arcade-glass legal-prose rounded-2xl px-6 py-8 sm:px-8">
          {children}
        </article>

        <nav className="font-body flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm arcade-text-muted">
          <Link
            to="/"
            className="underline-offset-4 hover:text-[var(--neon-orange)] hover:underline"
          >
            Home
          </Link>
          <span aria-hidden>·</span>
          <Link
            to="/privacy-policy"
            className="underline-offset-4 hover:text-[var(--neon-orange)] hover:underline"
          >
            Privacy Policy
          </Link>
          <span aria-hidden>·</span>
          <Link
            to="/terms-of-service"
            className="underline-offset-4 hover:text-[var(--neon-orange)] hover:underline"
          >
            Terms of Service
          </Link>
        </nav>
      </main>
    </ArcadeShell>
  );
}
