import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

export interface LayerWinEvent {
  /** Unique per event so repeated stingers re-animate. */
  key: number;
  layerNumber: number;
  winner: 'X' | 'O';
  /** Label for who claimed it, e.g. "YOURS", "AI'S", "X". */
  claimant: string;
}

interface LayerWinStingerProps {
  event: LayerWinEvent | null;
}

/** Banner that sweeps across the arena when a layer is claimed mid-game. */
export function LayerWinStinger({ event }: LayerWinStingerProps) {
  return (
    <AnimatePresence>
      {event && (
        <motion.div
          key={event.key}
          aria-hidden
          initial={{ x: '-120%', opacity: 0, skewX: -12 }}
          animate={{ x: 0, opacity: 1, skewX: -6 }}
          exit={{ x: '120%', opacity: 0, skewX: -12 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          className="pointer-events-none fixed inset-x-0 top-[38%] z-[60] flex justify-center"
        >
          <div
            className={cn(
              'font-display flex items-center gap-3 border-y-2 px-8 py-2 text-2xl font-extrabold tracking-widest uppercase sm:text-3xl',
              event.winner === 'X'
                ? 'border-[var(--neon-orange)] bg-[#1a0d02]/85 text-[var(--neon-orange)]'
                : 'border-[var(--neon-violet)] bg-[#12061f]/85 text-[var(--neon-violet)]'
            )}
            style={{
              textShadow:
                event.winner === 'X'
                  ? '0 0 16px var(--neon-orange-glow)'
                  : '0 0 16px var(--neon-violet-glow)',
            }}
          >
            <span>Layer {event.layerNumber}</span>
            <span className="text-white/60">—</span>
            <span>{event.claimant}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
