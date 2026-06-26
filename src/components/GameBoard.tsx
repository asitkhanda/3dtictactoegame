import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { ArcadeShell } from './ArcadeShell';
import { useBoardScale } from '../hooks/useBoardScale';
import { useBoardViewport } from '../hooks/useBoardViewport';
import { useRotationSensitivity } from '../hooks/useRotationSensitivity';
import { useBoardTranslucency } from '../hooks/useBoardTranslucency';
import { layerOpacityToCellAlpha } from '../utils/boardTranslucency';
import { useIsMobile } from './ui/use-mobile';
import { Button } from './ui/button';
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
  Info,
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { PlayerScore, TurnBadge } from './game/GameHud';
import { cn } from '../lib/utils';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '../contexts/AuthContext';
import { getLocalOutcome, getPointsForOutcome, recordGameResult } from '../services/scoreService';

const GAME_END_TOAST_ID = 'game-end';

const arcadeIconBtn =
  'size-8 shrink-0 rounded-full arcade-text-muted hover:bg-white/10 hover:text-[var(--arcade-fg)] dark:hover:text-white';

export function GameBoard() {
  const { user, profile, signInWithGoogle, isConfigured } = useAuth();
  const scoredGameRef = useRef<string | null>(null);
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
  const [rulesOpen, setRulesOpen] = useState(false);

  const boardScale = useBoardScale({
    boardPx: config?.visual.boardPx ?? 300,
    is3D: config?.is3D ?? false,
    layerCount: config?.layerCount ?? 1,
    layerSpacing: config?.visual.layerSpacing ?? 100,
    hudHeight: 80,
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

    const gameKey = `${gameMode}-${config.size}-${winner ?? 'draw'}-${board.join('')}`;
    let pointsSuffix = '';

    if (
      isConfigured &&
      user &&
      profile?.username &&
      gameMode !== 'PVP_ONLINE' &&
      scoredGameRef.current !== gameKey
    ) {
      scoredGameRef.current = gameKey;
      const outcome = getLocalOutcome(gameMode, winner, draw);
      if (outcome) {
        const pointsEarned = getPointsForOutcome(gameMode, outcome);
        if (pointsEarned !== 0) {
          pointsSuffix = ` (+${pointsEarned} pts)`;
        }
        void recordGameResult(gameMode, config.size, outcome);
      }
    }

    const baseMessage = draw ? 'Draw' : getWinMessage();
    const guestAction =
      isConfigured && !user && !draw
        ? {
            label: 'Sign in to save',
            onClick: () => void signInWithGoogle(),
          }
        : undefined;

    toast(`${baseMessage}${pointsSuffix}`, {
      id: GAME_END_TOAST_ID,
      duration: Infinity,
      icon: draw ? (
        <Sparkles className="size-4" />
      ) : (
        <Trophy className="size-4 text-[var(--neon-orange)]" />
      ),
      action: {
        label: 'Play again',
        onClick: resetGameState,
      },
      cancel: guestAction ?? {
        label: 'Change setup',
        onClick: exitToMenu,
      },
    });
  }, [
    config,
    gameMode,
    winner,
    draw,
    board,
    getWinMessage,
    resetGameState,
    exitToMenu,
    user,
    profile?.username,
    isConfigured,
    signInWithGoogle,
  ]);

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

  const statusMessage = draw
    ? 'Game ended in a draw.'
    : winner
      ? getWinMessage()
      : gameMode === 'PVE'
        ? isXNext
          ? 'Your turn.'
          : 'AI is thinking.'
        : isXNext
          ? "Player X's turn."
          : "Player O's turn.";

  const isLayerDisabled = (layerIndex: number) =>
    !!winner ||
    draw ||
    !!layerWinners[layerIndex]?.winner ||
    (gameMode === 'PVE' && !isXNext);

  return (
    <ArcadeShell variant="gameplay">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {statusMessage}
      </div>

      <header className="sticky top-0 z-50 shrink-0 px-3 py-2 sm:px-4">
        <div className="arcade-panel mx-auto w-full max-w-3xl rounded-2xl px-2 py-1.5 sm:px-3">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={arcadeIconBtn}
                  onClick={exitToMenu}
                  aria-label="Exit to menu"
                >
                  <ArrowLeft className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Back to menu</TooltipContent>
            </Tooltip>

            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-1.5">
                <h1 className="font-display truncate text-sm font-extrabold tracking-tight sm:text-base">
                  {boardTitle}
                </h1>
                <span className="font-body hidden shrink-0 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase sm:inline dark:border-white/15">
                  {gameMode === 'PVE' ? '1P' : '2P'}
                </span>
                {config.size === 1 && (
                  <span className="font-body hidden shrink-0 items-center gap-0.5 rounded-full border border-[var(--neon-violet)]/35 bg-[var(--neon-violet)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--neon-violet)] sm:inline-flex">
                    <Sparkles className="size-2.5" />
                    Void
                  </span>
                )}
              </div>
            </div>

            {showLayerScore ? (
              <div className="flex shrink-0 items-center gap-1.5">
                <PlayerScore
                  label={gameMode === 'PVE' ? 'You' : 'X'}
                  score={xScore}
                  threshold={config.matchWinThreshold}
                  active={isXActive}
                  tone="x"
                />
                <span className="font-mono text-xs arcade-text-muted">vs</span>
                <PlayerScore
                  label={gameMode === 'PVE' ? 'AI' : 'O'}
                  score={oScore}
                  threshold={config.matchWinThreshold}
                  active={isOActive}
                  tone="o"
                />
              </div>
            ) : (
              <TurnBadge
                active={isXActive}
                label={
                  isXActive
                    ? gameMode === 'PVE'
                      ? 'Your turn'
                      : 'X'
                    : gameMode === 'PVE'
                      ? 'AI…'
                      : 'O'
                }
              />
            )}

            {config.is3D && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={arcadeIconBtn}
                    onClick={resetView}
                    aria-label="Reset view"
                  >
                    <RotateCcw className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reset camera</TooltipContent>
              </Tooltip>
            )}

            <ThemeToggle className={arcadeIconBtn} />
          </div>

          <div className="mt-1.5 flex items-start gap-2 border-t border-white/10 pt-1.5 dark:border-white/10">
            <button
              type="button"
              onClick={() => setRulesOpen((open) => !open)}
              className="font-body flex shrink-0 items-center gap-1 rounded-lg px-1.5 py-0.5 text-xs arcade-text-muted transition-colors hover:bg-white/5 hover:text-[var(--arcade-fg)] dark:hover:text-white"
              aria-expanded={rulesOpen}
              aria-controls="game-rules-hint"
            >
              <Info className="size-3.5" />
              Rules
            </button>
            <p
              id="game-rules-hint"
              className={cn(
                'font-body text-xs leading-snug arcade-text-muted',
                rulesOpen ? 'block' : 'sr-only'
              )}
            >
              {rulesHint}
            </p>
          </div>
        </div>
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto px-3 py-2 sm:px-4">
        {!winner && !draw && (config.is3D || showZoomControls) && (
          <p className="font-body pointer-events-none mb-1 flex items-center gap-1.5 text-xs arcade-text-muted">
            <MousePointer2 className="size-3.5 shrink-0" aria-hidden />
            {config.is3D
              ? showCameraJoystick
                ? 'Joystick to rotate · Scroll or buttons to zoom'
                : 'Pinch to zoom · Drag to rotate'
              : isMobile
                ? 'Pinch or panel buttons to zoom'
                : 'Scroll or panel buttons to zoom'}
          </p>
        )}

        <div className="relative flex flex-1 items-center justify-center">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <div
              className="h-[min(70vw,420px)] w-[min(70vw,420px)] rounded-full blur-3xl"
              style={{
                background:
                  'radial-gradient(circle, var(--neon-orange-glow) 0%, var(--neon-violet-glow) 45%, transparent 70%)',
                opacity: 0.45,
              }}
            />
          </div>

          <div
            ref={viewportRef}
            className={cn(
              'relative flex flex-1 items-center justify-center',
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
                  className="relative h-0 w-0"
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
    </ArcadeShell>
  );
}
