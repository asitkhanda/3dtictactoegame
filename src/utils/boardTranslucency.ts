import type { CSSProperties } from 'react';

export const BOARD_TRANSLUCENCY_STORAGE_KEY = '3dttt-board-translucency';

export const MIN_BOARD_TRANSLUCENCY = 0;
export const DEFAULT_BOARD_TRANSLUCENCY = 50;
export const MAX_BOARD_TRANSLUCENCY = 100;

export function clampBoardTranslucency(value: number): number {
  return Math.min(MAX_BOARD_TRANSLUCENCY, Math.max(MIN_BOARD_TRANSLUCENCY, value));
}

export function readStoredBoardTranslucency(): number {
  try {
    const stored = localStorage.getItem(BOARD_TRANSLUCENCY_STORAGE_KEY);
    if (stored) {
      const parsed = Number(stored);
      if (Number.isFinite(parsed)) {
        return clampBoardTranslucency(parsed);
      }
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_BOARD_TRANSLUCENCY;
}

export function writeStoredBoardTranslucency(value: number): void {
  try {
    localStorage.setItem(BOARD_TRANSLUCENCY_STORAGE_KEY, String(clampBoardTranslucency(value)));
  } catch {
    /* ignore */
  }
}

export function getBoardTranslucencyLabel(value: number): string {
  if (value <= 33) return 'Clear';
  if (value <= 66) return 'Translucent';
  return 'Solid';
}

/** Map layer opacity to cell background alpha (empty cells). */
export function layerOpacityToCellAlpha(layerOpacity: number): number {
  return Math.round(layerOpacity * 0.3);
}

/** Layer panel fill, border, blur, and shadow scaled to translucency (0 = fully clear). */
export function getBoardLayerStyles(layerOpacity: number): CSSProperties {
  if (layerOpacity <= 0) {
    return {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      boxShadow: 'none',
      backdropFilter: 'none',
      WebkitBackdropFilter: 'none',
    };
  }

  const borderAlpha = Math.round(layerOpacity * 0.6);
  const blurPx = Math.round((layerOpacity / 100) * 4);
  const shadowAlpha = Math.round(layerOpacity * 0.1);

  return {
    backgroundColor: `color-mix(in oklch, var(--card) ${layerOpacity}%, transparent)`,
    borderColor: `color-mix(in oklch, var(--border) ${borderAlpha}%, transparent)`,
    boxShadow:
      layerOpacity >= 15
        ? `0 20px 25px -5px color-mix(in oklch, black ${shadowAlpha}%, transparent), 0 8px 10px -6px color-mix(in oklch, black ${shadowAlpha}%, transparent)`
        : 'none',
    backdropFilter: blurPx > 0 ? `blur(${blurPx}px)` : 'none',
    WebkitBackdropFilter: blurPx > 0 ? `blur(${blurPx}px)` : 'none',
  };
}

/** Empty-cell fill and border scaled to translucency (0 = fully clear). */
export function getCellSurfaceStyles(
  cellOpacity: number,
  isWinningCell: boolean
): CSSProperties {
  if (isWinningCell || cellOpacity <= 0) {
    return isWinningCell
      ? {}
      : {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
        };
  }

  const borderAlpha = Math.min(50, Math.round(cellOpacity * 3.33));

  return {
    backgroundColor: `color-mix(in oklch, var(--muted) ${cellOpacity}%, transparent)`,
    borderColor: `color-mix(in oklch, var(--border) ${borderAlpha}%, transparent)`,
  };
}
