import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { Bot, Globe, Users, HelpCircle } from 'lucide-react';
import { playArcadeSound } from '../../utils/arcadeSound';
import { BoardSize, GameMode, KONAMI_BOARD_SIZES } from '../../utils/gameConfig';
import { cn } from '../../lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';

interface LandingPlayPanelProps {
  selectedSize: BoardSize;
  onSizeChange: (size: BoardSize) => void;
  konamiUnlocked: boolean;
  rulesPreview: string;
  onStart: (mode: GameMode) => void;
  onCreateOnline: () => void;
  onJoinOnline: () => void;
}

interface PlayTileProps {
  title: string;
  subtitle: string;
  icon: ReactNode;
  variant: 'orange' | 'violet';
  onClick: () => void;
  delay: number;
}

function PlayTile({ title, subtitle, icon, variant, onClick, delay }: PlayTileProps) {
  const isOrange = variant === 'orange';

  return (
    <motion.button
      type="button"
      onClick={() => {
        playArcadeSound('tap');
        onClick();
      }}
      initial={{ opacity: 0, y: 24, rotate: isOrange ? -1.5 : 1.5 }}
      animate={{ opacity: 1, y: 0, rotate: isOrange ? -1.5 : 1.5 }}
      whileHover={{
        scale: 1.04,
        rotate: 0,
        boxShadow: isOrange
          ? '0 20px 50px var(--neon-orange-glow)'
          : '0 20px 50px var(--neon-violet-glow)',
        transition: { duration: 0.2, delay: 0, type: 'spring', stiffness: 400, damping: 28 },
      }}
      whileTap={{
        scale: 0.97,
        transition: { duration: 0.1, delay: 0 },
      }}
      transition={{
        opacity: { delay, type: 'spring', stiffness: 200, damping: 18 },
        y: { delay, type: 'spring', stiffness: 200, damping: 18 },
        rotate: { delay, type: 'spring', stiffness: 200, damping: 18 },
      }}
      className={cn(
        'group relative flex min-h-[5.5rem] flex-1 flex-col justify-between overflow-hidden rounded-2xl p-5 text-left',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
        isOrange
          ? 'bg-gradient-to-br from-[var(--neon-orange)] to-[#ea580c]'
          : 'bg-gradient-to-br from-[var(--neon-violet)] to-[#7c3aed]'
      )}
    >
      <div className="absolute -top-6 -right-6 size-24 rounded-full bg-white/15 blur-2xl transition-transform duration-500 group-hover:scale-150" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            {title}
          </p>
          <p className="font-body mt-1 text-sm text-white/75">{subtitle}</p>
        </div>
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-black/20 text-white">
          {icon}
        </span>
      </div>
    </motion.button>
  );
}

export function LandingPlayPanel({
  selectedSize,
  onSizeChange,
  konamiUnlocked,
  rulesPreview,
  onStart,
  onCreateOnline,
  onJoinOnline,
}: LandingPlayPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45, duration: 0.55 }}
      className="arcade-glass font-body relative rounded-3xl p-5 sm:p-6"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="font-display text-sm font-bold tracking-[0.18em] arcade-text-muted uppercase">
          Choose mode
        </p>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="arcade-glass flex size-8 items-center justify-center rounded-full arcade-text-muted transition-colors hover:text-[var(--arcade-fg)] dark:hover:text-white"
              aria-label="How to win"
            >
              <HelpCircle className="size-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            className="arcade-glass max-w-xs arcade-text"
          >
            <p className="font-display mb-1 text-xs font-bold tracking-wider uppercase">
              How to win
            </p>
            <p className="text-sm arcade-text-muted">{rulesPreview}</p>
          </PopoverContent>
        </Popover>
      </div>

      {konamiUnlocked && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-4"
        >
          <p className="mb-2 text-[10px] font-semibold tracking-[0.2em] text-[var(--neon-lime)] uppercase">
            Board size
          </p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {KONAMI_BOARD_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => onSizeChange(size)}
                className={cn(
                  'font-display flex min-h-10 items-center justify-center rounded-xl border px-1 text-sm font-bold leading-none transition-all duration-200',
                  selectedSize === size
                    ? size <= 2
                      ? 'border-[var(--neon-violet)] bg-[var(--neon-violet)]/25 text-white shadow-[0_0_20px_var(--neon-violet-glow)]'
                      : 'border-[var(--neon-orange)] bg-[var(--neon-orange)]/25 text-white shadow-[0_0_20px_var(--neon-orange-glow)]'
                    : 'border-[var(--game-border)]/50 bg-[var(--game-layer)]/50 arcade-text-muted hover:border-[var(--neon-violet)]/40 hover:text-[var(--arcade-fg)] dark:hover:text-white'
                )}
              >
                {size}×{size}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <PlayTile
          title="VS AI"
          subtitle="Beat the bot"
          icon={<Bot className="size-6" />}
          variant="orange"
          onClick={() => onStart('PVE')}
          delay={0.5}
        />
        <PlayTile
          title="2 PLAYER"
          subtitle="Same-screen showdown"
          icon={<Users className="size-6" />}
          variant="violet"
          onClick={() => onStart('PVP')}
          delay={0.58}
        />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => {
            playArcadeSound('tap');
            onCreateOnline();
          }}
          className="font-body arcade-glass flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--neon-lime)]/30 bg-[var(--neon-lime)]/10 px-4 text-sm font-semibold text-[var(--neon-lime)] transition-[background-color,transform] duration-100 hover:bg-[var(--neon-lime)]/20 active:scale-95"
        >
          <Globe className="size-4" />
          Challenge the world
        </button>
        <button
          type="button"
          onClick={() => {
            playArcadeSound('tap');
            onJoinOnline();
          }}
          className="font-body arcade-glass flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-semibold arcade-text-muted transition-[background-color,color,transform] duration-100 hover:bg-white/5 hover:text-white active:scale-95"
        >
          Join with code
        </button>
      </div>
      <p className="font-body mt-2 text-center text-[10px] arcade-text-muted">
        Online play requires sign-in and a username.
      </p>
    </motion.div>
  );
}
