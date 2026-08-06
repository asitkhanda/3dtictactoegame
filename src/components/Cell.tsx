import React, { memo, useMemo } from 'react';
import { cn } from '../lib/utils';
import { getCellSurfaceStyles } from '../utils/boardTranslucency';
import { motion } from 'motion/react';

export interface CellProps {
  cellIndex: number;
  value: 'X' | 'O' | null;
  onCellClick: (index: number) => void;
  isWinningCell: boolean;
  disabled: boolean;
  cellSize: number;
  pieceStackCount?: number;
  cellOpacity?: number;
  isLastMove?: boolean;
}

const PieceX = memo(function PieceX({
  isWinning,
  size,
  stackCount,
}: {
  isWinning: boolean;
  size: number;
  stackCount: number;
}) {
  const thickness = Math.max(8, Math.round(size * 0.25));
  const layerSpacing = thickness / stackCount;
  const barHeight = Math.max(2, Math.round(size * 0.08));

  // Top-lit metal bevel: light top edge → base → dark bottom edge.
  const bodyGradient =
    'linear-gradient(180deg, color-mix(in oklch, var(--neon-orange), white 22%) 0%, var(--neon-orange) 45%, color-mix(in oklch, var(--neon-orange), black 32%) 100%)';
  const capBase = isWinning ? 'var(--player-x-light)' : 'var(--neon-orange)';
  const capGradient = `linear-gradient(180deg, color-mix(in oklch, ${capBase}, white 45%) 0%, color-mix(in oklch, ${capBase}, white 12%) 50%, color-mix(in oklch, ${capBase}, black 18%) 100%)`;

  const layers = useMemo(
    () => Array.from({ length: stackCount }, (_, i) => i * layerSpacing),
    [stackCount, layerSpacing]
  );

  return (
    <motion.div
      initial={{ scale: 0, z: 60, opacity: 0 }}
      animate={{ scale: 1, z: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 18, mass: 1.2 }}
      className="relative pointer-events-none"
      style={{ width: size * 0.6, height: size * 0.6, transformStyle: 'preserve-3d' }}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          transform: 'translateZ(0px) scale(0.8)',
          background:
            'radial-gradient(circle, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.12) 50%, transparent 68%)',
        }}
      />
      <div className="relative w-full h-full" style={{ transformStyle: 'preserve-3d' }}>
        {layers.map((z, i) => (
          <div key={i} className="absolute inset-0" style={{ transform: `translateZ(${z}px)` }}>
            <div
              className="absolute top-1/2 left-1/2 w-[110%] -translate-x-1/2 -translate-y-1/2 rotate-45"
              style={{ height: barHeight, background: bodyGradient }}
            />
            <div
              className="absolute top-1/2 left-1/2 w-[110%] -translate-x-1/2 -translate-y-1/2 -rotate-45"
              style={{ height: barHeight, background: bodyGradient }}
            />
          </div>
        ))}
        <div className="absolute inset-0" style={{ transform: `translateZ(${thickness}px)` }}>
          <div
            className={cn(
              'absolute top-1/2 left-1/2 w-[110%] -translate-x-1/2 -translate-y-1/2 rotate-45 shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_0_8px_var(--player-x-glow)]',
              isWinning && 'shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_0_20px_var(--neon-orange-glow)]'
            )}
            style={{ height: barHeight, background: capGradient }}
          />
          <div
            className={cn(
              'absolute top-1/2 left-1/2 w-[110%] -translate-x-1/2 -translate-y-1/2 -rotate-45 shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_0_8px_var(--player-x-glow)]',
              isWinning && 'shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_0_20px_var(--neon-orange-glow)]'
            )}
            style={{ height: barHeight, background: capGradient }}
          />
        </div>
      </div>
    </motion.div>
  );
});

