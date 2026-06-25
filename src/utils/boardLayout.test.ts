import { describe, expect, it } from 'vitest';
import {
  computeBoardOuterPx,
  computeFittedCellPx,
} from './boardLayout';

describe('boardLayout', () => {
  it('computes outer board size from cell grid', () => {
    expect(computeBoardOuterPx(4, 68, 10)).toBe(322);
    expect(computeBoardOuterPx(3, 80, 12)).toBe(288);
  });

  it('fits cells inside the board without overflow', () => {
    const sizes = [1, 2, 3, 4, 5, 6, 7, 8] as const;
    const cells = [120, 80, 80, 68, 54, 44, 38, 34];
    const gaps = [0, 8, 12, 10, 8, 6, 5, 4];

    sizes.forEach((size, i) => {
      const boardPx = computeBoardOuterPx(size, cells[i], gaps[i]);
      const fitted = computeFittedCellPx(boardPx, size, gaps[i], cells[i]);
      expect(fitted).toBe(cells[i]);
    });
  });

  it('shrinks cells when board is too small', () => {
    expect(computeFittedCellPx(300, 4, 10, 68)).toBe(62);
  });
});
