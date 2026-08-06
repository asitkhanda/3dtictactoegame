import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import {
  BoardSize,
  GameMode,
  createGameConfig,
  getRulesPreview,
  DEFAULT_BOARD_SIZE,
} from '../utils/gameConfig';
import { useKonamiUnlock } from '../hooks/useKonamiUnlock';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { ArcadeShell } from './ArcadeShell';
import { AppHeader } from './layout/AppHeader';
import { LandingHero } from './landing/LandingHero';
import { LandingBoardPreview } from './landing/LandingBoardPreview';
import { LandingPlayPanel } from './landing/LandingPlayPanel';
import { LandingMarquee } from './landing/LandingMarquee';
import { ResumeGameBanner } from './online/ResumeGameBanner';
import { CreateRoomDialog } from './online/CreateRoomDialog';
import { JoinRoomDialog } from './online/JoinRoomDialog';

interface GameSetupMenuProps {
  onStart: (size: BoardSize, mode: GameMode) => void;
}

export function GameSetupMenu({ onStart }: GameSetupMenuProps) {
  const navigate = useNavigate();
  const [selectedSize, setSelectedSize] = useState<BoardSize>(DEFAULT_BOARD_SIZE);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const {
    konamiUnlocked,
    handleKonamiTouchStart,
    handleKonamiTouchEnd,
    handleKonamiButtonTap,
  } = useKonamiUnlock();

  const config = createGameConfig(selectedSize, '3D');
  const rulesPreview = getRulesPreview(config);

  // GSAP owns the entrance choreography: slab wipe → title lines rise →
  // tags fade → mode rows cascade → preview settles.
  useEffect(() => {
    if (reducedMotion) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('[data-hero-slab]', { xPercent: 115, duration: 0.7 })
        .from(
          '[data-hero-line] > span',
          { yPercent: 115, duration: 0.55, stagger: 0.1 },
          '-=0.35'
        )
        .from('[data-hero-tag]', { opacity: 0, x: -20, duration: 0.4, stagger: 0.08 }, '-=0.3')
        .from('[data-mode-row]', { opacity: 0, x: -36, duration: 0.4, stagger: 0.06 }, '-=0.35')
        .from('[data-hero-side]', { opacity: 0, scale: 0.96, duration: 0.6 }, '-=0.5');
    }, rootRef);
    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <ArcadeShell variant="landing">
      <div ref={rootRef} className="relative flex min-h-dvh flex-col">
        {/* Signature diagonal slab behind the board preview */}
        <div
          data-hero-slab
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] bg-[var(--neon-orange)] lg:block"
          style={{ clipPath: 'polygon(30% 0, 100% 0, 100% 100%, 0 100%)' }}
        />

        <AppHeader />

        <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 pt-20 pb-6 sm:px-6 sm:pt-24 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-x-12 lg:pt-16 lg:pb-3">
          <div className="flex flex-col gap-8 lg:gap-5">
            <LandingHero
              konamiUnlocked={konamiUnlocked}
              onKonamiTouchStart={handleKonamiTouchStart}
              onKonamiTouchEnd={handleKonamiTouchEnd}
              onKonamiButtonTap={handleKonamiButtonTap}
            />

            <div>
              <ResumeGameBanner />
              <LandingPlayPanel
                selectedSize={selectedSize}
                onSizeChange={setSelectedSize}
                konamiUnlocked={konamiUnlocked}
                rulesPreview={rulesPreview}
                onStart={(mode) => onStart(selectedSize, mode)}
                onCreateOnline={() => setCreateOpen(true)}
                onJoinOnline={() => setJoinOpen(true)}
              />
            </div>
          </div>

          <div data-hero-side className="flex items-center justify-center py-4 lg:py-0">
            <LandingBoardPreview />
          </div>
        </main>

        <CreateRoomDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          boardSize={selectedSize}
          onCreated={(matchId) => navigate(`/play/${matchId}`)}
        />
        <JoinRoomDialog
          open={joinOpen}
          onOpenChange={setJoinOpen}
          onJoined={(matchId) => navigate(`/play/${matchId}`)}
        />

        <LandingMarquee />

        <footer className="relative z-10 px-4 py-2.5 text-center">
          <nav className="font-body mb-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-[var(--arcade-fg)]/75">
            <Link
              to="/privacy-policy"
              className="underline-offset-4 transition-colors hover:text-[var(--neon-orange)] hover:underline"
            >
              Privacy Policy
            </Link>
            <span aria-hidden>·</span>
            <Link
              to="/terms-of-service"
              className="underline-offset-4 transition-colors hover:text-[var(--neon-orange)] hover:underline"
            >
              Terms of Service
            </Link>
          </nav>
          <p className="text-xs arcade-text-muted">
            Made with curiosity by{' '}
            <a
              href="https://asit.space/"
              target="_blank"
              rel="noreferrer"
              className="underline-offset-4 transition-colors hover:text-[var(--neon-orange)] hover:underline"
            >
              Asit Khanda
            </a>
          </p>
        </footer>
      </div>
    </ArcadeShell>
  );
}