const PieceO = memo(function PieceO({
  isWinning,
  size,
  stackCount,
}: {
  isWinning: boolean;
  size: number;
  stackCount: number;
}) {
  const thickness = Math.max(8, Math.round(size * 0.25));
  const layerSpacing = thickness / stackCount;
  const borderWidth = Math.max(3, Math.round(size * 0.12));

  // Per-side border colors give the ring a top-lit bevel without extra layers.
  const bodyBevel = {
    borderColor: 'var(--neon-violet)',
    borderTopColor: 'color-mix(in oklch, var(--neon-violet), white 22%)',
    borderBottomColor: 'color-mix(in oklch, var(--neon-violet), black 32%)',
  };
  const capBase = isWinning ? 'var(--player-o-light)' : 'var(--neon-violet)';
  const capBevel = {
    borderColor: `color-mix(in oklch, ${capBase}, white 12%)`,
    borderTopColor: `color-mix(in oklch, ${capBase}, white 48%)`,
    borderBottomColor: `color-mix(in oklch, ${capBase}, black 20%)`,
  };

  const layers = useMemo(
    () => Array.from({ length: stackCount }, (_, i) => i * layerSpacing),
    [stackCount, layerSpacing]
  );

  return (
    <motion.div
      initial={{ scale: 0, z: 60, opacity: 0 }}
      animate={{ scale: 1, z: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 18, mass: 1.2 }}
      className="relative pointer-events-none"
      style={{ width: size * 0.6, height: size * 0.6, transformStyle: 'preserve-3d' }}
    >
      {/* Ring-shaped shadow: transparent center so nothing shows through the O's hole */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          transform: 'translateZ(0px) scale(0.92)',
          background:
            'radial-gradient(circle, transparent 0%, transparent 32%, rgba(0,0,0,0.26) 48%, rgba(0,0,0,0.1) 62%, transparent 74%)',
        }}
      />
      <div className="relative w-full h-full" style={{ transformStyle: 'preserve-3d' }}>
        {layers.map((z, i) => (
          <div
            key={i}
            className="absolute inset-0 rounded-full"
            style={{
              transform: `translateZ(${z}px)`,
              borderWidth,
              borderStyle: 'solid',
              ...bodyBevel,
            }}
          />
        ))}
        <div
          className={cn(
            'absolute inset-0 rounded-full shadow-[0_0_8px_var(--player-o-glow)]',
            isWinning && 'shadow-[0_0_20px_var(--neon-violet-glow)]'
          )}
          style={{
            transform: `translateZ(${thickness}px)`,
            borderWidth,
            borderStyle: 'solid',
            ...capBevel,
          }}
        />
      </div>
    </motion.div>
  );
});

const surfaceStylesCache = new WeakMap<object, ReturnType<typeof getCellSurfaceStyles>>();

function CellComponent({
  cellIndex,
  value,
  onCellClick,
  isWinningCell,
  disabled,
  cellSize,
  pieceStackCount = 12,
  cellOpacity = 15,
  isLastMove = false,
}: CellProps) {
  const isInteractive = !disabled && value === null;
  const showLastMoveGlow = isLastMove && !isWinningCell;
  const label = value
    ? `Cell ${cellIndex + 1}, ${value}`
    : `Empty cell ${cellIndex + 1}`;

  const surfaceStyles = getCellSurfaceStyles(cellOpacity, isWinningCell);

  return (
    <button
      type="button"
      onClick={isInteractive ? () => onCellClick(cellIndex) : undefined}
      disabled={!isInteractive}
      aria-label={label}
      className={cn(
        'group relative flex items-center justify-center border p-0 transition-[border-color,transform] duration-200',
        cellOpacity > 0 && !isWinningCell && 'border-border/50',
        cellOpacity <= 0 && !isWinningCell && 'border-transparent',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon-orange)]/60 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent',
        isInteractive && cellOpacity > 0 && 'cursor-pointer hover:border-[var(--neon-violet)]/70 active:scale-95',
        isInteractive && cellOpacity <= 0 && 'cursor-pointer active:scale-95',
        disabled && !isWinningCell && 'cursor-default opacity-90',
        isWinningCell && value === 'X' && 'border-[var(--neon-orange)]/60 bg-[var(--neon-orange)]/12',
        isWinningCell && value === 'O' && 'border-[var(--neon-violet)]/60 bg-[var(--neon-violet)]/12'
      )}
      style={{
        width: cellSize,
        height: cellSize,
        transformStyle: 'preserve-3d',
        contain: 'layout paint',
        ...surfaceStyles,
      }}
    >
      {showLastMoveGlow && (
        <div
          className={cn(
            'pointer-events-none absolute inset-0 last-move-cell-glow',
            value === 'X' && 'last-move-cell-glow-x',
            value === 'O' && 'last-move-cell-glow-o',
            !value && 'last-move-cell-glow-neutral'
          )}
        />
      )}
      {value === 'X' && (
        <PieceX isWinning={isWinningCell} size={cellSize} stackCount={pieceStackCount} />
      )}
      {value === 'O' && (
        <PieceO isWinning={isWinningCell} size={cellSize} stackCount={pieceStackCount} />
      )}
    </button>
  );
}

function cellPropsAreEqual(prev: CellProps, next: CellProps): boolean {
  return (
    prev.cellIndex === next.cellIndex &&
    prev.value === next.value &&
    prev.isWinningCell === next.isWinningCell &&
    prev.disabled === next.disabled &&
    prev.cellSize === next.cellSize &&
    prev.pieceStackCount === next.pieceStackCount &&
    prev.cellOpacity === next.cellOpacity &&
    prev.isLastMove === next.isLastMove &&
    prev.onCellClick === next.onCellClick
  );
}

export const Cell = memo(CellComponent, cellPropsAreEqual);
