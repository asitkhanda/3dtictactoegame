import { describe, expect, it } from 'vitest';
import { createGameConfig, getKonamiSwipeStep } from './gameConfig';
import {
  applyMove,
  checkCrossLayerWinner,
  checkLayerWinner,
  checkBoardWinner,
  createInitialState,
  generateCrossLayerLines,
  generateLayerLines,
  hasLegalMoves,
  isDraw,
} from './gameLogic';

const config3D = createGameConfig(3, '3D');
const config2D4 = createGameConfig(4, '2D');
const config3D4 = createGameConfig(4, '3D');
const config1 = createGameConfig(1, '3D');
const config2x3D = createGameConfig(2, '3D');

describe('konami swipe mapping', () => {
  it('maps dominant swipes to arrow steps', () => {
    expect(getKonamiSwipeStep(0, -50)).toBe('ArrowUp');
    expect(getKonamiSwipeStep(0, 50)).toBe('ArrowDown');
    expect(getKonamiSwipeStep(-50, 0)).toBe('ArrowLeft');
    expect(getKonamiSwipeStep(50, 0)).toBe('ArrowRight');
  });

  it('ignores swipes below threshold', () => {
    expect(getKonamiSwipeStep(10, 10)).toBeNull();
  });
});

describe('3x3 regression', () => {
  it('generates 8 lines per layer', () => {
    const lines = generateLayerLines(config3D, 0);
    expect(lines).toHaveLength(8);
    lines.forEach((line) => expect(line).toHaveLength(3));
  });

  it('detects layer row win', () => {
    const board = createInitialState(config3D).board;
    board[0] = 'X';
    board[1] = 'X';
    board[2] = 'X';
    const result = checkLayerWinner(config3D, board, 0);
    expect(result.winner).toBe('X');
    expect(result.line).toEqual([0, 1, 2]);
  });

  it('detects cross-layer vertical win', () => {
    const board = createInitialState(config3D).board;
    board[0] = 'O';
    board[9] = 'O';
    board[18] = 'O';
    const result = checkCrossLayerWinner(config3D, board);
    expect(result.winner).toBe('O');
    expect(result.line).toEqual([0, 9, 18]);
  });

  it('match win at 2 layers via applyMove', () => {
    const board = createInitialState(config3D).board;
    const layerWinners = createInitialState(config3D).layerWinners;

    // Win layer 0 for X: row 0
    board[0] = 'X';
    board[1] = 'X';
    board[2] = 'X';
    layerWinners[0] = { winner: 'X', line: [0, 1, 2] };

    // Win layer 1 for X: row 0 (indices 9,10,11)
    board[9] = 'X';
    board[10] = 'X';
    const result = applyMove(config3D, board, layerWinners, 11, true)!;
    expect(result.winner).toBe('X');
    expect(result.layerWinners[1].winner).toBe('X');
  });
});

describe('4x4 rules', () => {
  it('generates cross-layer lines of length 4', () => {
    const lines = generateCrossLayerLines(config3D4);
    expect(lines.length).toBeGreaterThan(0);
    lines.forEach((line) => expect(line).toHaveLength(4));
  });

  it('detects 4x4 cross-layer vertical win', () => {
    const board = createInitialState(config3D4).board;
    for (let z = 0; z < 4; z++) {
      board[config3D4.index(0, 0, z)] = 'X';
    }
    const result = checkCrossLayerWinner(config3D4, board);
    expect(result.winner).toBe('X');
  });

  it('match win requires 3 of 4 layers', () => {
    expect(config3D4.matchWinThreshold).toBe(3);
  });
});

describe('2D mode', () => {
  it('detects row win on flat 4x4 board', () => {
    const board = createInitialState(config2D4).board;
    for (let x = 0; x < 4; x++) {
      board[x] = 'O';
    }
    const result = checkBoardWinner(config2D4, board);
    expect(result.winner).toBe('O');
  });

  it('applyMove resolves 2D win without layer logic', () => {
    const board = createInitialState(config2D4).board;
    const layerWinners = createInitialState(config2D4).layerWinners;
    board[0] = 'X';
    board[1] = 'X';
    board[2] = 'X';
    const result = applyMove(config2D4, board, layerWinners, 3, true)!;
    expect(result.winner).toBe('X');
    expect(result.crossLayerWinningLine).toBeNull();
  });
});

describe('1x1 easter egg', () => {
  it('instant win on first move', () => {
    const { board, layerWinners } = createInitialState(config1);
    const result = applyMove(config1, board, layerWinners, 0, true)!;
    expect(result.winner).toBe('X');
    expect(result.winningLine).toEqual([0]);
  });
});

describe('2x2 3D easter egg', () => {
  it('creates 2-layer 3D config', () => {
    expect(config2x3D.layerCount).toBe(2);
    expect(config2x3D.cellCount).toBe(8);
    expect(config2x3D.matchWinThreshold).toBe(1);
    expect(config2x3D.is3D).toBe(true);
  });
});

describe('draw detection', () => {
  it('detects full 3x3 board as draw when no winner', () => {
    const config2D = createGameConfig(3, '2D');
    const board = createInitialState(config2D).board;
    const layout = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'] as const;
    layout.forEach((mark, i) => {
      board[i] = mark;
    });
    expect(isDraw(config2D, board)).toBe(true);
    expect(checkBoardWinner(config2D, board).winner).toBeNull();
  });

  it('detects stalemate when won layers lock remaining empty cells', () => {
    const board = createInitialState(config3D).board;
    const layerWinners = createInitialState(config3D).layerWinners;

    // Layer 0: X wins bottom row; remaining empty cells are locked
    board[6] = 'X';
    board[7] = 'X';
    board[8] = 'X';
    layerWinners[0] = { winner: 'X', line: [6, 7, 8] };

    // Layer 1: one empty cell left, filling it does not create a line
    const layer1 = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', null] as const;
    layer1.forEach((mark, i) => {
      if (mark !== null) board[9 + i] = mark;
    });

    // Layer 2: O wins top row; remaining empty cells are locked
    board[18] = 'O';
    board[19] = 'O';
    board[20] = 'O';
    layerWinners[2] = { winner: 'O', line: [18, 19, 20] };

    expect(hasLegalMoves(config3D, board, layerWinners)).toBe(true);
    expect(isDraw(config3D, board)).toBe(false);

    const result = applyMove(config3D, board, layerWinners, 17, true)!;
    expect(result.draw).toBe(true);
    expect(result.winner).toBeNull();
    expect(hasLegalMoves(config3D, result.board, result.layerWinners)).toBe(false);
  });

  it('recognizes an already-stalemate board with a full middle layer', () => {
    const board = createInitialState(config3D).board;
    const layerWinners = createInitialState(config3D).layerWinners;

    board[6] = 'X';
    board[7] = 'X';
    board[8] = 'X';
    layerWinners[0] = { winner: 'X', line: [6, 7, 8] };

    const layer1 = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'] as const;
    layer1.forEach((mark, i) => {
      board[9 + i] = mark;
    });

    board[18] = 'O';
    board[19] = 'O';
    board[20] = 'O';
    layerWinners[2] = { winner: 'O', line: [18, 19, 20] };

    expect(hasLegalMoves(config3D, board, layerWinners)).toBe(false);
    expect(isDraw(config3D, board)).toBe(false);
  });
});
