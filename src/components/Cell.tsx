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

  // Glow lives on the top cap only — a shadow on every stacked layer is
  // invisible behind the stack but costs a composited surface each on mobile.
  const bodyColor = 'bg-[var(--neon-orange)]';
  const topColor = isWinning ? 'bg-[var(--player-x-light)]' : 'bg-[#ff9a4d]';

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
        className="absolute inset-0 rounded-full opacity-60"
        style={{
          transform: 'translateZ(0px) scale(0.9)',
          background:
            'radial-gradient(circle, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 55%, transparent 78%)',
        }}
      />
      <div className="relative w-full h-full" style={{ transformStyle: 'preserve-3d' }}>
        {layers.map((z, i) => (
          <div key={i} className="absolute inset-0" style={{ transform: `translateZ(${z}px)` }}>
            <div
              className={cn(
                'absolute top-1/2 left-1/2 w-[110%] -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[1px]',
                bodyColor
              )}
              style={{ height: barHeight }}
            />
            <div
              className={cn(
                'absolute top-1/2 left-1/2 w-[110%] -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-[1px]',
                bodyColor
              )}
              style={{ height: barHeight }}
            />
          </div>
        ))}
        <div className="absolute inset-0" style={{ transform: `translateZ(${thickness}px)` }}>
          <div
            className={cn(
              'absolute top-1/2 left-1/2 w-[110%] -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[1px] border border-white/20',
              topColor,
              isWinning && 'shadow-[0_0_20px_var(--neon-orange-glow)] border-white'
            )}
            style={{ height: barHeight }}
          />
          <div
            className={cn(
              'absolute top-1/2 left-1/2 w-[110%] -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-[1px] border border-white/20',
              topColor,
              isWinning && 'shadow-[0_0_20px_var(--neon-orange-glow)] border-white'
            )}
            style={{ height: barHeight }}
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

  // Glow lives on the top cap only — see PieceX.
  const bodyColor = 'border-[var(--neon-violet)]';
  const topColor = isWinning ? 'border-[var(--player-o-light)]' : 'border-[#c084fc]';

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
        className="absolute inset-0 rounded-full opacity-60"
        style={{
          transform: 'translateZ(0px) scale(0.9)',
          background:
            'radial-gradient(circle, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 55%, transparent 78%)',
        }}
      />
      <div className="relative w-full h-full" style={{ transformStyle: 'preserve-3d' }}>
        {layers.map((z, i) => (
          <div
            key={i}
            className={cn('absolute inset-0 rounded-full', bodyColor)}
            style={{ transform: `translateZ(${z}px)`, borderWidth, borderStyle: 'solid' }}
          />
        ))}
        <div
          className={cn(
            'absolute inset-0 rounded-full border-white/20',
            topColor,
            isWinning && 'shadow-[0_0_20px_var(--neon-violet-glow)] border-white'
          )}
          style={{ transform: `translateZ(${thickness}px)`, borderWidth, borderStyle: 'solid' }}
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
        'group relative flex items-center justify-center rounded-md border p-0 transition-[border-color,transform] duration-200',
        cellOpacity > 0 && !isWinningCell && 'border-border/50',
        cellOpacity <= 0 && !isWinningCell && 'border-transparent',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon-lime)]/50 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent',
        isInteractive && cellOpacity > 0 && 'cursor-pointer hover:border-[var(--game-border)] active:scale-95',
        isInteractive && cellOpacity <= 0 && 'cursor-pointer active:scale-95',
        disabled && !isWinningCell && 'cursor-default opacity-90',
        isWinningCell && value === 'X' && 'border-[var(--neon-orange)]/45 bg-[var(--neon-orange)]/12',
        isWinningCell && value === 'O' && 'border-[var(--neon-violet)]/45 bg-[var(--neon-violet)]/12'
      )}
      style={{
        width: cellSize,
        height: cellSize,
        transformStyle: 'preserve-3d',
        contain: 'layout paint',
        ...surfaceStyles,
      }}
    >
      {cellOpacity > 0 && (
        <div className="pointer-events-none absolute inset-0 rounded-md bg-gradient-to-br from-white/5 to-transparent" />
      )}
      {showLastMoveGlow && (
        <div
          className={cn(
            'pointer-events-none absolute inset-0 rounded-md last-move-cell-glow',
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
