import { computeBoardOuterPx } from './boardLayout';
import {
  type BoardSize,
  type ViewMode,
  type GameRulesConfig,
  createGameRulesConfig,
} from '../../supabase/functions/_shared/gameRules';

export type { BoardSize, ViewMode };
export type GameMode = 'PVP' | 'PVE' | 'PVP_ONLINE';

export const DEFAULT_BOARD_SIZE: BoardSize = 3;
export const KONAMI_BOARD_SIZES: BoardSize[] = [1, 2, 3, 4, 5, 6, 7, 8];

export interface VisualScale {
  boardPx: number;
  cellPx: number;
  layerSpacing: number;
  pieceStackCount: number;
  gapPx: number;
}

export interface GameConfig extends GameRulesConfig {
  visual: VisualScale;
}

const VISUAL_CELL_SCALES: Record<BoardSize, Omit<VisualScale, 'boardPx'>> = {
  1: { cellPx: 120, layerSpacing: 80, pieceStackCount: 8, gapPx: 0 },
  2: { cellPx: 80, layerSpacing: 100, pieceStackCount: 10, gapPx: 8 },
  3: { cellPx: 80, layerSpacing: 160, pieceStackCount: 12, gapPx: 12 },
  4: { cellPx: 68, layerSpacing: 112, pieceStackCount: 10, gapPx: 10 },
  5: { cellPx: 54, layerSpacing: 100, pieceStackCount: 8, gapPx: 8 },
  6: { cellPx: 44, layerSpacing: 88, pieceStackCount: 6, gapPx: 6 },
  7: { cellPx: 38, layerSpacing: 76, pieceStackCount: 6, gapPx: 5 },
  8: { cellPx: 34, layerSpacing: 64, pieceStackCount: 6, gapPx: 4 },
};

const VISUAL_SCALES = Object.fromEntries(
  Object.entries(VISUAL_CELL_SCALES).map(([size, scale]) => [
    size,
    {
      ...scale,
      boardPx: computeBoardOuterPx(Number(size), scale.cellPx, scale.gapPx),
    },
  ])
) as Record<BoardSize, VisualScale>;

export function createGameConfig(size: BoardSize, viewMode: ViewMode): GameConfig {
  return {
    ...createGameRulesConfig(size, viewMode),
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
    ? `${config.size}×${config.size}×${config.size}`
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

export type KonamiStep = (typeof KONAMI_SEQUENCE)[number];

export function getKonamiSwipeStep(
  deltaX: number,
  deltaY: number,
  threshold = 40
): KonamiStep | null {
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);
  if (absX < threshold && absY < threshold) return null;
  if (absX > absY) {
    return deltaX > 0 ? 'ArrowRight' : 'ArrowLeft';
  }
  return deltaY > 0 ? 'ArrowDown' : 'ArrowUp';
}

export const KONAMI_STORAGE_KEY = '3dttt-konami-unlocked';
