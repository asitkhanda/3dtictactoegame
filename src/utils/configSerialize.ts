import { BoardSize, createGameConfig, GameConfig, ViewMode } from './gameConfig';
import type { MatchConfig } from '../types/database';

export function serializeGameConfig(config: GameConfig): MatchConfig {
  return {
    size: config.size,
    viewMode: config.viewMode,
  };
}

export function deserializeGameConfig(data: MatchConfig): GameConfig {
  return createGameConfig(data.size as BoardSize, data.viewMode as ViewMode);
}
