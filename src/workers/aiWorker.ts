import { createGameRulesConfig, getComputerMove, type BoardState, type LayerResult } from '../shared/gameRules';

type AiRequest = {
  id: number;
  size: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  viewMode: '2D' | '3D';
  board: BoardState;
  layerWinners: LayerResult[];
  player: 'X' | 'O';
};

self.onmessage = (event: MessageEvent<AiRequest>) => {
  const request = event.data;
  const startedAt = performance.now();
  const config = createGameRulesConfig(request.size, request.viewMode);
  const move = getComputerMove(config, request.board, request.layerWinners, request.player);
  self.postMessage({ id: request.id, move, durationMs: performance.now() - startedAt });
};
