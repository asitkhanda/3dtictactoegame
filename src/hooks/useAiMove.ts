import { useCallback, useEffect, useRef } from 'react';
import { getComputerMove, type BoardState, type LayerResult } from '../utils/gameLogic';
import type { GameConfig } from '../utils/gameConfig';

type Pending = { resolve: (move: number) => void; reject: (error: Error) => void };

export function useAiMove() {
  const workerRef = useRef<Worker | null>(null);
  const nextIdRef = useRef(1);
  const pendingRef = useRef(new Map<number, Pending>());

  useEffect(() => {
    const worker = new Worker(new URL('../workers/aiWorker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<{ id: number; move: number }>) => {
      const pending = pendingRef.current.get(event.data.id);
      if (!pending) return;
      pendingRef.current.delete(event.data.id);
      pending.resolve(event.data.move);
    };
    worker.onerror = () => {
      for (const pending of pendingRef.current.values()) pending.reject(new Error('AI worker failed'));
      pendingRef.current.clear();
    };
    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
      for (const pending of pendingRef.current.values()) pending.reject(new Error('AI worker cancelled'));
      pendingRef.current.clear();
    };
  }, []);

  const requestMove = useCallback(
    (config: GameConfig, board: BoardState, layerWinners: LayerResult[], player: 'X' | 'O') => {
      if (config.size < 5 || !workerRef.current) {
        return Promise.resolve(getComputerMove(config, board, layerWinners, player));
      }

      const id = nextIdRef.current++;
      return new Promise<number>((resolve, reject) => {
        pendingRef.current.set(id, { resolve, reject });
        workerRef.current?.postMessage({
          id,
          size: config.size,
          viewMode: config.viewMode,
          board,
          layerWinners,
          player,
        });
      });
    },
    []
  );

  return { requestMove };
}
