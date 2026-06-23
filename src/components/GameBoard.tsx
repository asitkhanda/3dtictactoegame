import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  applyMove,
  BoardState,
  createInitialState,
  getComputerMove,
  LayerResult,
} from '../utils/gameLogic';
import {
  BoardSize,
  GameMode,
  GameConfig,
  createGameConfig,
  getBoardTitle,
  getRulesPreview,
} from '../utils/gameConfig';
import { BoardLayer } from './BoardLayer';
import { Board2D } from './Board2D';
import { BoardCameraJoystick } from './BoardCameraJoystick';
import { GameSetupMenu } from './GameSetupMenu';
import { useBoardScale } from '../hooks/useBoardScale';
import { useBoardViewport } from '../hooks/useBoardViewport';
import { useRotationSensitivity } from '../hooks/useRotationSensitivity';
import { useBoardTranslucency } from '../hooks/useBoardTranslucency';
import { layerOpacityToCellAlpha } from '../utils/boardTranslucency';
import { useIsMobile } from './ui/use-mobile';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
} from './ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from './ui/tooltip';
import {
  ArrowLeft,
  RotateCcw,
  Trophy,
  MousePointer2,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { cn } from '../lib/utils';
import { ThemeToggle } from './ThemeToggle';

const GAME_END_TOAST_ID = 'game-end';

export function GameBoard() {
  const [session, setSession] = useState<{
    config: GameConfig;
    gameMode: GameMode;
  } | null>(null);

  const config = session?.config ?? null;
  const gameMode = session?.gameMode ?? null;

  const initial = useMemo(
    () =>
      config
        ? createInitialState(config)
        : { board: [] as BoardState, layerWinners: [] as LayerResult[] },
    [config]
  );

  const [board, setBoard] = useState<BoardState>(initial.board);
  const [layerWinners, setLayerWinners] = useState<LayerResult[]>(initial.layerWinners);
  const [isXNext, setIsXNext] = useState(true);
  const [crossLayerWinningLine, setCrossLayerWinningLine] = useState<number[] | null>(null);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [winner, setWinner] = useState<'X' | 'O' | null>(null);
  const [draw, setDraw] = useState(false);
  const [lastMoveIndex, setLastMoveIndex] = useState<number | null>(null);

  const boardScale = useBoardScale({
    boardPx: config?.visual.boardPx ?? 300,
    is3D: config?.is3D ?? false,
    layerCount: config?.layerCount ?? 1,
    layerSpacing: config?.visual.layerSpacing ?? 100,
    hudHeight: 72,
  });

  const showZoomControls = (config?.size ?? 0) >= 3;
  const isMobile = useIsMobile();
  const showCameraJoystick = config?.is3D && !isMobile;
  const showZoomPanel = showZoomControls && !config?.is3D;
  const { sensitivity, setSensitivity, rotationMultiplier } = useRotationSensitivity();
  const { translucency, setTranslucency } = useBoardTranslucency();
  const cellOpacity = layerOpacityToCellAlpha(translucency);
  const { viewportRef, boardRef, resetView, setView, activePreset, zoomIn, zoomOut, rotateBy, viewportHandlers } =
    useBoardViewport({
      baseScale: boardScale,
      is3D: config?.is3D ?? false,
      enabled: !!config,
      rotationSensitivity: rotationMultiplier,
    });

  const resetGameState = useCallback(() => {
    if (!config) return;
    toast.dismiss(GAME_END_TOAST_ID);
    const state = createInitialState(config);
    setBoard(state.board);
    setLayerWinners(state.layerWinners);
    setIsXNext(true);
    setWinner(null);
    setDraw(false);
    setCrossLayerWinningLine(null);
    setWinningLine(null);
    setLastMoveIndex(null);
    resetView();
  }, [config, resetView]);

  const exitToMenu = useCallback(() => {
    toast.dismiss(GAME_END_TOAST_ID);
    setSession(null);
  }, []);

  useEffect(() => {
    if (config) resetGameState();
  }, [config, resetGameState]);

  useEffect(() => {
    if (lastMoveIndex === null) return;
    const timer = setTimeout(() => setLastMoveIndex(null), 1500);
    return () => clearTimeout(timer);
  }, [lastMoveIndex]);

  const makeMove = useCallback(
    (index: number) => {
      if (!config || winner || draw) return;

      const result = applyMove(config, board, layerWinners, index, isXNext);
      if (!result) return;

      setBoard(result.board);
      setLayerWinners(result.layerWinners);
      setCrossLayerWinningLine(result.crossLayerWinningLine);
      setWinningLine(result.winningLine);
      setWinner(result.winner);
      setDraw(result.draw);
      setIsXNext(result.isXNext);
      setLastMoveIndex(index);
    },
    [config, board, layerWinners, isXNext, winner, draw]
  );

  useEffect(() => {
    if (!config || gameMode !== 'PVE' || isXNext || winner || draw) return;

    const delay = config.size >= 6 ? 400 : 750;
    const timer = setTimeout(() => {
      const moveIndex = getComputerMove(config, board, layerWinners);
      if (moveIndex !== -1) makeMove(moveIndex);
    }, delay);

    return () => clearTimeout(timer);
  }, [config, gameMode, isXNext, winner, draw, board, layerWinners, makeMove]);

  const handleCellClick = useCallback(
    (index: number) => {
      if (gameMode === 'PVE' && !isXNext) return;
      makeMove(index);
    },
    [gameMode, isXNext, makeMove]
  );

  const handleStart = (size: BoardSize, mode: GameMode) => {
    setSession({ config: createGameConfig(size, '3D'), gameMode: mode });
  };

  const getWinMessage = useCallback(() => {
    if (!config || !gameMode || !winner) return '';

    if (config.size === 1) {
      return winner === 'X' && gameMode === 'PVE'
        ? 'You conquered the void!'
        : winner === 'O' && gameMode === 'PVE'
          ? 'The void consumed you!'
          : winner === 'X'
            ? 'X claims the void!'
            : 'O claims the void!';
    }
    if (crossLayerWinningLine) {
      return winner === 'X' && gameMode === 'PVE'
        ? 'You win — 3D line!'
        : winner === 'O' && gameMode === 'PVE'
          ? 'AI wins — 3D line!'
          : `${winner} wins — 3D line!`;
    }
    if (winner === 'X' && gameMode === 'PVE') return 'You win!';
    if (winner === 'O' && gameMode === 'PVE') return 'AI wins!';
    return `${winner} wins the match!`;
  }, [config, gameMode, winner, crossLayerWinningLine]);

  useEffect(() => {
    if (!config || !gameMode) return;

    if (!winner && !draw) {
      toast.dismiss(GAME_END_TOAST_ID);
      return;
    }

    toast(draw ? 'Draw' : getWinMessage(), {
      id: GAME_END_TOAST_ID,
      duration: Infinity,
      icon: draw ? (
        <Sparkles className="size-4" />
      ) : (
        <Trophy className="size-4 text-amber-400" />
      ),
      action: {
        label: 'Play again',
        onClick: resetGameState,
      },
      cancel: {
        label: 'Change setup',
        onClick: exitToMenu,
      },
    });
  }, [config, gameMode, winner, draw, getWinMessage, resetGameState, exitToMenu]);

  if (!session || !config || !gameMode) {
    return <GameSetupMenu onStart={handleStart} />;
  }

  const xScore = layerWinners.filter((l) => l.winner === 'X').length;
  const oScore = layerWinners.filter((l) => l.winner === 'O').length;
  const isGameActive = !winner && !draw;
  const isXActive = winner === 'X' || (isGameActive && isXNext);
  const isOActive = winner === 'O' || (isGameActive && !isXNext);
  const highlightLine = crossLayerWinningLine || winningLine;
  const showLayerScore = config.is3D && config.size > 1;
  const boardTitle = getBoardTitle(config);
  const rulesHint = getRulesPreview(config);

  const isLayerDisabled = (layerIndex: number) =>
    !!winner ||
    draw ||
    !!layerWinners[layerIndex]?.winner ||
    (gameMode === 'PVE' && !isXNext);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-muted/20 via-background to-background"
      />

      <header className="glass-surface sticky top-0 z-50 shrink-0 px-2 py-1">
        <div className="mx-auto w-full max-w-2xl space-y-1.5">
          <Card className="gap-0 rounded-lg border-border/40 bg-transparent py-0 shadow-none">
            <CardHeader className="gap-0 px-2 py-1.5">
              <div className="flex items-center gap-1.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0"
                      onClick={exitToMenu}
                      aria-label="Exit to menu"
                    >
                      <ArrowLeft className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Back to menu</TooltipContent>
                </Tooltip>

                <div className="min-w-0 flex-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex min-w-0 items-center gap-1">
                        <CardTitle className="truncate text-sm font-semibold">{boardTitle}</CardTitle>
                        <Badge variant="outline" className="hidden shrink-0 font-mono text-[9px] uppercase sm:inline-flex">
                          {gameMode === 'PVE' ? '1P' : '2P'}
                        </Badge>
                        {config.size === 1 && (
                          <Badge className="hidden shrink-0 border-violet-500/30 bg-violet-500/10 px-1 py-0 text-[9px] text-violet-600 dark:text-violet-300 sm:inline-flex">
                            <Sparkles className="mr-0.5 size-2.5" />
                            Void
                          </Badge>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs text-xs">
                      {rulesHint}
                    </TooltipContent>
                  </Tooltip>
                </div>

                {showLayerScore ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <PlayerScore
                      label={gameMode === 'PVE' ? 'You' : 'X'}
                      score={xScore}
                      threshold={config.matchWinThreshold}
                      active={isXActive}
                      tone="x"
                    />
                    <span className="text-muted-foreground font-mono text-[9px]">vs</span>
                    <PlayerScore
                      label={gameMode === 'PVE' ? 'AI' : 'O'}
                      score={oScore}
                      threshold={config.matchWinThreshold}
                      active={isOActive}
                      tone="o"
                    />
                  </div>
                ) : (
                  <Badge
                    variant="outline"
                    className={cn(
                      'shrink-0 px-2 py-0 text-[10px]',
                      isXActive
                        ? 'border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-300'
                        : 'border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-300'
                    )}
                  >
                    {isXActive
                      ? gameMode === 'PVE'
                        ? 'Your turn'
                        : 'X'
                      : gameMode === 'PVE'
                        ? 'AI…'
                        : 'O'}
                  </Badge>
                )}

                {config.is3D && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0"
                        onClick={resetView}
                        aria-label="Reset view"
                      >
                        <RotateCcw className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Reset camera</TooltipContent>
                  </Tooltip>
                )}

                <ThemeToggle />
              </div>
            </CardHeader>
          </Card>
        </div>
      </header>

      <main className="relative flex flex-1 min-h-0 flex-col items-center justify-center overflow-auto p-4">
        {!winner && !draw && (config.is3D || showZoomControls) && (
          <div className="text-muted-foreground pointer-events-none mb-0.5 flex items-center gap-1 font-mono text-[9px] opacity-70">
            <MousePointer2 className="size-3" />
            {config.is3D
              ? showCameraJoystick
                ? 'Use joystick to rotate · Scroll or side buttons to zoom'
                : 'Pinch to zoom · Drag to rotate'
              : isMobile
                ? 'Pinch or panel buttons to zoom'
                : 'Scroll or panel buttons to zoom'}
          </div>
        )}

        <div
          ref={viewportRef}
          className={cn(
            'flex flex-1 items-center justify-center will-change-transform',
            config.is3D && 'touch-none cursor-grab active:cursor-grabbing'
          )}
          style={{ transformOrigin: 'center center' }}
          {...viewportHandlers}
        >
          {config.is3D ? (
            <div
              className="flex items-center justify-center"
              style={{ perspective: config.size >= 6 ? '900px' : '1200px' }}
            >
              <div
                ref={boardRef}
                className="relative h-0 w-0 will-change-transform"
                style={{ transformStyle: 'preserve-3d' }}
              >
                {Array.from({ length: config.layerCount }, (_, i) => (
                  <BoardLayer
                    key={i}
                    layerIndex={i}
                    totalLayers={config.layerCount}
                    size={config.size}
                    cellsPerLayer={config.cellsPerLayer}
                    boardPx={config.visual.boardPx}
                    cellPx={config.visual.cellPx}
                    gapPx={config.visual.gapPx}
                    spacingZ={config.visual.layerSpacing}
                    pieceStackCount={config.visual.pieceStackCount}
                    board={board}
                    onCellClick={handleCellClick}
                    winningLine={
                      crossLayerWinningLine ||
                      layerWinners[i]?.line ||
                      (config.size === 1 ? highlightLine : null)
                    }
                    disabled={isLayerDisabled(i)}
                    showLabel={config.layerCount > 1}
                    layerOpacity={translucency}
                    cellOpacity={cellOpacity}
                    lastMoveIndex={lastMoveIndex}
                  />
                ))}
              </div>
            </div>
          ) : (
            <Board2D
              config={config}
              board={board}
              onCellClick={handleCellClick}
              winningLine={highlightLine}
              disabled={!!winner || draw || (gameMode === 'PVE' && !isXNext)}
              layerOpacity={translucency}
              cellOpacity={cellOpacity}
              lastMoveIndex={lastMoveIndex}
            />
          )}
        </div>

        {showCameraJoystick && isGameActive && (
          <BoardCameraJoystick
            className="absolute bottom-3 left-3 z-10"
            onRotate={rotateBy}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            sensitivity={sensitivity}
            onSensitivityChange={setSensitivity}
            translucency={translucency}
            onTranslucencyChange={setTranslucency}
            activePreset={activePreset}
            onPresetSelect={setView}
          />
        )}

        {showZoomPanel && isGameActive && (
          <BoardCameraJoystick
            zoomOnly
            className="absolute bottom-3 left-3 z-10"
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
          />
        )}
      </main>
    </div>
  );
}

function PlayerScore({
  label,
  score,
  threshold,
  active,
  tone,
}: {
  label: string;
  score: number;
  threshold: number;
  active: boolean;
  tone: 'x' | 'o';
}) {
  const colors =
    tone === 'x'
      ? {
          active: 'border-orange-500/40 bg-orange-500/10',
          text: 'text-orange-600 dark:text-orange-400',
          dot: 'bg-orange-500',
        }
      : {
          active: 'border-violet-500/40 bg-violet-500/10',
          text: 'text-violet-600 dark:text-violet-400',
          dot: 'bg-violet-500',
        };

  return (
    <div
      className={cn(
        'flex items-center gap-1 rounded-md border border-transparent px-1.5 py-0.5 transition-colors',
        active && colors.active
      )}
    >
      <div className="text-muted-foreground flex items-center gap-1 text-[9px] uppercase tracking-wide">
        {active && <span className={cn('size-1 rounded-full', colors.dot)} />}
        {label}
      </div>
      <div className={cn('font-mono text-sm font-bold tabular-nums leading-none', colors.text)}>
        {score}
        <span className="text-muted-foreground text-[10px] font-normal">/{threshold}</span>
      </div>
    </div>
  );
}
