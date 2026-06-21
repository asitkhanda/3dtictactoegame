import React from 'react';
import { Cell } from './Cell';
import { BoardState } from '../utils/gameLogic';
import { cn } from '../lib/utils';

interface BoardLayerProps {
  layerIndex: number;
  totalLayers: number;
  size: number;
  cellsPerLayer: number;
  boardPx: number;
  cellPx: number;
  gapPx: number;
  spacingZ: number;
  pieceStackCount: number;
  board: BoardState;
  onCellClick: (index: number) => void;
  winningLine: number[] | null;
  disabled: boolean;
  showLabel?: boolean;
}

export function BoardLayer({
  layerIndex,
  totalLayers,
  size,
  cellsPerLayer,
  boardPx,
  cellPx,
  gapPx,
  spacingZ,
  pieceStackCount,
  board,
  onCellClick,
  winningLine,
  disabled,
  showLabel = true,
}: BoardLayerProps) {
  const startIndex = layerIndex * cellsPerLayer;
  const cells = Array.from({ length: cellsPerLayer }, (_, i) => {
    const globalIndex = startIndex + i;
    return {
      index: globalIndex,
      value: board[globalIndex],
      isWinning: winningLine?.includes(globalIndex) ?? false,
    };
  });

  const zOffset = (layerIndex - (totalLayers - 1) / 2) * spacingZ;

  return (
    <div
      className={cn(
        'absolute rounded-xl border border-border/60 bg-card/70 shadow-xl backdrop-blur-sm',
        'ring-1 ring-white/5 transition-all duration-500'
      )}
      style={{
        width: boardPx,
        height: boardPx,
        padding: Math.max(8, gapPx),
        transform: `translate(-50%, -50%) translateZ(${zOffset}px)`,
        transformStyle: 'preserve-3d',
      }}
    >
      {showLabel && totalLayers > 1 && (
        <div className="text-muted-foreground absolute -top-6 left-1/2 hidden -translate-x-1/2 items-center gap-1.5 select-none pointer-events-none sm:flex">
          <span className="font-mono text-[10px] font-medium tracking-widest">
            L{layerIndex + 1}
          </span>
        </div>
      )}

      <div
        className="h-full w-full"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${size}, 1fr)`,
          gap: gapPx,
          transformStyle: 'preserve-3d',
        }}
      >
        {cells.map((cell) => (
          <Cell
            key={cell.index}
            cellIndex={cell.index}
            value={cell.value}
            onClick={() => onCellClick(cell.index)}
            isWinningCell={cell.isWinning}
            disabled={disabled || cell.value !== null}
            cellSize={cellPx}
            pieceStackCount={pieceStackCount}
          />
        ))}
      </div>
    </div>
  );
}
