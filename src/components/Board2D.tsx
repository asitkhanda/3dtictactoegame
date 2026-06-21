import React from 'react';
import { Cell } from './Cell';
import { BoardState } from '../utils/gameLogic';
import { cn } from '../lib/utils';
import { GameConfig } from '../utils/gameConfig';

interface Board2DProps {
  config: GameConfig;
  board: BoardState;
  onCellClick: (index: number) => void;
  winningLine: number[] | null;
  disabled: boolean;
}

export function Board2D({ config, board, onCellClick, winningLine, disabled }: Board2DProps) {
  const { size, cellsPerLayer, visual } = config;
  const { boardPx, cellPx, gapPx, pieceStackCount } = visual;

  const cells = Array.from({ length: cellsPerLayer }, (_, i) => ({
    index: i,
    value: board[i],
    isWinning: winningLine?.includes(i) ?? false,
  }));

  return (
    <div className="flex h-full w-full items-center justify-center px-4">
      <div
        className={cn(
          'rounded-xl border border-border/60 bg-card/70 shadow-xl backdrop-blur-sm',
          'ring-1 ring-white/5'
        )}
        style={{
          width: boardPx,
          height: boardPx,
          padding: Math.max(8, gapPx),
        }}
      >
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
            />
          ))}
        </div>
      </div>
    </div>
  );
}
