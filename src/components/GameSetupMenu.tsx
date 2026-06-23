import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Bot, Users, ChevronRight, Info } from 'lucide-react';
import {
  BoardSize,
  GameMode,
  createGameConfig,
  getRulesPreview,
  DEFAULT_BOARD_SIZE,
  KONAMI_BOARD_SIZES,
} from '../utils/gameConfig';
import { useKonamiUnlock } from '../hooks/useKonamiUnlock';
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
import { ThemeToggle } from './ThemeToggle';

interface GameSetupMenuProps {
  onStart: (size: BoardSize, mode: GameMode) => void;
}

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
  const [selectedSize, setSelectedSize] = useState<BoardSize>(DEFAULT_BOARD_SIZE);
  const {
    konamiUnlocked,
    handleKonamiTouchStart,
    handleKonamiTouchEnd,
    handleKonamiButtonTap,
  } = useKonamiUnlock();

  const config = createGameConfig(selectedSize, '3D');
  const rulesPreview = getRulesPreview(config);

  return (
    <div className="relative flex min-h-dvh w-full items-center justify-center overflow-y-auto bg-background px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:py-10">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>
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
        <Card className="glass-elevated relative rounded-2xl border-border/40">
          <CardHeader
            className="relative touch-none space-y-3 text-center select-none"
            onTouchStart={handleKonamiTouchStart}
            onTouchEnd={handleKonamiTouchEnd}
          >
            <div className="flex items-center justify-center gap-2">
              <Badge
                variant="secondary"
                className="font-mono text-[10px] uppercase tracking-widest"
              >
                Spatial Strategy
              </Badge>
              {konamiUnlocked && (
                <Badge className="border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-300">
                  Secret boards
                </Badge>
              )}
            </div>
            <CardTitle className="text-4xl font-bold tracking-tight sm:text-5xl">
              3D Tic Tac Toe
            </CardTitle>
            <CardDescription className="text-base">
              Classic tic-tac-toe, extended across layers and dimensions.
            </CardDescription>
            {!konamiUnlocked && (
              <>
                <button
                  type="button"
                  aria-hidden
                  tabIndex={-1}
                  className="absolute bottom-0 left-0 z-10 size-12 opacity-0"
                  onClick={() => handleKonamiButtonTap('KeyB')}
                />
                <button
                  type="button"
                  aria-hidden
                  tabIndex={-1}
                  className="absolute right-0 bottom-0 z-10 size-12 opacity-0"
                  onClick={() => handleKonamiButtonTap('KeyA')}
                />
              </>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {konamiUnlocked && (
              <div className="space-y-3">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                  Board size
                </Label>
                <ToggleGroup
                  type="single"
                  value={String(selectedSize)}
                  onValueChange={(v) => v && setSelectedSize(Number(v) as BoardSize)}
                  className="grid w-full grid-cols-4 gap-2 sm:flex sm:flex-wrap sm:justify-center"
                  variant="outline"
                >
                  {KONAMI_BOARD_SIZES.map((size) => (
                    <ToggleGroupItem
                      key={size}
                      value={String(size)}
                      className={cn(
                        'size-10 shrink-0 flex-none rounded-xl border p-0 text-xs font-semibold transition-all duration-200 sm:size-11 sm:text-sm',
                        'first:rounded-xl last:rounded-xl',
                        'data-[variant=outline]:border data-[variant=outline]:border-l',
                        'data-[state=on]:ring-2 data-[state=on]:ring-orange-500/40',
                        'data-[state=on]:border-orange-500/50 data-[state=on]:bg-orange-500/15 data-[state=on]:text-orange-700 dark:data-[state=on]:text-orange-200',
                        size <= 2 &&
                          'data-[state=on]:ring-violet-400/40 data-[state=on]:border-violet-400 data-[state=on]:bg-violet-500/15 data-[state=on]:text-violet-700 dark:data-[state=on]:text-violet-200'
                      )}
                    >
                      {size}×{size}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            )}

            <Alert className="glass-surface rounded-xl border-border/40">
              <Info className="size-4" />
              <AlertTitle className="text-sm">How to win</AlertTitle>
              <AlertDescription>{rulesPreview}</AlertDescription>
            </Alert>
          </CardContent>

          <Separator className="opacity-40" />

          <CardFooter className="flex-col gap-3 pt-6">
            <ModeCard
              variant="primary"
              icon={<Bot className="size-5" />}
              title="Single Player"
              subtitle="Vs. strategic AI"
              onClick={() => onStart(selectedSize, 'PVE')}
            />
            <ModeCard
              icon={<Users className="size-5 text-violet-400" />}
              title="Two Player"
              subtitle="Local pass-and-play"
              onClick={() => onStart(selectedSize, 'PVP')}
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
