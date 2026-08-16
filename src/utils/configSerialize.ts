import { BoardSize, createGameConfig, GameConfig, ViewMode } from './gameConfig';
import type { MatchConfig } from '../types/database';

export function serializeGameConfig(config: GameConfig): MatchConfig {
  return {
    size: config.size,
    viewMode: config.viewMode,
  };
}

export function deserializeGameConfig(data: unknown): GameConfig | null {
  if (!data || typeof data !== 'object') return null;
  const candidate = data as Partial<MatchConfig>;
  const size = candidate.size;
  if (
    typeof size !== 'number' ||
    !Number.isInteger(size) ||
    size < 1 ||
    size > 8 ||
    (candidate.viewMode !== '2D' && candidate.viewMode !== '3D')
  ) {
    return null;
  }
  return createGameConfig(size as BoardSize, candidate.viewMode as ViewMode);
}
