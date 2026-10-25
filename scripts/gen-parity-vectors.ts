// Generates deterministic rules-engine test vectors from the canonical
// TypeScript implementation. The Swift port (ios/TwistedTacKit) replays them,
// so any drift between the two engines fails a test instead of shipping.
//
// Run: npx vite-node scripts/gen-parity-vectors.ts
import { writeFileSync } from 'node:fs';
import {
  applyMove,
  createGameRulesConfig,
  createInitialState,
  evaluatePositionFor,
  generateCrossLayerLines,
  generateLayerLines,
  getImmediateWinningMoves,
  getTerminalWinner,
  hasLegalMoves,
  type BoardSize,
  type BoardState,
  type LayerResult,
  type ViewMode,
} from '../src/shared/gameRules';

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const encode = (board: BoardState) => board.map((c) => c ?? '.').join('');

const plan: Array<{ size: BoardSize; viewMode: ViewMode; games: number; snapshotEvery: number }> = [
  { size: 1, viewMode: '3D', games: 2, snapshotEvery: 1 },
  { size: 2, viewMode: '2D', games: 20, snapshotEvery: 1 },
  { size: 2, viewMode: '3D', games: 20, snapshotEvery: 1 },
  { size: 3, viewMode: '2D', games: 40, snapshotEvery: 1 },
  { size: 3, viewMode: '3D', games: 40, snapshotEvery: 3 },
  { size: 4, viewMode: '2D', games: 15, snapshotEvery: 4 },
  { size: 4, viewMode: '3D', games: 15, snapshotEvery: 8 },
  { size: 5, viewMode: '3D', games: 4, snapshotEvery: 25 },
  { size: 6, viewMode: '3D', games: 2, snapshotEvery: 60 },
];

const rand = mulberry32(20261025);
const configs = [];

for (const entry of plan) {
  const config = createGameRulesConfig(entry.size, entry.viewMode);
  const layerLines = Array.from({ length: config.layerCount }, (_, i) => generateLayerLines(config, i));
  const crossLines = config.is3D && config.size > 1 ? generateCrossLayerLines(config) : [];
  const games = [];

  for (let g = 0; g < entry.games; g++) {
    const state = createInitialState(config);
    let board: BoardState = state.board;
    let layerWinners: LayerResult[] = state.layerWinners;
    let isXNext = true;
    const steps = [];
    const snapshots = [];

    for (let turn = 0; turn < config.cellCount; turn++) {
      if (!hasLegalMoves(config, board, layerWinners)) break;
      const legal: number[] = [];
      for (let i = 0; i < config.cellCount; i++) {
        if (board[i] === null && !layerWinners[config.layerOf(i)]?.winner) legal.push(i);
      }
      const move = legal[Math.floor(rand() * legal.length)];

      const illegal = [-1, config.cellCount];
      const occupied = board.findIndex((c) => c !== null);
      if (occupied >= 0) illegal.push(occupied);
      for (const bad of illegal) {
        if (applyMove(config, board, layerWinners, bad, isXNext) !== null) {
          throw new Error(`expected illegal move ${bad} to be rejected`);
        }
      }

      const result = applyMove(config, board, layerWinners, move, isXNext)!;
      steps.push({
        move,
        isXNext,
        illegal,
        board: encode(result.board),
        layerWinners: result.layerWinners,
        winner: result.winner,
        draw: result.draw,
        crossLayerWinningLine: result.crossLayerWinningLine,
        winningLine: result.winningLine,
        nextIsXNext: result.isXNext,
        terminal: getTerminalWinner(config, result.board, result.layerWinners),
        hasLegalMoves: hasLegalMoves(config, result.board, result.layerWinners),
      });

      if (steps.length % entry.snapshotEvery === 0 && !result.winner && !result.draw) {
        snapshots.push({
          board: encode(result.board),
          layerWinners: result.layerWinners,
          evalX: evaluatePositionFor(config, result.board, result.layerWinners, 'X'),
          evalO: evaluatePositionFor(config, result.board, result.layerWinners, 'O'),
          threatsX: getImmediateWinningMoves(config, result.board, result.layerWinners, 'X'),
          threatsO: getImmediateWinningMoves(config, result.board, result.layerWinners, 'O'),
        });
      }

      board = result.board;
      layerWinners = result.layerWinners;
      isXNext = result.isXNext;
      if (result.winner || result.draw) break;
    }
    games.push({ steps, snapshots });
  }

  configs.push({
    size: entry.size,
    viewMode: entry.viewMode,
    winLength: config.winLength,
    layerCount: config.layerCount,
    matchWinThreshold: config.matchWinThreshold,
    cellCount: config.cellCount,
    cellsPerLayer: config.cellsPerLayer,
    layerLines,
    crossLines,
    games,
  });
}

const out = 'ios/TwistedTacKit/Tests/TwistedTacKitTests/Resources/parity-vectors.json';
writeFileSync(out, JSON.stringify({ configs }));
const total = configs.reduce((n, c) => n + c.games.reduce((m, g) => m + g.steps.length, 0), 0);
console.log(`wrote ${out}: ${configs.length} configs, ${total} steps`);
