import { cn } from '../../lib/utils';

const ITEMS = [
  'TWISTED TAC',
  '3D LINES',
  'LAYER WINS',
  'SECRET BOARDS',
  'STACK · STRIKE · WIN',
];

export function LandingMarquee() {
  const track = [...ITEMS, ...ITEMS];

  return (
    <div className="relative overflow-hidden border-y border-[var(--game-border)]/40 bg-[var(--game-layer)]/30 py-1.5">
      <div
        className="flex w-max gap-10 whitespace-nowrap"
        style={{ animation: 'landing-marquee 28s linear infinite' }}
      >
        {track.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className={cn(
              'font-display text-xs font-extrabold tracking-[0.25em] uppercase',
              i % 2 === 0 ? 'arcade-text' : 'arcade-text-muted'
            )}
          >
            {item}
            <span className="mx-10 text-[var(--neon-orange)]">{'//'}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
