export function LandingSeoContent() {
  return (
    <section
      aria-labelledby="about-twisted-tac"
      className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6"
    >
      <div className="grid gap-6 border-t border-[var(--arcade-fg)]/15 pt-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <div>
          <h2
            id="about-twisted-tac"
            className="font-display text-xl font-bold tracking-tight text-[var(--arcade-fg)] sm:text-2xl"
          >
            3D Tic-Tac-Toe with a deeper strategy
          </h2>
          <p className="font-body mt-3 max-w-2xl text-sm leading-relaxed arcade-text-muted">
            Twisted Tac turns the familiar nine-square game into a layered tactical board. Build
            lines across each layer or strike through the cube to win. Play a focused match against
            AI, share one screen with a friend, or challenge another player online.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <details className="group border-b border-[var(--arcade-fg)]/10 pb-3">
            <summary className="font-body cursor-pointer list-none text-sm font-semibold text-[var(--arcade-fg)] [&::-webkit-details-marker]:hidden">
              How does Twisted Tac work?
            </summary>
            <p className="font-body mt-2 text-sm leading-relaxed arcade-text-muted">
              Place Xs and Os on a layered board and complete a winning line before your opponent.
            </p>
          </details>
          <details className="group border-b border-[var(--arcade-fg)]/10 pb-3">
            <summary className="font-body cursor-pointer list-none text-sm font-semibold text-[var(--arcade-fg)] [&::-webkit-details-marker]:hidden">
              Can I play on mobile?
            </summary>
            <p className="font-body mt-2 text-sm leading-relaxed arcade-text-muted">
              Yes. The browser game supports touch controls, mobile layouts, AI matches, and local
              multiplayer.
            </p>
          </details>
          <details className="group border-b border-[var(--arcade-fg)]/10 pb-3">
            <summary className="font-body cursor-pointer list-none text-sm font-semibold text-[var(--arcade-fg)] [&::-webkit-details-marker]:hidden">
              Is Twisted Tac free?
            </summary>
            <p className="font-body mt-2 text-sm leading-relaxed arcade-text-muted">
              Yes. You can start playing Twisted Tac directly in a modern web browser.
            </p>
          </details>
        </div>
      </div>
    </section>
  );
}
