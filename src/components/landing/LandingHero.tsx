import { motion } from 'motion/react';
import type { TouchEvent } from 'react';
import { Sparkles } from 'lucide-react';

const TITLE_WORDS = ['TWISTED', 'TAC'];

interface LandingHeroProps {
  konamiUnlocked: boolean;
  onKonamiTouchStart: (e: TouchEvent) => void;
  onKonamiTouchEnd: (e: TouchEvent) => void;
  onKonamiButtonTap: (code: 'KeyB' | 'KeyA') => void;
}

export function LandingHero({
  konamiUnlocked,
  onKonamiTouchStart,
  onKonamiTouchEnd,
  onKonamiButtonTap,
}: LandingHeroProps) {
  return (
    <div
      className="relative touch-none select-none"
      onTouchStart={onKonamiTouchStart}
      onTouchEnd={onKonamiTouchEnd}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="mb-4 flex flex-wrap items-center gap-2"
      >
        <span className="font-body rounded-full border border-[var(--neon-lime)]/30 bg-[var(--neon-lime)]/10 px-3 py-1 text-[10px] font-semibold tracking-[0.2em] text-[var(--neon-lime)] uppercase">
          Twist the cube
        </span>
        {konamiUnlocked && (
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="font-body flex items-center gap-1 rounded-full border border-[var(--neon-violet)]/40 bg-[var(--neon-violet)]/15 px-3 py-1 text-[10px] font-semibold tracking-wider text-[var(--neon-violet)] uppercase"
          >
            <Sparkles className="size-3" />
            Secret boards
          </motion.span>
        )}
      </motion.div>

      <h1 className="font-display leading-[0.88] font-extrabold tracking-tight text-white">
        {TITLE_WORDS.map((word, i) => (
          <motion.span
            key={word}
            className="block text-[clamp(2.8rem,11vw,5.5rem)]"
            initial={{ opacity: 0, x: -40, rotate: -2 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            transition={{
              delay: 0.15 + i * 0.08,
              type: 'spring',
              stiffness: 120,
              damping: 14,
            }}
            style={{
              textShadow:
                i % 2 === 0
                  ? '0 0 40px var(--neon-orange-glow)'
                  : '0 0 40px var(--neon-violet-glow)',
            }}
          >
            <span
              className={
                i % 2 === 0
                  ? 'bg-gradient-to-r from-[var(--neon-orange)] to-[#ff9a4d] bg-clip-text text-transparent'
                  : 'bg-gradient-to-r from-[var(--neon-violet)] to-[#c084fc] bg-clip-text text-transparent'
              }
            >
              {word}
            </span>
          </motion.span>
        ))}
      </h1>

      <motion.p
        className="font-body mt-5 max-w-md text-base arcade-text-muted sm:text-lg"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.45 }}
      >
        Stack layers. Strike through depth. Win the cube.
      </motion.p>

      {!konamiUnlocked && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="absolute bottom-0 left-0 z-10 size-12 opacity-0"
            onClick={() => onKonamiButtonTap('KeyB')}
          />
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="absolute right-0 bottom-0 z-10 size-12 opacity-0"
            onClick={() => onKonamiButtonTap('KeyA')}
          />
        </>
      )}
    </div>
  );
}
