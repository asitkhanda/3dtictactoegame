import { GameConfig } from './gameConfig';

type Player = 'X' | 'O' | null;
export type BoardState = Player[];

export type LayerResult = { winner: Player; line: number[] | null };

export interface GameState {
  board: BoardState;
  layerWinners: LayerResult[];
}

export function createInitialState(config: GameConfig): GameState {
  return {
    board: Array(config.cellCount).fill(null),
    layerWinners: Array.from({ length: config.layerCount }, () => ({
      winner: null,
      line: null,
    })),
  };
}

export function generateLayerLines(config: GameConfig, layerIndex: number): number[][] {
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

  return lines;
}

export function generateCrossLayerLines(config: GameConfig): number[][] {
  const { size, cellsPerLayer } = config;
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
  config: GameConfig,
  board: BoardState
): { winner: Player; line: number[] | null } {
  if (!config.is3D || config.size <= 1) {
    return { winner: null, line: null };
  }
  return checkLinesWinner(board, generateCrossLayerLines(config), config.winLength);
}

export function checkLayerWinner(
  config: GameConfig,
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
  config: GameConfig,
  board: BoardState
): { winner: Player; line: number[] | null } {
  return checkLayerWinner(config, board, 0);
}

export function isLayerFull(
  config: GameConfig,
  board: BoardState,
  layerIndex: number
): boolean {
  const offset = layerIndex * config.cellsPerLayer;
  for (let i = 0; i < config.cellsPerLayer; i++) {
    if (board[offset + i] === null) return false;
  }
  return true;
}

export function isDraw(config: GameConfig, board: BoardState): boolean {
  return board.every((cell) => cell !== null);
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
  config: GameConfig,
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

  if (isDraw(config, newBoard)) {
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

function getCubeCorners(config: GameConfig): number[] {
  const { size } = config;
  const last = size - 1;
  const zValues = config.is3D ? [0, last] : [0];
  const corners: number[] = [];

  for (const z of zValues) {
    corners.push(
      config.index(0, 0, z),
      config.index(last, 0, z),
      config.index(0, last, z),
      config.index(last, last, z)
    );
  }

  return [...new Set(corners)];
}

function getStrategicCenters(config: GameConfig): number[] {
  const { size } = config;
  const mid = Math.floor(size / 2);
  const centers: number[] = [];

  if (config.is3D) {
    centers.push(config.index(mid, mid, mid));
    for (let z = 0; z < config.layerCount; z++) {
      const c = config.index(mid, mid, z);
      if (!centers.includes(c)) centers.push(c);
    }
  } else {
    centers.push(config.index(mid, mid, 0));
  }

  return centers;
}

export function getComputerMove(
  config: GameConfig,
  board: BoardState,
  layerWinners: LayerResult[]
): number {
  const aiPlayer: Player = 'O';
  const humanPlayer: Player = 'X';
  const winLength = config.winLength;

  const isValidMove = (index: number) => {
    if (board[index] !== null) return false;
    const layerIndex = config.layerOf(index);
    if (layerWinners[layerIndex]?.winner !== null) return false;
    return true;
  };

  const findWinningMoveInLines = (lines: number[][], player: Player): number | null => {
    for (const line of lines) {
      const cells = line.map((idx) => board[idx]);
      const myCount = cells.filter((c) => c === player).length;
      const emptyCount = cells.filter((c) => c === null).length;

      if (myCount === winLength - 1 && emptyCount === 1) {
        for (const idx of line) {
          if (isValidMove(idx)) return idx;
        }
      }
    }
    return null;
  };

  if (config.size === 1) {
    return isValidMove(0) ? 0 : -1;
  }

  if (config.is3D) {
    const crossLayerLines = generateCrossLayerLines(config);

    const instantWin = findWinningMoveInLines(crossLayerLines, aiPlayer);
    if (instantWin !== null) return instantWin;

    const blockInstantWin = findWinningMoveInLines(crossLayerLines, humanPlayer);
    if (blockInstantWin !== null) return blockInstantWin;

    const activeLayers = Array.from({ length: config.layerCount }, (_, i) => i).filter(
      (i) => layerWinners[i].winner === null
    );
    const aiLayerWins = layerWinners.filter((l) => l.winner === aiPlayer).length;
    const humanLayerWins = layerWinners.filter((l) => l.winner === humanPlayer).length;
    const layersNeeded = Math.max(1, config.matchWinThreshold - 1);

    if (aiLayerWins >= layersNeeded) {
      for (const layerIdx of activeLayers) {
        const winLayer = findWinningMoveInLines(
          generateLayerLines(config, layerIdx),
          aiPlayer
        );
        if (winLayer !== null) return winLayer;
      }
    }

    if (humanLayerWins >= layersNeeded) {
      for (const layerIdx of activeLayers) {
        const blockLayer = findWinningMoveInLines(
          generateLayerLines(config, layerIdx),
          humanPlayer
        );
        if (blockLayer !== null) return blockLayer;
      }
    }

    for (const layerIdx of activeLayers) {
      const winLayer = findWinningMoveInLines(
        generateLayerLines(config, layerIdx),
        aiPlayer
      );
      if (winLayer !== null) return winLayer;
    }

    for (const layerIdx of activeLayers) {
      const blockLayer = findWinningMoveInLines(
        generateLayerLines(config, layerIdx),
        humanPlayer
      );
      if (blockLayer !== null) return blockLayer;
    }
  } else {
    const boardLines = generateLayerLines(config, 0);
    const winMove = findWinningMoveInLines(boardLines, aiPlayer);
    if (winMove !== null) return winMove;
    const blockMove = findWinningMoveInLines(boardLines, humanPlayer);
    if (blockMove !== null) return blockMove;
  }

  for (const c of getStrategicCenters(config)) {
    if (isValidMove(c)) return c;
  }

  const corners = getCubeCorners(config).filter((c) => isValidMove(c));
  if (corners.length > 0) {
    return corners[Math.floor(Math.random() * corners.length)];
  }

  const allMoves: number[] = [];
  for (let i = 0; i < config.cellCount; i++) {
    if (isValidMove(i)) allMoves.push(i);
  }

  if (allMoves.length > 0) {
    return allMoves[Math.floor(Math.random() * allMoves.length)];
  }

  return -1;
}
