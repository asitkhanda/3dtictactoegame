import { describe, expect, it } from 'vitest';
import { createGameConfig } from './gameConfig';
import {
  applyMove,
  checkCrossLayerWinner,
  checkLayerWinner,
  checkBoardWinner,
  createInitialState,
  generateCrossLayerLines,
  generateLayerLines,
  isDraw,
} from './gameLogic';

const config3D = createGameConfig(3, '3D');
const config2D4 = createGameConfig(4, '2D');
const config3D4 = createGameConfig(4, '3D');
const config1 = createGameConfig(1, '2D');

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
});
