import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner@2.0.3';
import { Bot, Users, Box, Layers, Sparkles, ChevronRight, Info } from 'lucide-react';
import {
  BoardSize,
  ViewMode,
  GameMode,
  createGameConfig,
  getRulesPreview,
  KONAMI_SEQUENCE,
  KONAMI_STORAGE_KEY,
} from '../utils/gameConfig';
import { cn } from '../lib/utils';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';

interface GameSetupMenuProps {
  onStart: (size: BoardSize, viewMode: ViewMode, mode: GameMode) => void;
}

const VISIBLE_SIZES: BoardSize[] = [2, 3, 4, 5, 6, 7, 8];

interface ModeCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

function ModeCard({ icon, title, subtitle, onClick, variant = 'secondary' }: ModeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full items-center justify-between gap-3 rounded-xl p-4 text-left transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'active:scale-[0.98]',
        variant === 'primary'
          ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/30 hover:bg-orange-500'
          : 'glass-surface hover:bg-surface-container-high'
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors',
            variant === 'primary'
              ? 'bg-white/15'
              : 'bg-primary/10 group-hover:bg-primary/15'
          )}
        >
          {icon}
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="font-semibold leading-tight">{title}</span>
          <span
            className={cn(
              'text-xs leading-snug',
              variant === 'primary' ? 'text-white/70' : 'text-muted-foreground'
            )}
          >
            {subtitle}
          </span>
        </span>
      </span>
      <ChevronRight
        className={cn(
          'size-4 shrink-0 transition-transform group-hover:translate-x-0.5',
          variant === 'primary' ? 'opacity-70' : 'text-muted-foreground opacity-50'
        )}
      />
    </button>
  );
}

