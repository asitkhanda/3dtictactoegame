import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  BoardSize,
  GameMode,
  createGameConfig,
  getRulesPreview,
  DEFAULT_BOARD_SIZE,
} from '../utils/gameConfig';
import { useKonamiUnlock } from '../hooks/useKonamiUnlock';
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
  const {
    konamiUnlocked,
    handleKonamiTouchStart,
    handleKonamiTouchEnd,
    handleKonamiButtonTap,
  } = useKonamiUnlock();

  const config = createGameConfig(selectedSize, '3D');
  const rulesPreview = getRulesPreview(config);

  return (
    <ArcadeShell variant="landing">
      <AppHeader />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 pt-20 pb-6 sm:px-6 sm:pt-24 lg:grid lg:grid-cols-2 lg:grid-rows-[auto_auto] lg:items-start lg:gap-x-10 lg:gap-y-8 lg:pt-28 lg:pb-10">
        <motion.section
          className="order-1 lg:col-start-1 lg:row-start-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <LandingHero
            konamiUnlocked={konamiUnlocked}
            onKonamiTouchStart={handleKonamiTouchStart}
            onKonamiTouchEnd={handleKonamiTouchEnd}
            onKonamiButtonTap={handleKonamiButtonTap}
          />
        </motion.section>

        <motion.section
          className="order-2 flex items-center justify-center py-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-stretch lg:py-0"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6, type: 'spring', stiffness: 90 }}
        >
          <LandingBoardPreview />
        </motion.section>

        <div className="order-3 lg:col-start-1 lg:row-start-2">
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

      <footer className="relative z-10 px-4 py-4 text-center">
        <p className="text-xs arcade-text-muted">
          Made with curiosity by{' '}
          <a
            href="https://asit.space/"
            target="_blank"
            rel="noreferrer"
            className="underline-offset-4 transition-colors hover:text-[var(--neon-orange)] hover:underline dark:text-white/55"
          >
            Asit Khanda
          </a>
        </p>
      </footer>
    </ArcadeShell>
  );
}
