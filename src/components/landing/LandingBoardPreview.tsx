import { useEffect, useMemo, useState } from 'react';
import { BoardLayer } from '../BoardLayer';
import { createGameConfig } from '../../utils/gameConfig';
import {
  applyMove,
  BoardState,
  createInitialState,
  LayerResult,
} from '../../utils/gameLogic';
import { useInView } from '../../hooks/useInView';
import { usePageVisible } from '../../hooks/usePageVisible';
import { cn } from '../../lib/utils';

const PREVIEW_CONFIG = createGameConfig(3, '3D');
const DEMO_MOVES = [4, 13, 0, 22, 8, 17, 26, 10];

export function LandingBoardPreview() {
  const [board, setBoard] = useState<BoardState>(() =>
    createInitialState(PREVIEW_CONFIG).board
  );
  const [layerWinners, setLayerWinners] = useState<LayerResult[]>(() =>
    createInitialState(PREVIEW_CONFIG).layerWinners
  );
  const [lastMoveIndex, setLastMoveIndex] = useState<number | null>(null);
  const { ref, inView } = useInView<HTMLDivElement>('80px');
  const pageVisible = usePageVisible();
  const active = inView && pageVisible;

  const visual = PREVIEW_CONFIG.visual;

  useEffect(() => {
    if (!active) return;

    let step = 0;
    let currentBoard = createInitialState(PREVIEW_CONFIG).board;
    let currentLayers = createInitialState(PREVIEW_CONFIG).layerWinners;
    let xNext = true;

    const timer = setInterval(() => {
      if (step >= DEMO_MOVES.length) {
        const fresh = createInitialState(PREVIEW_CONFIG);
        currentBoard = fresh.board;
        currentLayers = fresh.layerWinners;
        xNext = true;
        step = 0;
        setBoard(fresh.board);
        setLayerWinners(fresh.layerWinners);
        setLastMoveIndex(null);
        return;
      }

      const cellIndex = DEMO_MOVES[step];
      const result = applyMove(
        PREVIEW_CONFIG,
        currentBoard,
        currentLayers,
        cellIndex,
        xNext
      );

      if (result) {
        currentBoard = result.board;
        currentLayers = result.layerWinners;
        xNext = result.isXNext;
        setBoard(result.board);
        setLayerWinners(result.layerWinners);
        setLastMoveIndex(cellIndex);
      }

      step += 1;
    }, 1100);

    return () => clearInterval(timer);
  }, [active]);

  const layers = useMemo(
    () => Array.from({ length: PREVIEW_CONFIG.layerCount }, (_, i) => i),
    []
  );

  const noopClick = useMemo(() => () => {}, []);

  return (
    <div
      ref={ref}
      className={cn(
        'relative flex items-center justify-center lg:translate-y-6',
        !active && 'arcade-animations-paused'
      )}
    >
      <div
        className="preview-spotlight pointer-events-none absolute inset-0 rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, var(--neon-orange-glow) 0%, var(--neon-violet-glow) 45%, transparent 70%)',
        }}
      />

      <div
        className="relative flex scale-[0.72] items-center justify-center sm:scale-90 lg:scale-100"
        style={{
          width: visual.boardPx,
          height: visual.boardPx + (PREVIEW_CONFIG.layerCount - 1) * visual.layerSpacing * 0.35,
          perspective: '1100px',
        }}
      >
        <div
          className="preview-board-spin relative h-0 w-0"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {layers.map((layerIndex) => (
            <BoardLayer
              key={layerIndex}
              layerIndex={layerIndex}
              totalLayers={PREVIEW_CONFIG.layerCount}
              size={PREVIEW_CONFIG.size}
              cellsPerLayer={PREVIEW_CONFIG.cellsPerLayer}
              boardPx={visual.boardPx}
              cellPx={visual.cellPx}
              gapPx={visual.gapPx}
              spacingZ={visual.layerSpacing}
              pieceStackCount={visual.pieceStackCount}
              board={board}
              onCellClick={noopClick}
              winningLine={null}
              disabled
              showLabel={false}
              layerOpacity={55}
              cellOpacity={22}
              lastMoveIndex={lastMoveIndex}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
