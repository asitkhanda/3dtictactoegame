import { describe, expect, it } from 'vitest';
import { createGameConfig } from './gameConfig';
import { createInitialState } from '../shared/gameRules';
import { chooseTimeoutWinner } from '../shared/timeoutResolution';

describe('timeout resolution', () => {
  it('preserves an already terminal winner', () => {
    const config = createGameConfig(3, '2D');
    const { board, layerWinners } = createInitialState(config);
    board[0] = 'X'; board[1] = 'X'; board[2] = 'X';
    expect(chooseTimeoutWinner(config, board, layerWinners, 'O')).toBe('X');
  });

  it('awards the connected player even when the leaver is ahead', () => {
    const config = createGameConfig(3, '2D');
    const { board, layerWinners } = createInitialState(config);
    board[0] = 'X'; board[1] = 'X'; board[4] = 'X';
    board[3] = 'O';
    expect(chooseTimeoutWinner(config, board, layerWinners, 'O')).toBe('O');
    expect(chooseTimeoutWinner(config, board, layerWinners, 'X')).toBe('X');
  });

  it('awards the connected player on an empty board', () => {
    const config = createGameConfig(3, '2D');
    const { board, layerWinners } = createInitialState(config);
    expect(chooseTimeoutWinner(config, board, layerWinners, 'O')).toBe('O');
  });
});
