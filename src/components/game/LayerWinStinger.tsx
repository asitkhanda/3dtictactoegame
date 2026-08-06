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
              'font-display flex items-center gap-3 border-y-2 border-black/60 px-8 py-2 text-2xl font-extrabold tracking-widest uppercase sm:text-3xl',
              event.winner === 'X'
                ? 'bg-[var(--neon-orange)] text-white'
                : 'bg-[var(--neon-violet)] text-white dark:text-[#0f1923]'
            )}
            style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.3)' }}
          >
            <span>Layer {event.layerNumber}</span>
            <span className="opacity-60">—</span>
            <span>{event.claimant}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
