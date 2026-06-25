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
    <div className="relative overflow-hidden border-y border-[var(--game-border)]/40 bg-[var(--game-layer)]/30 py-2.5 backdrop-blur-sm">
      <div
        className="flex w-max gap-10 whitespace-nowrap"
        style={{ animation: 'landing-marquee 28s linear infinite' }}
      >
        {track.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="font-display text-xs font-bold tracking-[0.25em] arcade-text-muted uppercase"
          >
            {item}
            <span className="mx-10 text-[var(--neon-lime)]">◆</span>
          </span>
        ))}
      </div>
    </div>
  );
}
