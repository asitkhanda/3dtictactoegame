import React from 'react';
import { Cell } from './Cell';
import { LastMoveBoardGlow } from './LastMoveBoardGlow';
import { BoardState } from '../utils/gameLogic';
import { cn } from '../lib/utils';
import { GameConfig } from '../utils/gameConfig';
import { getBoardLayerStyles } from '../utils/boardTranslucency';

interface Board2DProps {
  config: GameConfig;
  board: BoardState;
  onCellClick: (index: number) => void;
  winningLine: number[] | null;
  disabled: boolean;
  layerOpacity?: number;
  cellOpacity?: number;
  lastMoveIndex?: number | null;
}

export function Board2D({
  config,
  board,
  onCellClick,
  winningLine,
  disabled,
  layerOpacity = 50,
  cellOpacity = 15,
  lastMoveIndex = null,
}: Board2DProps) {
  const { size, cellsPerLayer, visual } = config;
  const { boardPx, cellPx, gapPx, pieceStackCount } = visual;

  const cells = Array.from({ length: cellsPerLayer }, (_, i) => ({
    index: i,
    value: board[i],
    isWinning: winningLine?.includes(i) ?? false,
  }));

  const lastMovePlayer =
    lastMoveIndex !== null && lastMoveIndex < cellsPerLayer ? board[lastMoveIndex] : null;
  const showLayerGlow = lastMoveIndex !== null && lastMoveIndex < cellsPerLayer;

  return (
    <div className="flex h-full w-full items-center justify-center px-4">
      <div
        className={cn(
          'relative rounded-xl border',
          layerOpacity >= 25 && 'ring-1 ring-white/5'
        )}
        style={{
          width: boardPx,
          height: boardPx,
          padding: Math.max(8, gapPx),
          ...getBoardLayerStyles(layerOpacity),
        }}
      >
        {showLayerGlow && <LastMoveBoardGlow player={lastMovePlayer} />}
        <div
          className="h-full w-full"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${size}, 1fr)`,
            gap: gapPx,
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
    </div>
  );
}
