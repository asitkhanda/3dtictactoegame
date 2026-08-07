import { describe, expect, it } from 'vitest';
import { createGameConfig, type GameConfig } from './gameConfig';
import {
  applyMove,
  createInitialState,
  getComputerMove,
  type BoardState,
  type LayerResult,
} from './gameLogic';

type Mark = 'X' | 'O';

function emptyState(config: GameConfig) {
  return createInitialState(config);
}

/** Places marks directly for tactical set-ups, bypassing turn order. */
function seed(config: GameConfig, marks: Record<number, Mark>) {
  const { board, layerWinners } = emptyState(config);
  const next = [...board];
  for (const [index, mark] of Object.entries(marks)) {
    next[Number(index)] = mark;
  }
  return { board: next as BoardState, layerWinners };
}

function legalMoves(config: GameConfig, board: BoardState, layerWinners: LayerResult[]) {
  const out: number[] = [];
  for (let i = 0; i < config.cellCount; i++) {
    if (board[i] !== null) continue;
    if (layerWinners[config.layerOf(i)]?.winner) continue;
    out.push(i);
  }
  return out;
}

type Agent = (
  config: GameConfig,
  board: BoardState,
  layerWinners: LayerResult[],
  player: Mark
) => number;

const aiAgent: Agent = (config, board, layerWinners, player) =>
  getComputerMove(config, board, layerWinners, player);

/** Casual-player proxy: takes a win, blocks a loss, otherwise plays randomly. */
const greedyAgent: Agent = (config, board, layerWinners, player) => {
  const moves = legalMoves(config, board, layerWinners);
  if (!moves.length) return -1;
  const other: Mark = player === 'X' ? 'O' : 'X';
  for (const move of moves) {
    const result = applyMove(config, board, layerWinners, move, player === 'X');
    if (result && result.winner === player) return move;
  }
  for (const move of moves) {
    const result = applyMove(config, board, layerWinners, move, other === 'X');
    if (result && result.winner === other) return move;
  }
  return moves[Math.floor(Math.random() * moves.length)];
};

/** Plays a full game with the AI as O. Throws if either side moves illegally. */
function playGame(config: GameConfig, xAgent: Agent, oAgent: Agent): Mark | 'draw' {
  const state = emptyState(config);
  let board = state.board;
  let layerWinners = state.layerWinners;
  let isXNext = true;

  for (let turn = 0; turn <= config.cellCount; turn++) {
    const agent = isXNext ? xAgent : oAgent;
    const move = agent(config, board, layerWinners, isXNext ? 'X' : 'O');
    if (move === -1) return 'draw';

    const result = applyMove(config, board, layerWinners, move, isXNext);
    expect(result, `illegal move ${move}`).not.toBeNull();
    if (!result) return 'draw';

    board = result.board;
    layerWinners = result.layerWinners;
    isXNext = result.isXNext;
    if (result.winner) return result.winner;
    if (result.draw) return 'draw';
  }
  return 'draw';
}

function tally(config: GameConfig, opponent: Agent, games: number) {
  const score = { win: 0, loss: 0, draw: 0 };
  for (let i = 0; i < games; i++) {
    const outcome = playGame(config, opponent, aiAgent);
    if (outcome === 'O') score.win++;
    else if (outcome === 'X') score.loss++;
    else score.draw++;
  }
  return score;
}

describe('computer opponent — tactics', () => {
  it('completes a winning line when one is available', () => {
    const config = createGameConfig(3, '2D');
    // O holds the top row's first two cells; 2 finishes it.
    const { board, layerWinners } = seed(config, { 0: 'O', 1: 'O', 3: 'X', 4: 'X' });
    expect(getComputerMove(config, board, layerWinners)).toBe(2);
  });

  it('blocks the opponent instead of building its own line', () => {
    const config = createGameConfig(3, '2D');
    // X threatens 0-1-2; O has only a single mark, so blocking must win out.
    const { board, layerWinners } = seed(config, { 0: 'X', 1: 'X', 4: 'O' });
    expect(getComputerMove(config, board, layerWinners)).toBe(2);
  });

  it('completes a line through the stack in 3D', () => {
    const config = createGameConfig(3, '3D');
    // Vertical column at (0,0) across layers: indices 0, 9, 18.
    const { board, layerWinners } = seed(config, { 0: 'O', 9: 'O', 4: 'X', 13: 'X' });
    expect(getComputerMove(config, board, layerWinners)).toBe(18);
  });

  it('refuses the corner trap that would let the opponent fork', () => {
    const config = createGameConfig(3, '2D');
    // X on opposite corners, O centre. Taking a corner loses to the fork;
    // only an edge holds the draw.
    const { board, layerWinners } = seed(config, { 0: 'X', 8: 'X', 4: 'O' });
    const move = getComputerMove(config, board, layerWinners);
    expect([1, 3, 5, 7]).toContain(move);
  });

  it('returns -1 when the board offers no legal move', () => {
    const config = createGameConfig(3, '2D');
    const { board, layerWinners } = seed(config, {
      0: 'X', 1: 'O', 2: 'X', 3: 'X', 4: 'O', 5: 'O', 6: 'O', 7: 'X', 8: 'X',
    });
    expect(getComputerMove(config, board, layerWinners)).toBe(-1);
  });
});

describe('computer opponent — strength', () => {
  // 3x3 is small enough to search exhaustively, so perfect play is expected:
  // a loss here means the search or its scoring has regressed.
  it('never loses the classic 3x3 board', () => {
    const config = createGameConfig(3, '2D');
    const score = tally(config, greedyAgent, 40);
    expect(score.loss).toBe(0);
  }, 60000);

  it('always draws against itself on 3x3', () => {
    const config = createGameConfig(3, '2D');
    for (let i = 0; i < 10; i++) {
      expect(playGame(config, aiAgent, aiAgent)).toBe('draw');
    }
  }, 60000);

  it('dominates a casual opponent on the 3x3x3 board', () => {
    const config = createGameConfig(3, '3D');
    const games = 40;
    const score = tally(config, greedyAgent, games);
    // Observed ~99% wins; the floor is loose enough not to flake.
    expect(score.win / games).toBeGreaterThanOrEqual(0.85);
  }, 60000);

  it('stays responsive on the largest secret board', () => {
    const config = createGameConfig(8, '3D');
    const { board, layerWinners } = emptyState(config);
    const started = performance.now();
    const move = getComputerMove(config, board, layerWinners);
    const elapsed = performance.now() - started;

    expect(move).toBeGreaterThanOrEqual(0);
    // Search is time-bounded; this guards against an unbounded regression.
    expect(elapsed).toBeLessThan(400);
  }, 30000);
});
