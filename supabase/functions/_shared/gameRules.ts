// Canonical game rules, shared by the web client (src/utils/gameLogic.ts,
// src/utils/gameConfig.ts) and the submit-move edge function. This file must
// stay self-contained (no imports) so it loads under both Vite and Deno.

export type BoardSize = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type ViewMode = '2D' | '3D';
export type Player = 'X' | 'O' | null;
export type BoardState = Player[];

export type LayerResult = { winner: Player; line: number[] | null };

export interface GameRulesConfig {
  size: BoardSize;
  viewMode: ViewMode;
  winLength: number;
  layerCount: number;
  matchWinThreshold: number;
  cellCount: number;
  cellsPerLayer: number;
  is3D: boolean;
  index: (x: number, y: number, z: number) => number;
  layerOf: (index: number) => number;
}

export function createGameRulesConfig(size: BoardSize, viewMode: ViewMode): GameRulesConfig {
  const is3D = viewMode === '3D';
  const layerCount = is3D ? size : 1;
  const cellsPerLayer = size * size;
  const cellCount = is3D ? size * size * size : cellsPerLayer;

  const index = (x: number, y: number, z: number) => x + y * size + z * cellsPerLayer;
  const layerOf = (cellIndex: number) => Math.floor(cellIndex / cellsPerLayer);

  return {
    size,
    viewMode,
    winLength: size,
    layerCount,
    matchWinThreshold: is3D && size > 1 ? size - 1 : 0,
    cellCount,
    cellsPerLayer,
    is3D,
    index,
    layerOf,
  };
}

export interface GameState {
  board: BoardState;
  layerWinners: LayerResult[];
}

export function createInitialState(config: GameRulesConfig): GameState {
  return {
    board: Array(config.cellCount).fill(null),
    layerWinners: Array.from({ length: config.layerCount }, () => ({
      winner: null,
      line: null,
    })),
  };
}

// Line tables depend only on board size/mode, so they are built once and
// shared. The AI simulates thousands of moves per turn and each simulation
// scans these — regenerating them every time would dominate its cost.
// Callers must treat the returned arrays as read-only.
const layerLineCache = new Map<string, number[][]>();
const crossLayerLineCache = new Map<string, number[][]>();

function configKey(config: GameRulesConfig): string {
  return `${config.size}:${config.viewMode}`;
}

export function generateLayerLines(config: GameRulesConfig, layerIndex: number): number[][] {
  const cacheKey = `${configKey(config)}:${layerIndex}`;
  const cached = layerLineCache.get(cacheKey);
  if (cached) return cached;

  const { size, cellsPerLayer } = config;
  const lines: number[][] = [];
  const offset = layerIndex * cellsPerLayer;

  for (let y = 0; y < size; y++) {
    const row: number[] = [];
    for (let x = 0; x < size; x++) {
      row.push(offset + y * size + x);
    }
    lines.push(row);
  }

  for (let x = 0; x < size; x++) {
    const col: number[] = [];
    for (let y = 0; y < size; y++) {
      col.push(offset + y * size + x);
    }
    lines.push(col);
  }

  const mainDiag: number[] = [];
  const antiDiag: number[] = [];
  for (let i = 0; i < size; i++) {
    mainDiag.push(offset + i * size + i);
    antiDiag.push(offset + i * size + (size - 1 - i));
  }
  lines.push(mainDiag, antiDiag);

  layerLineCache.set(cacheKey, lines);
  return lines;
}

export function generateCrossLayerLines(config: GameRulesConfig): number[][] {
  const cacheKey = configKey(config);
  const cached = crossLayerLineCache.get(cacheKey);
  if (cached) return cached;

  const { size } = config;
  const lines: number[][] = [];

  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      const vertical: number[] = [];
      for (let z = 0; z < size; z++) {
        vertical.push(config.index(x, y, z));
      }
      lines.push(vertical);
    }
  }

  for (let y = 0; y < size; y++) {
    const forward: number[] = [];
    const back: number[] = [];
    for (let z = 0; z < size; z++) {
      forward.push(config.index(z, y, z));
      back.push(config.index(size - 1 - z, y, z));
    }
    lines.push(forward, back);
  }

  for (let x = 0; x < size; x++) {
    const forward: number[] = [];
    const back: number[] = [];
    for (let z = 0; z < size; z++) {
      forward.push(config.index(x, z, z));
      back.push(config.index(x, size - 1 - z, z));
    }
    lines.push(forward, back);
  }

  const spaceDiagonals = [
    (z: number) => config.index(z, z, z),
    (z: number) => config.index(size - 1 - z, z, z),
    (z: number) => config.index(z, size - 1 - z, z),
    (z: number) => config.index(size - 1 - z, size - 1 - z, z),
  ];

  for (const fn of spaceDiagonals) {
    const diag: number[] = [];
    for (let z = 0; z < size; z++) {
      diag.push(fn(z));
    }
    lines.push(diag);
  }

  crossLayerLineCache.set(cacheKey, lines);
  return lines;
}

