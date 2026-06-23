import React from 'react';
import { cn } from '../lib/utils';
import { getCellSurfaceStyles } from '../utils/boardTranslucency';
import { motion } from 'motion/react';

interface CellProps {
  value: 'X' | 'O' | null;
  onClick: () => void;
  isWinningCell: boolean;
  disabled: boolean;
  cellSize: number;
  pieceStackCount?: number;
  cellIndex?: number;
  cellOpacity?: number;
  isLastMove?: boolean;
}

function PieceX({
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

  const bodyColor = isWinning
    ? 'bg-orange-400 shadow-[0_0_10px_#f97316]'
    : 'bg-orange-600';
  const topColor = isWinning ? 'bg-orange-100' : 'bg-orange-400';

  const layers = Array.from({ length: stackCount }, (_, i) => i * layerSpacing);

  return (
    <motion.div
      initial={{ scale: 0, z: 60, opacity: 0 }}
      animate={{ scale: 1, z: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 18, mass: 1.2 }}
      className="relative pointer-events-none"
      style={{ width: size * 0.6, height: size * 0.6, transformStyle: 'preserve-3d' }}
    >
      <div
        className="absolute inset-0 bg-black/60 blur-md rounded-full opacity-60"
        style={{ transform: 'translateZ(0px) scale(0.9)' }}
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
              isWinning && 'shadow-[0_0_20px_#f97316] border-white'
            )}
            style={{ height: barHeight }}
          />
          <div
            className={cn(
              'absolute top-1/2 left-1/2 w-[110%] -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-[1px] border border-white/20',
              topColor,
              isWinning && 'shadow-[0_0_20px_#f97316] border-white'
            )}
            style={{ height: barHeight }}
          />
        </div>
      </div>
    </motion.div>
  );
}

function PieceO({
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

  const bodyColor = isWinning
    ? 'border-purple-400 shadow-[0_0_10px_#a855f7]'
    : 'border-purple-600';
  const topColor = isWinning ? 'border-purple-100' : 'border-purple-400';

  const layers = Array.from({ length: stackCount }, (_, i) => i * layerSpacing);

  return (
    <motion.div
      initial={{ scale: 0, z: 60, opacity: 0 }}
      animate={{ scale: 1, z: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 18, mass: 1.2 }}
      className="relative pointer-events-none"
      style={{ width: size * 0.6, height: size * 0.6, transformStyle: 'preserve-3d' }}
    >
      <div
        className="absolute inset-0 bg-black/60 blur-md rounded-full opacity-60"
        style={{ transform: 'translateZ(0px) scale(0.9)' }}
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
            isWinning && 'shadow-[0_0_20px_#a855f7] border-white'
          )}
          style={{ transform: `translateZ(${thickness}px)`, borderWidth, borderStyle: 'solid' }}
        />
      </div>
    </motion.div>
  );
}

export function Cell({
  value,
  onClick,
  isWinningCell,
  disabled,
  cellSize,
  pieceStackCount = 12,
  cellIndex,
  cellOpacity = 15,
  isLastMove = false,
}: CellProps) {
  const isInteractive = !disabled && value === null;
  const showLastMoveGlow = isLastMove && !isWinningCell;
  const label =
    cellIndex !== undefined
      ? value
        ? `Cell ${cellIndex + 1}, ${value}`
        : `Empty cell ${cellIndex + 1}`
      : value
        ? `Cell, ${value}`
        : 'Empty cell';

  return (
    <button
      type="button"
      onClick={isInteractive ? onClick : undefined}
      disabled={!isInteractive}
      aria-label={label}
      className={cn(
        'group relative flex items-center justify-center rounded-md border p-0 transition-all duration-200',
        cellOpacity > 0 && !isWinningCell && 'border-border/50',
        cellOpacity <= 0 && !isWinningCell && 'border-transparent',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        isInteractive && cellOpacity > 0 && 'cursor-pointer hover:border-border active:scale-95',
        isInteractive && cellOpacity <= 0 && 'cursor-pointer active:scale-95',
        disabled && !isWinningCell && 'cursor-default opacity-90',
        isWinningCell && value === 'X' && 'border-orange-500/40 bg-orange-500/10',
        isWinningCell && value === 'O' && 'border-violet-500/40 bg-violet-500/10'
      )}
      style={{
        width: cellSize,
        height: cellSize,
        transformStyle: 'preserve-3d',
        ...getCellSurfaceStyles(cellOpacity, isWinningCell),
      }}
    >
      {cellOpacity > 0 && (
        <div className="pointer-events-none absolute inset-0 rounded-md bg-gradient-to-br from-white/5 to-transparent" />
      )}
      {showLastMoveGlow && (
        <motion.div
          className={cn(
            'pointer-events-none absolute inset-0 rounded-md',
            value === 'X' && 'ring-2 ring-orange-400/70',
            value === 'O' && 'ring-2 ring-violet-400/70',
            !value && 'ring-2 ring-primary/50'
          )}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0.92, 1, 1, 1],
            boxShadow: value === 'X'
              ? ['0 0 0px transparent', '0 0 20px var(--player-x-glow)', '0 0 20px var(--player-x-glow)', '0 0 0px transparent']
              : value === 'O'
                ? ['0 0 0px transparent', '0 0 20px var(--player-o-glow)', '0 0 20px var(--player-o-glow)', '0 0 0px transparent']
                : ['0 0 0px transparent', '0 0 12px rgba(128,128,128,0.4)', '0 0 12px rgba(128,128,128,0.4)', '0 0 0px transparent'],
          }}
          transition={{ duration: 1.5, times: [0, 0.15, 0.7, 1], ease: 'easeOut' }}
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
