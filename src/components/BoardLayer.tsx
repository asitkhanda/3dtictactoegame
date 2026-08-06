import React, { memo, useMemo } from 'react';
import { Cell } from './Cell';
import { LastMoveBoardGlow } from './LastMoveBoardGlow';
import { BoardState } from '../utils/gameLogic';
import { cn } from '../lib/utils';
import { getBoardLayerStyles } from '../utils/boardTranslucency';
import { computeFittedCellPx, getBoardPadding } from '../utils/boardLayout';

export interface BoardLayerProps {
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
  /** Drops GPU-heavy effects (backdrop blur) on weak devices. */
  lowPerf?: boolean;
}

function winningLineKeyForLayer(
  line: number[] | null,
  startIndex: number,
  endIndex: number
): string {
  if (!line) return '';
  return line
    .filter((i) => i >= startIndex && i < endIndex)
    .sort((a, b) => a - b)
    .join(',');
}

function boardSliceEqual(
  boardA: BoardState,
  boardB: BoardState,
  start: number,
  count: number
): boolean {
  for (let i = 0; i < count; i++) {
    if (boardA[start + i] !== boardB[start + i]) return false;
  }
  return true;
}

function layerLastMoveChanged(
  prev: number | null | undefined,
  next: number | null | undefined,
  start: number,
  end: number
): boolean {
  const prevOnLayer = prev !== null && prev !== undefined && prev >= start && prev < end;
  const nextOnLayer = next !== null && next !== undefined && next >= start && next < end;
  if (!prevOnLayer && !nextOnLayer) return false;
  return prev !== next;
}

function BoardLayerComponent({
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
  lowPerf = false,
}: BoardLayerProps) {
  const startIndex = layerIndex * cellsPerLayer;
  const padding = getBoardPadding(gapPx);
  const fittedCellPx = computeFittedCellPx(boardPx, size, gapPx, cellPx);
  const layerStyles = getBoardLayerStyles(layerOpacity, { backdropBlur: !lowPerf });

  const zOffset = (layerIndex - (totalLayers - 1) / 2) * spacingZ;
  const isLastMoveLayer =
    lastMoveIndex !== null &&
    lastMoveIndex >= startIndex &&
    lastMoveIndex < startIndex + cellsPerLayer;
  const lastMovePlayer = isLastMoveLayer ? board[lastMoveIndex] : null;

  const gridStyle = useMemo(
    () => ({
      display: 'grid' as const,
      gridTemplateColumns: `repeat(${size}, ${fittedCellPx}px)`,
      gridTemplateRows: `repeat(${size}, ${fittedCellPx}px)`,
      gap: gapPx,
      placeContent: 'center' as const,
      transformStyle: 'preserve-3d' as const,
    }),
    [size, fittedCellPx, gapPx]
  );

  return (
    <div
      className={cn('absolute border transition-[border-color,box-shadow] duration-500')}
      style={{
        width: boardPx,
        height: boardPx,
        padding,
        boxSizing: 'border-box',
        transform: `translate(-50%, -50%) translateZ(${zOffset}px)`,
        transformStyle: 'preserve-3d',
        contain: 'layout paint',
        ...layerStyles,
      }}
    >
      {/* Holo frame: corner tick brackets instead of a ring */}
      {(['top-0 left-0 border-t-2 border-l-2', 'top-0 right-0 border-t-2 border-r-2', 'bottom-0 left-0 border-b-2 border-l-2', 'bottom-0 right-0 border-b-2 border-r-2'] as const).map(
        (pos) => (
          <span
            key={pos}
            aria-hidden
            className={cn('pointer-events-none absolute size-3', pos)}
            style={{ borderColor: 'color-mix(in oklch, var(--game-border) 85%, transparent)' }}
          />
        )
      )}

      {isLastMoveLayer && <LastMoveBoardGlow player={lastMovePlayer} />}
      {showLabel && totalLayers > 1 && (
        <div className="font-display absolute -top-6 left-1/2 flex -translate-x-1/2 items-center gap-1.5 select-none pointer-events-none">
          <span className="px-1.5 py-0.5 text-[10px] font-bold tracking-[0.25em] arcade-text-muted sm:text-xs">
            L{layerIndex + 1}
          </span>
        </div>
      )}

      <div className="h-full w-full" style={gridStyle}>
        {Array.from({ length: cellsPerLayer }, (_, i) => {
          const globalIndex = startIndex + i;
          return (
            <Cell
              key={globalIndex}
              cellIndex={globalIndex}
              value={board[globalIndex]}
              onCellClick={onCellClick}
              isWinningCell={winningLine?.includes(globalIndex) ?? false}
              disabled={disabled || board[globalIndex] !== null}
              cellSize={fittedCellPx}
              pieceStackCount={pieceStackCount}
              cellOpacity={cellOpacity}
              isLastMove={globalIndex === lastMoveIndex}
            />
          );
        })}
      </div>
    </div>
  );
}

function boardLayerPropsAreEqual(
  prev: BoardLayerProps,
  next: BoardLayerProps
): boolean {
  const start = prev.layerIndex * prev.cellsPerLayer;
  const end = start + prev.cellsPerLayer;

  return (
    prev.layerIndex === next.layerIndex &&
    prev.totalLayers === next.totalLayers &&
    prev.size === next.size &&
    prev.cellsPerLayer === next.cellsPerLayer &&
    prev.boardPx === next.boardPx &&
    prev.cellPx === next.cellPx &&
    prev.gapPx === next.gapPx &&
    prev.spacingZ === next.spacingZ &&
    prev.pieceStackCount === next.pieceStackCount &&
    prev.disabled === next.disabled &&
    prev.showLabel === next.showLabel &&
    prev.layerOpacity === next.layerOpacity &&
    prev.cellOpacity === next.cellOpacity &&
    prev.lowPerf === next.lowPerf &&
    prev.onCellClick === next.onCellClick &&
    boardSliceEqual(prev.board, next.board, start, prev.cellsPerLayer) &&
    winningLineKeyForLayer(prev.winningLine, start, end) ===
      winningLineKeyForLayer(next.winningLine, start, end) &&
    !layerLastMoveChanged(prev.lastMoveIndex, next.lastMoveIndex, start, end)
  );
}

export const BoardLayer = memo(BoardLayerComponent, boardLayerPropsAreEqual);
