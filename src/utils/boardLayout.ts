/** Inner padding applied around the cell grid inside a board layer. */
export function getBoardPadding(gapPx: number): number {
  return Math.max(8, gapPx);
}

/** Outer board dimension (border-box) that fits the configured cell grid. */
export function computeBoardOuterPx(
  size: number,
  cellPx: number,
  gapPx: number
): number {
  const padding = getBoardPadding(gapPx);
  const gapTotal = Math.max(0, size - 1) * gapPx;
  return 2 * padding + size * cellPx + gapTotal;
}

/**
 * Largest square cell size (px) that fits `size` cells with gaps inside `boardPx`,
 * respecting border-box padding on the board container.
 */
export function computeFittedCellPx(
  boardPx: number,
  size: number,
  gapPx: number,
  maxCellPx?: number
): number {
  if (size <= 0) return 0;

  const padding = getBoardPadding(gapPx);
  const inner = boardPx - 2 * padding;
  const gapTotal = Math.max(0, size - 1) * gapPx;
  const fitted = Math.floor((inner - gapTotal) / size);

  if (maxCellPx !== undefined) {
    return Math.min(maxCellPx, Math.max(0, fitted));
  }
  return Math.max(0, fitted);
}
