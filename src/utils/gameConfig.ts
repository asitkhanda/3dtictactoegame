export type BoardSize = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type ViewMode = '2D' | '3D';
export type GameMode = 'PVP' | 'PVE';

export interface VisualScale {
  boardPx: number;
  cellPx: number;
  layerSpacing: number;
  pieceStackCount: number;
  gapPx: number;
}

export interface GameConfig {
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
  visual: VisualScale;
}

const VISUAL_SCALES: Record<BoardSize, VisualScale> = {
  1: { boardPx: 120, cellPx: 120, layerSpacing: 80, pieceStackCount: 8, gapPx: 0 },
  2: { boardPx: 240, cellPx: 80, layerSpacing: 100, pieceStackCount: 10, gapPx: 8 },
  3: { boardPx: 300, cellPx: 80, layerSpacing: 160, pieceStackCount: 12, gapPx: 12 },
  4: { boardPx: 300, cellPx: 68, layerSpacing: 112, pieceStackCount: 10, gapPx: 10 },
  5: { boardPx: 300, cellPx: 54, layerSpacing: 100, pieceStackCount: 8, gapPx: 8 },
  6: { boardPx: 300, cellPx: 44, layerSpacing: 88, pieceStackCount: 6, gapPx: 6 },
  7: { boardPx: 308, cellPx: 38, layerSpacing: 76, pieceStackCount: 6, gapPx: 5 },
  8: { boardPx: 320, cellPx: 34, layerSpacing: 64, pieceStackCount: 6, gapPx: 4 },
};

export function createGameConfig(size: BoardSize, viewMode: ViewMode): GameConfig {
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
    visual: VISUAL_SCALES[size],
  };
}

export function getRulesPreview(config: GameConfig): string {
  if (config.size === 1) {
    return 'Place your mark. Win instantly. That is all.';
  }
  if (!config.is3D) {
    return `Connect ${config.winLength} in a row on one board.`;
  }
  return `Connect ${config.winLength} through the stack, or win ${config.matchWinThreshold} of ${config.layerCount} layers.`;
}

export function getBoardTitle(config: GameConfig): string {
  if (config.size === 1) return 'THE VOID';
  return config.is3D
    ? `${config.size}×${config.size}×${config.size} 3D`
    : `${config.size}×${config.size} 2D`;
}

export const KONAMI_SEQUENCE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'KeyB',
  'KeyA',
] as const;

export const KONAMI_STORAGE_KEY = '3dttt-konami-unlocked';
