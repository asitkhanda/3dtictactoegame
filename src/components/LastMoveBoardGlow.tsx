import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface LastMoveBoardGlowProps {
  player: 'X' | 'O' | null;
  className?: string;
}

export function LastMoveBoardGlow({ player, className }: LastMoveBoardGlowProps) {
  return (
    <motion.div
      className={cn(
        'pointer-events-none absolute inset-0 rounded-xl',
        player === 'X' && 'ring-2 ring-orange-400/60',
        player === 'O' && 'ring-2 ring-violet-400/60',
        !player && 'ring-2 ring-primary/40',
        className
      )}
      initial={{ opacity: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        boxShadow:
          player === 'X'
            ? [
                '0 0 0px transparent',
                '0 0 28px var(--player-x-glow)',
                '0 0 28px var(--player-x-glow)',
                '0 0 0px transparent',
              ]
            : player === 'O'
              ? [
                  '0 0 0px transparent',
                  '0 0 28px var(--player-o-glow)',
                  '0 0 28px var(--player-o-glow)',
                  '0 0 0px transparent',
                ]
              : [
                  '0 0 0px transparent',
                  '0 0 20px rgba(128,128,128,0.35)',
                  '0 0 20px rgba(128,128,128,0.35)',
                  '0 0 0px transparent',
                ],
      }}
      transition={{ duration: 1.5, times: [0, 0.15, 0.7, 1], ease: 'easeOut' }}
    />
  );
}