function checkLinesWinner(
  board: BoardState,
  lines: number[][],
  winLength: number
): { winner: Player; line: number[] | null } {
  for (const line of lines) {
    if (line.length < winLength) continue;
    const first = board[line[0]];
    if (!first) continue;
    if (line.every((idx) => board[idx] === first)) {
      return { winner: first, line };
    }
  }
  return { winner: null, line: null };
}

export function checkCrossLayerWinner(
  config: GameRulesConfig,
  board: BoardState
): { winner: Player; line: number[] | null } {
  if (!config.is3D || config.size <= 1) {
    return { winner: null, line: null };
  }
  return checkLinesWinner(board, generateCrossLayerLines(config), config.winLength);
}

export function checkLayerWinner(
  config: GameRulesConfig,
  board: BoardState,
  layerIndex: number
): { winner: Player; line: number[] | null } {
  return checkLinesWinner(
    board,
    generateLayerLines(config, layerIndex),
    config.winLength
  );
}

export function checkBoardWinner(
  config: GameRulesConfig,
  board: BoardState
): { winner: Player; line: number[] | null } {
  return checkLayerWinner(config, board, 0);
}

export function isLayerFull(
  config: GameRulesConfig,
  board: BoardState,
  layerIndex: number
): boolean {
  const offset = layerIndex * config.cellsPerLayer;
  for (let i = 0; i < config.cellsPerLayer; i++) {
    if (board[offset + i] === null) return false;
  }
  return true;
}

export function isDraw(config: GameRulesConfig, board: BoardState): boolean {
  return board.every((cell) => cell !== null);
}

export function hasLegalMoves(
  config: GameRulesConfig,
  board: BoardState,
  layerWinners: LayerResult[]
): boolean {
  for (let i = 0; i < config.cellCount; i++) {
    if (board[i] !== null) continue;
    const layerIndex = config.layerOf(i);
    if (layerWinners[layerIndex]?.winner) continue;
    return true;
  }
  return false;
}

export interface MoveResult {
  board: BoardState;
  layerWinners: LayerResult[];
  winner: Player;
  draw: boolean;
  crossLayerWinningLine: number[] | null;
  winningLine: number[] | null;
  isXNext: boolean;
}

export function applyMove(
  config: GameRulesConfig,
  board: BoardState,
  layerWinners: LayerResult[],
  index: number,
  isXNext: boolean
): MoveResult | null {
  const player: Player = isXNext ? 'X' : 'O';
  const layerIndex = config.layerOf(index);

  if (board[index] || layerWinners[layerIndex]?.winner) {
    return null;
  }

  const newBoard = [...board];
  newBoard[index] = player;
  const newLayerWinners = [...layerWinners];

  if (config.size === 1) {
    return {
      board: newBoard,
      layerWinners: newLayerWinners,
      winner: player,
      draw: false,
      crossLayerWinningLine: null,
      winningLine: [0],
      isXNext: !isXNext,
    };
  }

  if (config.is3D) {
    const crossLayerResult = checkCrossLayerWinner(config, newBoard);
    if (crossLayerResult.winner) {
      return {
        board: newBoard,
        layerWinners: newLayerWinners,
        winner: crossLayerResult.winner,
        draw: false,
        crossLayerWinningLine: crossLayerResult.line,
        winningLine: crossLayerResult.line,
        isXNext: !isXNext,
      };
    }

    const layerResult = checkLayerWinner(config, newBoard, layerIndex);
    if (layerResult.winner) {
      newLayerWinners[layerIndex] = layerResult;
    }

    const xWins = newLayerWinners.filter((l) => l.winner === 'X').length;
    const oWins = newLayerWinners.filter((l) => l.winner === 'O').length;

    if (xWins >= config.matchWinThreshold) {
      return {
        board: newBoard,
        layerWinners: newLayerWinners,
        winner: 'X',
        draw: false,
        crossLayerWinningLine: null,
        winningLine: layerResult.line,
        isXNext: !isXNext,
      };
    }
    if (oWins >= config.matchWinThreshold) {
      return {
        board: newBoard,
        layerWinners: newLayerWinners,
        winner: 'O',
        draw: false,
        crossLayerWinningLine: null,
        winningLine: layerResult.line,
        isXNext: !isXNext,
      };
    }
  } else {
    const boardResult = checkBoardWinner(config, newBoard);
    if (boardResult.winner) {
      return {
        board: newBoard,
        layerWinners: newLayerWinners,
        winner: boardResult.winner,
        draw: false,
        crossLayerWinningLine: null,
        winningLine: boardResult.line,
        isXNext: !isXNext,
      };
    }
  }

  // A full board has no legal moves, so this also covers the classic draw.
  if (!hasLegalMoves(config, newBoard, newLayerWinners)) {
    return {
      board: newBoard,
      layerWinners: newLayerWinners,
      winner: null,
      draw: true,
      crossLayerWinningLine: null,
      winningLine: null,
      isXNext: !isXNext,
    };
  }

  return {
    board: newBoard,
    layerWinners: newLayerWinners,
    winner: null,
    draw: false,
    crossLayerWinningLine: null,
    winningLine: null,
    isXNext: !isXNext,
  };
}


