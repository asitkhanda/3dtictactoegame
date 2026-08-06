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
  return Math.max(18, Math.round(layerOpacity * 0.38));
}

/** Layer panel fill, border, blur, and shadow scaled to translucency (0 = fully clear). */
const boardLayerStyleCache = new Map<string, CSSProperties>();

export function getBoardLayerStyles(
  layerOpacity: number,
  options?: { backdropBlur?: boolean }
): CSSProperties {
  // backdrop-filter forces the GPU to re-composite everything behind each
  // layer every frame — far too expensive on mobile, so callers disable it.
  const backdropBlur = options?.backdropBlur !== false;
  const cacheKey = `${layerOpacity}:${backdropBlur}`;
  const cached = boardLayerStyleCache.get(cacheKey);
  if (cached) return cached;

  if (layerOpacity <= 0) {
    const empty = {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      boxShadow: 'none',
      backdropFilter: 'none',
      WebkitBackdropFilter: 'none',
    } satisfies CSSProperties;
    boardLayerStyleCache.set(cacheKey, empty);
    return empty;
  }

  const borderAlpha = Math.max(28, Math.round(layerOpacity * 0.65));
  const blurPx = backdropBlur ? Math.round((layerOpacity / 100) * 4) : 0;
  const shadowAlpha = Math.round(layerOpacity * 0.12);

  const styles = {
    // --board-fill (theme CSS var) damps panel fill on cream paper, where a
    // translucent light panel would wash out pieces behind it.
    backgroundColor: `color-mix(in oklch, var(--game-layer) calc(${layerOpacity}% * var(--board-fill, 1)), transparent)`,
    borderColor: `color-mix(in oklch, var(--game-border) ${borderAlpha}%, transparent)`,
    boxShadow:
      layerOpacity >= 15
        ? `inset 0 1px 0 color-mix(in oklch, white 16%, transparent), 0 20px 25px -5px color-mix(in oklch, black ${shadowAlpha}%, transparent), 0 8px 10px -6px color-mix(in oklch, black ${shadowAlpha}%, transparent)`
        : 'none',
    backdropFilter: blurPx > 0 ? `blur(${blurPx}px)` : 'none',
    WebkitBackdropFilter: blurPx > 0 ? `blur(${blurPx}px)` : 'none',
  } satisfies CSSProperties;

  boardLayerStyleCache.set(cacheKey, styles);
  return styles;
}

/** Empty-cell fill and border scaled to translucency (0 = fully clear). */
const cellSurfaceStyleCache = new Map<string, CSSProperties>();

export function getCellSurfaceStyles(
  cellOpacity: number,
  isWinningCell: boolean
): CSSProperties {
  const key = `${cellOpacity}:${isWinningCell}`;
  const cached = cellSurfaceStyleCache.get(key);
  if (cached) return cached;

  if (isWinningCell || cellOpacity <= 0) {
    const styles = isWinningCell
      ? ({} satisfies CSSProperties)
      : ({
          backgroundColor: 'transparent',
          borderColor: 'transparent',
        } satisfies CSSProperties);
    cellSurfaceStyleCache.set(key, styles);
    return styles;
  }

  const borderAlpha = Math.min(60, Math.max(32, Math.round(cellOpacity * 2.2)));

  const styles = {
    backgroundColor: `color-mix(in oklch, var(--game-cell) calc(${cellOpacity}% * var(--board-fill, 1)), transparent)`,
    // Faint diagonal sheen — reads as glass in both themes.
    backgroundImage:
      'linear-gradient(135deg, color-mix(in oklch, white 14%, transparent), transparent 55%)',
    borderColor: `color-mix(in oklch, var(--game-border) ${borderAlpha}%, transparent)`,
  } satisfies CSSProperties;

  cellSurfaceStyleCache.set(key, styles);
  return styles;
}
