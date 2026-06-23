import React from 'react';
import { Cell } from './Cell';
import { LastMoveBoardGlow } from './LastMoveBoardGlow';
import { BoardState } from '../utils/gameLogic';
import { cn } from '../lib/utils';
import { getBoardLayerStyles } from '../utils/boardTranslucency';

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
  layerOpacity?: number;
  cellOpacity?: number;
  lastMoveIndex?: number | null;
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
  layerOpacity = 50,
  cellOpacity = 15,
  lastMoveIndex = null,
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
  const isLastMoveLayer =
    lastMoveIndex !== null &&
    lastMoveIndex >= startIndex &&
    lastMoveIndex < startIndex + cellsPerLayer;
  const lastMovePlayer = isLastMoveLayer ? board[lastMoveIndex] : null;

  return (
    <div
      className={cn(
        'absolute rounded-xl border transition-all duration-500',
        layerOpacity >= 25 && 'ring-1 ring-white/5'
      )}
      style={{
        width: boardPx,
        height: boardPx,
        padding: Math.max(8, gapPx),
        transform: `translate(-50%, -50%) translateZ(${zOffset}px)`,
        transformStyle: 'preserve-3d',
        ...getBoardLayerStyles(layerOpacity),
      }}
    >
      {isLastMoveLayer && <LastMoveBoardGlow player={lastMovePlayer} />}
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
            cellOpacity={cellOpacity}
            isLastMove={cell.index === lastMoveIndex}
          />
        ))}
      </div>
    </div>
  );
}
