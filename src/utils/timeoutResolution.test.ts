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

  it('prefers the side with more immediate winning moves', () => {
    const config = createGameConfig(3, '2D');
    const { board, layerWinners } = createInitialState(config);
    board[0] = 'X'; board[1] = 'X'; board[4] = 'X';
    board[3] = 'O';
    expect(chooseTimeoutWinner(config, board, layerWinners, 'X')).toBe('X');
  });

  it('uses the connected player as the final tie-break', () => {
    const config = createGameConfig(3, '2D');
    const { board, layerWinners } = createInitialState(config);
    expect(chooseTimeoutWinner(config, board, layerWinners, 'O')).toBe('O');
  });
});