// ── Computer opponent ──────────────────────────────────────────────────────
// A real search engine rather than a bag of rules: negamax with alpha-beta
// pruning and iterative deepening, driven by a node budget so it stays fast
// on phones. Every position it considers is produced by applyMove itself, so
// the engine can never disagree with the rules it plays under — layer
// locking, match thresholds and 3D lines all come along for free.
//
// Search subsumes the tactics people expect from a strong opponent: forks
// (double threats) simply fall out as forced wins a few plies deep, as does
// refusing to walk into the opponent's. Positions that are still open at the
// search horizon are judged by how many lines remain winnable through them.
//
// Among moves that search rates equally the engine picks at random, so it
// plays optimally without playing the identical game every time.

/**
 * The search is bounded by wall-clock time rather than raw node count so it
 * blocks the main thread for the same short slice on every device: a fast
 * laptop simply searches deeper than a budget phone within the same window.
 * Comfortably inside the AI's thinking delay, so play still feels instant.
 */
const SEARCH_TIME_BUDGET_MS = 40;
/**
 * The clock is read every N nodes rather than every node. Kept small so that
 * boards with expensive nodes (the large secret cubes) cannot overshoot the
 * budget by much before the next check lands.
 */
const TIME_CHECK_MASK = 255;

/** Hard ceiling so a pathological position can never spin unboundedly. */
function nodeBudgetFor(config: GameRulesConfig): number {
  const cost = config.cellCount * config.winLength;
  return Math.max(20000, Math.min(600000, Math.round(40_000_000 / cost)));
}

function nowMs(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}
/** Never search deeper than this many plies. */
const MAX_SEARCH_DEPTH = 12;
/** Score for a forced win, reduced by ply so quicker wins are preferred. */
const WIN_SCORE = 1_000_000;
/** Cross-layer lines end the match outright, so they outrank layer lines. */
const CROSS_LINE_WEIGHT = 1.35;
const LAYER_CLAIM_BONUS = 900;

interface BoardLine {
  cells: number[];
  cross: boolean;
}

interface LineIndex {
  all: BoardLine[];
  /** Cell index → indices into `all` of every line through that cell. */
  byCell: number[][];
  /** Cell index → how many lines pass through it; used for move ordering. */
  weightByCell: number[];
}

const lineIndexCache = new Map<string, LineIndex>();

function getLineIndex(config: GameRulesConfig): LineIndex {
  const cacheKey = configKey(config);
  const cached = lineIndexCache.get(cacheKey);
  if (cached) return cached;

  const all: BoardLine[] = [];
  if (config.is3D && config.size > 1) {
    for (const cells of generateCrossLayerLines(config)) {
      all.push({ cells, cross: true });
    }
  }
  for (let layer = 0; layer < config.layerCount; layer++) {
    for (const cells of generateLayerLines(config, layer)) {
      all.push({ cells, cross: false });
    }
  }

  const byCell: number[][] = Array.from({ length: config.cellCount }, () => []);
  all.forEach((line, lineId) => {
    for (const cell of line.cells) byCell[cell].push(lineId);
  });

  const index: LineIndex = {
    all,
    byCell,
    weightByCell: byCell.map((lines) => lines.length),
  };
  lineIndexCache.set(cacheKey, index);
  return index;
}

