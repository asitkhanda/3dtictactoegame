
type Player = 'X' | 'O' | null;
export type BoardState = Player[];

// 3x3x3 = 27 cells
// Indices: x + y*3 + z*9
// x: 0..2, y: 0..2, z: 0..2

// Generate winning lines for a specific layer (z)
function getLayerLines(z: number): number[][] {
  const lines: number[][] = [];
  const offset = z * 9;

  // Rows
  for (let y = 0; y < 3; y++) {
    lines.push([
      offset + y * 3 + 0,
      offset + y * 3 + 1,
      offset + y * 3 + 2
    ]);
  }

  // Columns
  for (let x = 0; x < 3; x++) {
    lines.push([
      offset + x + 0 * 3,
      offset + x + 1 * 3,
      offset + x + 2 * 3
    ]);
  }

  // Diagonals
  lines.push([
    offset + 0,
    offset + 4,
    offset + 8
  ]);
  lines.push([
    offset + 2,
    offset + 4,
    offset + 6
  ]);

  return lines;
}

export const LAYER_LINES = [
  getLayerLines(0),
  getLayerLines(1),
  getLayerLines(2)
];

// --- CROSS LAYER LOGIC ---

function getCrossLayerLines(): number[][] {
  const lines: number[][] = [];

  // 1. Verticals (Same x, y, varying z)
  for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 3; y++) {
      lines.push([
        0 * 9 + y * 3 + x,
        1 * 9 + y * 3 + x,
        2 * 9 + y * 3 + x
      ]);
    }
  }

  // 2. Diagonals on XZ planes (Constant y)
  for (let y = 0; y < 3; y++) {
    // Forward slash in XZ
    lines.push([
      0 * 9 + y * 3 + 0,
      1 * 9 + y * 3 + 1,
      2 * 9 + y * 3 + 2
    ]);
    // Back slash in XZ
    lines.push([
      0 * 9 + y * 3 + 2,
      1 * 9 + y * 3 + 1,
      2 * 9 + y * 3 + 0
    ]);
  }

  // 3. Diagonals on YZ planes (Constant x)
  for (let x = 0; x < 3; x++) {
    // Forward slash in YZ
    lines.push([
      0 * 9 + 0 * 3 + x,
      1 * 9 + 1 * 3 + x,
      2 * 9 + 2 * 3 + x
    ]);
    // Back slash in YZ
    lines.push([
      0 * 9 + 2 * 3 + x,
      1 * 9 + 1 * 3 + x,
      2 * 9 + 0 * 3 + x
    ]);
  }

  // 4. Main Space Diagonals (Corner to Corner through center)
  lines.push([0, 13, 26]); // 0,0,0 -> 2,2,2
  lines.push([2, 13, 24]); // 2,0,0 -> 0,2,2
  lines.push([6, 13, 20]); // 0,2,0 -> 2,0,2
  lines.push([8, 13, 18]); // 2,2,0 -> 0,0,2

  return lines;
}

export const CROSS_LAYER_LINES = getCrossLayerLines();

