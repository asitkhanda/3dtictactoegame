import { memo } from 'react';
import { cn } from '../lib/utils';

interface LastMoveBoardGlowProps {
  player: 'X' | 'O' | null;
  className?: string;
}

function LastMoveBoardGlowComponent({ player, className }: LastMoveBoardGlowProps) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 last-move-board-glow',
        player === 'X' && 'last-move-board-glow-x',
        player === 'O' && 'last-move-board-glow-o',
        !player && 'last-move-board-glow-neutral',
        className
      )}
    />
  );
}

export const LastMoveBoardGlow = memo(LastMoveBoardGlowComponent);