function legalMoves(
  config: GameRulesConfig,
  board: BoardState,
  layerWinners: LayerResult[]
): number[] {
  const moves: number[] = [];
  for (let i = 0; i < config.cellCount; i++) {
    if (board[i] !== null) continue;
    if (layerWinners[config.layerOf(i)]?.winner) continue;
    moves.push(i);
  }
  return moves;
}

/** Every move that ends the match in `player`'s favour immediately. */
function findWinningMoves(
  config: GameRulesConfig,
  board: BoardState,
  layerWinners: LayerResult[],
  player: 'X' | 'O',
  moves: number[]
): number[] {
  const wins: number[] = [];
  for (const index of moves) {
    const result = applyMove(config, board, layerWinners, index, player === 'X');
    if (result && result.winner === player) wins.push(index);
  }
  return wins;
}

/** Value of holding `count` cells of a `winLength` line — steeply superlinear. */
function lineValue(count: number, winLength: number): number {
  const remaining = winLength - count;
  if (remaining <= 0) return 100000;
  return 1500 / Math.pow(3, remaining);
}

/**
 * Static judgement of an unfinished position from `player`'s point of view:
 * lines still winnable for them count up, lines still winnable for the
 * opponent count down, and claimed layers count heavily either way.
 *
 * A line is only winnable if it holds no opposing mark and no empty cell
 * stranded in a won layer — those cells can never be filled again.
 */
function evaluatePosition(
  config: GameRulesConfig,
  board: BoardState,
  layerWinners: LayerResult[],
  player: 'X' | 'O',
  lineIndex: LineIndex
): number {
  const opponent: 'X' | 'O' = player === 'X' ? 'O' : 'X';
  const winLength = config.winLength;
  let score = 0;

  for (const line of lineIndex.all) {
    if (line.cells.length < winLength) continue;

    let mine = 0;
    let theirs = 0;
    let dead = false;

    for (const cell of line.cells) {
      const value = board[cell];
      if (value === player) mine++;
      else if (value === opponent) theirs++;
      else if (layerWinners[config.layerOf(cell)]?.winner) {
        dead = true;
        break;
      }
    }

    // Skip dead lines and already-completed ones (scored via layer bonuses).
    if (dead || mine >= winLength || theirs >= winLength) continue;

    const weight = line.cross ? CROSS_LINE_WEIGHT : 1;
    if (theirs === 0 && mine > 0) score += lineValue(mine, winLength) * weight;
    else if (mine === 0 && theirs > 0) score -= lineValue(theirs, winLength) * weight;
  }

  let myLayers = 0;
  let theirLayers = 0;
  for (const layer of layerWinners) {
    if (layer.winner === player) myLayers++;
    else if (layer.winner === opponent) theirLayers++;
  }
  score += (myLayers - theirLayers) * LAYER_CLAIM_BONUS;

  return score;
}

/** Cheap static ordering — busier cells first — so alpha-beta prunes early. */
function orderMoves(moves: number[], lineIndex: LineIndex): number[] {
  return [...moves].sort(
    (a, b) => lineIndex.weightByCell[b] - lineIndex.weightByCell[a]
  );
}

interface SearchState {
  nodes: number;
  budget: number;
  deadline: number;
  aborted: boolean;
}

/** True once this search has spent its node or time allowance. */
function outOfBudget(state: SearchState): boolean {
  if (state.nodes > state.budget) return true;
  if ((state.nodes & TIME_CHECK_MASK) === 0 && nowMs() > state.deadline) return true;
  return false;
}

/**
 * Negamax with alpha-beta pruning. Returns the value of the position for the
 * player about to move. Bails out once the node budget is spent; callers must
 * discard results from an aborted search.
 */
