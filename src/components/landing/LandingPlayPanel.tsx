import type { ReactNode } from 'react';
import { Bot, Globe, Users, KeyRound, HelpCircle, ChevronRight } from 'lucide-react';
import { BoardSize, GameMode, KONAMI_BOARD_SIZES } from '../../utils/gameConfig';
import { cn } from '../../lib/utils';
import { playArcadeSound } from '../../utils/arcadeSound';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

interface LandingPlayPanelProps {
  selectedSize: BoardSize;
  onSizeChange: (size: BoardSize) => void;
  konamiUnlocked: boolean;
  rulesPreview: string;
  onStart: (mode: GameMode) => void;
  onCreateOnline: () => void;
  onJoinOnline: () => void;
}

type RowAccent = 'red' | 'ice' | 'ivory';

interface ModeRowProps {
  index: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  accent: RowAccent;
  emphasis?: boolean;
  onClick: () => void;
}

const ACCENT_HOVER: Record<RowAccent, string> = {
  red: 'hover:bg-[var(--neon-orange)] hover:text-white',
  ice: 'hover:bg-[var(--neon-violet)] hover:text-white dark:hover:text-[#0f1923]',
  ivory: 'hover:bg-[var(--neon-lime)] hover:text-[var(--on-accent)]',
};

// Valorant-menu row: number tag, title, chevron; the whole bar fills with its
// accent on hover and shifts right. GSAP staggers these in via [data-mode-row].
function ModeRow({ index, title, subtitle, icon, accent, emphasis = false, onClick }: ModeRowProps) {
  return (
    <button
      type="button"
      data-mode-row
      onClick={() => {
        playArcadeSound('tap');
        onClick();
      }}
      className={cn(
        'chamfer group relative flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left arcade-text sm:gap-4 sm:px-5',
        emphasis
          ? 'bg-[var(--neon-orange)] text-white shadow-[0_14px_28px_var(--neon-orange-glow)]'
          : 'bg-[color-mix(in_oklch,var(--arcade-fg),transparent_93%)]',
        'transition-[background-color,color,transform] duration-150',
        'hover:translate-x-1.5 active:translate-x-2 active:scale-[0.995]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon-orange)]/70',
        ACCENT_HOVER[accent]
      )}
    >
      <span className="font-display w-8 shrink-0 text-sm font-bold tracking-[0.12em] text-[var(--neon-orange)] transition-colors group-hover:text-current sm:w-9 sm:text-base">
        {index}
      </span>
      <span className="min-w-0 flex-1">
        <span className="font-display block text-base leading-tight font-bold tracking-[0.03em] uppercase sm:text-lg">
          {title}
        </span>
        <span className="font-body block text-xs opacity-70">{subtitle}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <span className="opacity-60">{icon}</span>
        <ChevronRight className="size-4 opacity-50 transition-transform duration-150 group-hover:translate-x-1 group-hover:opacity-100" />
      </span>
    </button>
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
    <div className="font-body relative">
      <div data-hero-tag className="mb-3 flex items-center gap-3">
        <span className="h-[2px] w-8 bg-[var(--neon-orange)]" aria-hidden />
        <p className="ui-eyebrow">
          Select mode
        </p>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex size-6 items-center justify-center text-[var(--arcade-fg)]/75 transition-colors hover:text-[var(--neon-orange)]"
              aria-label="How to win"
            >
              <HelpCircle className="size-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" className="chamfer max-w-xs border-0 bg-[var(--card)] arcade-text">
            <p className="font-display mb-1 text-xs font-bold tracking-wider uppercase">
              How to win
            </p>
            <p className="text-sm arcade-text-muted">{rulesPreview}</p>
          </PopoverContent>
        </Popover>
      </div>

      {konamiUnlocked && (
        <div data-mode-row className="mb-3">
          <p className="font-display mb-2 text-[10px] font-bold tracking-[0.3em] text-[var(--neon-violet)] uppercase">
            Board size
          </p>
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
            {KONAMI_BOARD_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => onSizeChange(size)}
                className={cn(
                  'chamfer-sm font-display flex min-h-9 items-center justify-center px-1 text-sm font-bold leading-none transition-colors duration-150',
                  selectedSize === size
                    ? 'bg-[var(--neon-orange)] text-white'
                    : 'bg-[color-mix(in_oklch,var(--arcade-fg),transparent_93%)] arcade-text-muted hover:bg-[color-mix(in_oklch,var(--arcade-fg),transparent_85%)]'
                )}
              >
                {size}×{size}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <ModeRow
          index="01"
          title="Play vs AI"
          subtitle="Start a focused match"
          icon={<Bot className="size-4" />}
          accent="red"
          emphasis
          onClick={() => onStart('PVE')}
        />
        <ModeRow
          index="02"
          title="Local multiplayer"
          subtitle="Play together on one screen"
          icon={<Users className="size-4" />}
          accent="ice"
          onClick={() => onStart('PVP')}
        />
        <ModeRow
          index="03"
          title="Play online"
          subtitle="Challenge another player"
          icon={<Globe className="size-4" />}
          accent="ivory"
          onClick={onCreateOnline}
        />
        <ModeRow
          index="04"
          title="Join a room"
          subtitle="Enter a friend's code"
          icon={<KeyRound className="size-4" />}
          accent="ivory"
          onClick={onJoinOnline}
        />
      </div>
      <p data-hero-tag className="font-body mt-2 text-xs arcade-text-muted">
        Online play requires sign-in and a username.
      </p>
    </div>
  );
}