export function checkCrossLayerWinner(board: BoardState): { winner: Player, line: number[] | null } {
  for (const line of CROSS_LAYER_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  return { winner: null, line: null };
}

// Helper to check a specific layer for a winner
export function checkLayerWinner(board: BoardState, layerIndex: number): { winner: Player, line: number[] | null } {
  const lines = LAYER_LINES[layerIndex];
  for (const line of lines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  return { winner: null, line: null };
}

export function isLayerFull(board: BoardState, layerIndex: number): boolean {
    const offset = layerIndex * 9;
    for(let i=0; i<9; i++) {
        if(board[offset + i] === null) return false;
    }
    return true;
}

export function isDraw(board: BoardState): boolean {
  return board.every((cell) => cell !== null);
}

// --- AI Logic ---

export function getComputerMove(board: BoardState, layerWinners: { winner: Player }[]): number {
  const aiPlayer = 'O';
  const humanPlayer = 'X';

  // Helper to check if a move is valid:
  // 1. The cell must be empty
  // 2. The layer must NOT be won yet (since won layers are frozen)
  const isValidMove = (index: number) => {
      if (board[index] !== null) return false;
      const layerIndex = Math.floor(index / 9);
      if (layerWinners[layerIndex].winner !== null) return false;
      return true;
  };

  // Helper: Find a winning move for 'player' in a given set of lines
  const findWinningMoveInLines = (lines: number[][], player: Player): number | null => {
    for (const line of lines) {
      const [a, b, c] = line;
      const cells = [board[a], board[b], board[c]];
      const myCount = cells.filter(c => c === player).length;
      const emptyCount = cells.filter(c => c === null).length;

      if (myCount === 2 && emptyCount === 1) {
        if (isValidMove(a)) return a;
        if (isValidMove(b)) return b;
        if (isValidMove(c)) return c;
      }
    }
    return null;
  };

  // --- PRIORITY 1: INSTANT WIN (Cross Layer) ---
  const instantWin = findWinningMoveInLines(CROSS_LAYER_LINES, aiPlayer);
  if (instantWin !== null) return instantWin;

  // --- PRIORITY 2: BLOCK INSTANT WIN (Cross Layer) ---
  const blockInstantWin = findWinningMoveInLines(CROSS_LAYER_LINES, humanPlayer);
  if (blockInstantWin !== null) return blockInstantWin;

  // --- PRIORITY 3: WIN MATCH (via 2nd Layer Win) ---
  // If AI already has 1 layer, try to win another active layer
  const activeLayers = [0, 1, 2].filter(i => layerWinners[i].winner === null);
  const aiLayerWins = layerWinners.filter(l => l.winner === aiPlayer).length;
  const humanLayerWins = layerWinners.filter(l => l.winner === humanPlayer).length;

  if (aiLayerWins >= 1) {
    for (const layerIdx of activeLayers) {
       const winLayer = findWinningMoveInLines(LAYER_LINES[layerIdx], aiPlayer);
       if (winLayer !== null) return winLayer;
    }
  }

  // --- PRIORITY 4: BLOCK MATCH WIN (Prevent Human from getting 2nd layer) ---
  if (humanLayerWins >= 1) {
    for (const layerIdx of activeLayers) {
       const blockLayer = findWinningMoveInLines(LAYER_LINES[layerIdx], humanPlayer);
       if (blockLayer !== null) return blockLayer;
    }
  }

  // --- PRIORITY 5: WIN ANY LAYER ---
  for (const layerIdx of activeLayers) {
    const winLayer = findWinningMoveInLines(LAYER_LINES[layerIdx], aiPlayer);
    if (winLayer !== null) return winLayer;
  }

  // --- PRIORITY 6: BLOCK ANY LAYER ---
  for (const layerIdx of activeLayers) {
    const blockLayer = findWinningMoveInLines(LAYER_LINES[layerIdx], humanPlayer);
    if (blockLayer !== null) return blockLayer;
  }

  // --- PRIORITY 7: STRATEGIC MOVES ---
  
  // Center of the cube (most valuable spot for cross-layer)
  if (isValidMove(13)) return 13;

  // Centers of layers
  const centers = [4, 22]; // 4 is center of layer 0, 22 is center of layer 2. 13 is center of layer 1 (already checked)
  for (const c of centers) {
    if (isValidMove(c)) return c;
  }

  // Corners of the cube (Indices: 0, 2, 6, 8, 18, 20, 24, 26)
  const corners = [0, 2, 6, 8, 18, 20, 24, 26];
  const availableCorners = corners.filter(c => isValidMove(c));
  if (availableCorners.length > 0) {
    return availableCorners[Math.floor(Math.random() * availableCorners.length)];
  }

  // Random fallback
  const allMoves: number[] = [];
  for (let i = 0; i < 27; i++) {
    if (isValidMove(i)) allMoves.push(i);
  }

  if (allMoves.length > 0) {
    return allMoves[Math.floor(Math.random() * allMoves.length)];
  }

  return -1;
}