function negamax(
  config: GameRulesConfig,
  board: BoardState,
  layerWinners: LayerResult[],
  player: 'X' | 'O',
  depth: number,
  ply: number,
  alpha: number,
  beta: number,
  lineIndex: LineIndex,
  state: SearchState
): number {
  const opponent: 'X' | 'O' = player === 'X' ? 'O' : 'X';
  const moves = legalMoves(config, board, layerWinners);
  if (moves.length === 0) return 0;

  if (depth <= 0) {
    return evaluatePosition(config, board, layerWinners, player, lineIndex);
  }

  let best = -Infinity;

  for (const move of orderMoves(moves, lineIndex)) {
    state.nodes++;
    if (outOfBudget(state)) {
      state.aborted = true;
      return best === -Infinity ? 0 : best;
    }

    const result = applyMove(config, board, layerWinners, move, player === 'X');
    if (!result) continue;

    let score: number;
    if (result.winner === player) {
      score = WIN_SCORE - ply;
    } else if (result.draw) {
      score = 0;
    } else {
      score = -negamax(
        config,
        result.board,
        result.layerWinners,
        opponent,
        depth - 1,
        ply + 1,
        -beta,
        -alpha,
        lineIndex,
        state
      );
      if (state.aborted) return best === -Infinity ? score : best;
    }

    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }

  return best;
}

interface RootResult {
  moves: number[];
  score: number;
}

/** Scores every root move at a fixed depth, returning all joint-best moves. */
function searchRoot(
  config: GameRulesConfig,
  board: BoardState,
  layerWinners: LayerResult[],
  player: 'X' | 'O',
  candidates: number[],
  depth: number,
  lineIndex: LineIndex,
  state: SearchState
): RootResult | null {
  const opponent: 'X' | 'O' = player === 'X' ? 'O' : 'X';
  let best = -Infinity;
  let bestMoves: number[] = [];

  for (const move of candidates) {
    state.nodes++;
    if (outOfBudget(state)) {
      state.aborted = true;
      return null;
    }

    const result = applyMove(config, board, layerWinners, move, player === 'X');
    if (!result) continue;

    let score: number;
    if (result.winner === player) {
      score = WIN_SCORE;
    } else if (result.draw) {
      score = 0;
    } else {
      score = -negamax(
        config,
        result.board,
        result.layerWinners,
        opponent,
        depth - 1,
        1,
        -Infinity,
        Infinity,
        lineIndex,
        state
      );
      if (state.aborted) return null;
    }

    if (score > best) {
      best = score;
      bestMoves = [move];
    } else if (score === best) {
      bestMoves.push(move);
    }
  }

  return bestMoves.length > 0 ? { moves: bestMoves, score: best } : null;
}

/**
 * Chooses the computer's move. `player` defaults to 'O', the side the local
 * AI always plays; it is parameterised so the engine can be played against
 * itself in tests.
 *
 * Returns -1 when no legal move exists.
 */
export function getComputerMove(
  config: GameRulesConfig,
  board: BoardState,
  layerWinners: LayerResult[],
  player: 'X' | 'O' = 'O'
): number {
  const opponent: 'X' | 'O' = player === 'X' ? 'O' : 'X';

  const moves = legalMoves(config, board, layerWinners);
  if (moves.length === 0) return -1;
  if (config.size === 1) return moves[0];

  const lineIndex = getLineIndex(config);
  const pick = (options: number[]) =>
    options[Math.floor(Math.random() * options.length)];

  // Fast paths — search would find these too, but they are free and exact.
  const myWins = findWinningMoves(config, board, layerWinners, player, moves);
  if (myWins.length > 0) return pick(myWins);

  const theirWins = findWinningMoves(config, board, layerWinners, opponent, moves);
  if (theirWins.length === 1) return theirWins[0];

  // Iterative deepening: keep the deepest completed result. Anything the
  // budget cuts short is discarded, so the move always comes from a search
  // that finished.
  const ordered = orderMoves(moves, lineIndex);
  const state: SearchState = {
    nodes: 0,
    budget: nodeBudgetFor(config),
    deadline: nowMs() + SEARCH_TIME_BUDGET_MS,
    aborted: false,
  };
  const maxDepth = Math.min(moves.length, MAX_SEARCH_DEPTH);
  let chosen: number[] = ordered;

  for (let depth = 1; depth <= maxDepth; depth++) {
    const result = searchRoot(
      config,
      board,
      layerWinners,
      player,
      ordered,
      depth,
      lineIndex,
      state
    );
    if (!result || state.aborted) break;
    chosen = result.moves;
    // A forced win (or a proven loss) will not change with more depth.
    if (result.score >= WIN_SCORE - MAX_SEARCH_DEPTH) break;
  }

  return pick(chosen);
}