export function GameSetupMenu({ onStart }: GameSetupMenuProps) {
  const [selectedSize, setSelectedSize] = useState<BoardSize>(3);
  const [viewMode, setViewMode] = useState<ViewMode>('3D');
  const [konamiUnlocked, setKonamiUnlocked] = useState(() => {
    try {
      return sessionStorage.getItem(KONAMI_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [konamiIndex, setKonamiIndex] = useState(0);

  const config = createGameConfig(selectedSize, viewMode);
  const rulesPreview = getRulesPreview(config);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const expected = KONAMI_SEQUENCE[konamiIndex];
      if (e.code === expected) {
        const next = konamiIndex + 1;
        if (next === KONAMI_SEQUENCE.length) {
          setKonamiUnlocked(true);
          setKonamiIndex(0);
          try {
            sessionStorage.setItem(KONAMI_STORAGE_KEY, '1');
          } catch {
            /* ignore */
          }
          toast('You found the void.', {
            description: '1×1 board size unlocked.',
            icon: <Sparkles className="size-4 text-violet-400" />,
          });
        } else {
          setKonamiIndex(next);
        }
      } else if (e.code === KONAMI_SEQUENCE[0]) {
        setKonamiIndex(1);
      } else {
        setKonamiIndex(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [konamiIndex]);

  const sizes: BoardSize[] = konamiUnlocked ? [1, ...VISIBLE_SIZES] : VISIBLE_SIZES;

  return (
    <div className="relative flex min-h-dvh w-full items-center justify-center overflow-y-auto bg-background px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-500/10 via-background to-background"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-violet-500/10 via-transparent to-transparent"
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md sm:max-w-lg"
      >
        <Card className="glass-elevated rounded-2xl border-border/40">
          <CardHeader className="space-y-3 text-center">
            <div className="flex items-center justify-center gap-2">
              <Badge
                variant="secondary"
                className="font-mono text-[10px] uppercase tracking-widest"
              >
                Spatial Strategy
              </Badge>
              {konamiUnlocked && (
                <Badge className="border-violet-500/30 bg-violet-500/10 text-violet-300">
                  Void unlocked
                </Badge>
              )}
            </div>
            <CardTitle className="text-4xl font-bold tracking-tight sm:text-5xl">
              3D Tic Tac Toe
            </CardTitle>
            <CardDescription className="text-base">
              Classic tic-tac-toe, extended across layers and dimensions.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                Board size
              </Label>
              <ToggleGroup
                type="single"
                value={String(selectedSize)}
                onValueChange={(v) => v && setSelectedSize(Number(v) as BoardSize)}
                className="flex w-full flex-wrap justify-center gap-2"
                variant="outline"
              >
                {sizes.map((size) => (
                  <ToggleGroupItem
                    key={size}
                    value={String(size)}
                    className={cn(
                      'size-11 shrink-0 flex-none rounded-xl border p-0 text-sm font-semibold transition-all duration-200',
                      'first:rounded-xl last:rounded-xl',
                      'data-[variant=outline]:border data-[variant=outline]:border-l',
                      'data-[state=on]:ring-2 data-[state=on]:ring-orange-500/40',
                      'data-[state=on]:border-orange-500/50 data-[state=on]:bg-orange-500/15 data-[state=on]:text-orange-200',
                      size === 1 &&
                        'data-[state=on]:ring-violet-400/40 data-[state=on]:border-violet-400 data-[state=on]:bg-violet-500/15 data-[state=on]:text-violet-200'
                    )}
                  >
                    {size}×{size}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <div className="space-y-3">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                View mode
              </Label>
              <ToggleGroup
                type="single"
                value={viewMode}
                onValueChange={(v) => v && setViewMode(v as ViewMode)}
                className="grid w-full grid-cols-2 gap-2 rounded-xl bg-surface-container p-1"
                variant="outline"
              >
                <ToggleGroupItem
                  value="2D"
                  className={cn(
                    'h-11 flex-1 gap-2 rounded-lg border-0 transition-all duration-200',
                    'first:rounded-lg last:rounded-lg',
                    'data-[state=on]:bg-orange-500/15 data-[state=on]:text-orange-200',
                    'data-[state=on]:ring-2 data-[state=on]:ring-orange-500/40',
                    'data-[state=off]:bg-transparent data-[state=off]:hover:bg-white/5'
                  )}
                >
                  <Layers className="size-4" />
                  2D Flat
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="3D"
                  className={cn(
                    'h-11 flex-1 gap-2 rounded-lg border-0 transition-all duration-200',
                    'first:rounded-lg last:rounded-lg',
                    'data-[state=on]:bg-orange-500/15 data-[state=on]:text-orange-200',
                    'data-[state=on]:ring-2 data-[state=on]:ring-orange-500/40',
                    'data-[state=off]:bg-transparent data-[state=off]:hover:bg-white/5'
                  )}
                >
                  <Box className="size-4" />
                  3D Stack
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <Alert className="glass-surface rounded-xl border-border/40">
              <Info className="size-4" />
              <AlertTitle className="text-sm">How to win</AlertTitle>
              <AlertDescription>{rulesPreview}</AlertDescription>
              {selectedSize >= 6 && (
                <AlertDescription className="text-muted-foreground mt-2 text-xs">
                  PVE uses strategic AI — not perfect play on large boards.
                </AlertDescription>
              )}
            </Alert>
          </CardContent>

          <Separator className="opacity-40" />

          <CardFooter className="flex-col gap-3 pt-6">
            <ModeCard
              variant="primary"
              icon={<Bot className="size-5" />}
              title="Single Player"
              subtitle="Vs. strategic AI"
              onClick={() => onStart(selectedSize, viewMode, 'PVE')}
            />
            <ModeCard
              icon={<Users className="size-5 text-violet-400" />}
              title="Two Player"
              subtitle="Local pass-and-play"
              onClick={() => onStart(selectedSize, viewMode, 'PVP')}
            />
          </CardFooter>
        </Card>

        <p className="text-muted-foreground mt-6 text-center text-xs">
          Made with curiosity by{' '}
          <a
            href="https://asit.design"
            target="_blank"
            rel="noreferrer"
            className="text-foreground/80 underline-offset-4 hover:text-orange-400 hover:underline"
          >
            Asit Khanda
          </a>
        </p>
      </motion.div>
    </div>
  );
}
