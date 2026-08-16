import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  applyMove,
  BoardState,
  createInitialState,
  hasLegalMoves,
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
import { useAiMove } from '../hooks/useAiMove';
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
  MousePointer2,
  Sparkles,
  Info,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { VersusScoreboard } from './game/GameHud';
import { GameOverOverlay, type GameOverOutcome } from './game/GameOverOverlay';
import { LayerWinStinger, type LayerWinEvent } from './game/LayerWinStinger';
import { playArcadeSound } from '../utils/arcadeSound';
import { useArcadeSound } from '../hooks/useArcadeSound';
import { cn } from '../lib/utils';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '../contexts/AuthContext';

const arcadeIconBtn =
  'size-8 shrink-0 rounded-full text-[var(--arcade-fg)]/80 hover:bg-white/10 hover:text-[var(--arcade-fg)]';

export function GameBoard() {
  const { user, profile, signInWithGoogle, isConfigured } = useAuth();
  const { muted, toggleMuted } = useArcadeSound();
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
  const [layerEvent, setLayerEvent] = useState<LayerWinEvent | null>(null);
  const [showGameOver, setShowGameOver] = useState(false);

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
  const { requestMove } = useAiMove();
  const cellOpacity = layerOpacityToCellAlpha(translucency);
  const { viewportRef, boardRef, resetView, setView, activePreset, zoomIn, zoomOut, rotateBy, viewportHandlers } =
    useBoardViewport({
      baseScale: boardScale,
      is3D: config?.is3D ?? false,
      enabled: !!config,
      rotationSensitivity: rotationMultiplier,
    });

  const applyInitialState = useCallback((forConfig: GameConfig) => {
    const state = createInitialState(forConfig);
    setBoard(state.board);
    setLayerWinners(state.layerWinners);
    setIsXNext(true);
    setWinner(null);
    setDraw(false);
    setCrossLayerWinningLine(null);
    setWinningLine(null);
    setLastMoveIndex(null);
    setLayerEvent(null);
    setShowGameOver(false);
  }, []);

  const resetGameState = useCallback(() => {
    if (!config) return;
    applyInitialState(config);
    resetView();
  }, [config, applyInitialState, resetView]);

  const exitToMenu = useCallback(() => {
    setSession(null);
    setShowGameOver(false);
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

      playArcadeSound(isXNext ? 'placeX' : 'placeO');

      // A layer claimed mid-game is the core mechanic — give it a stinger.
      if (!result.winner && !result.draw) {
        const claimedIndex = result.layerWinners.findIndex(
          (l, i) => l.winner && !layerWinners[i]?.winner
        );
        if (claimedIndex >= 0) {
          const claimedBy = result.layerWinners[claimedIndex].winner as 'X' | 'O';
          const claimant =
            gameMode === 'PVE' ? (claimedBy === 'X' ? 'YOURS' : "AI'S") : claimedBy;
          playArcadeSound(
            gameMode === 'PVE' && claimedBy === 'O' ? 'layerLost' : 'layerWin'
          );
          setLayerEvent({
            key: Date.now(),
            layerNumber: claimedIndex + 1,
            winner: claimedBy,
            claimant,
          });
        }
      }

      setBoard(result.board);
      setLayerWinners(result.layerWinners);
      setCrossLayerWinningLine(result.crossLayerWinningLine);
      setWinningLine(result.winningLine);
      setWinner(result.winner);
      setDraw(result.draw);
      setIsXNext(result.isXNext);
      setLastMoveIndex(index);
    },
    [config, board, layerWinners, isXNext, winner, draw, gameMode]
  );

  useEffect(() => {
    if (!layerEvent) return;
    const timer = setTimeout(() => setLayerEvent(null), 1400);
    return () => clearTimeout(timer);
  }, [layerEvent]);

  // Let the winning line land visually before the overlay takes the screen.
  useEffect(() => {
    if (!winner && !draw) return;
    const timer = setTimeout(() => setShowGameOver(true), winner ? 950 : 450);
    return () => clearTimeout(timer);
  }, [winner, draw]);

  useEffect(() => {
    if (!config || gameMode !== 'PVE' || isXNext || winner || draw) return;

    const delay = config.size >= 6 ? 400 : 750;
    const timer = setTimeout(() => {
      void requestMove(config, board, layerWinners, 'O').then((moveIndex) => {
        if (moveIndex !== -1) makeMove(moveIndex);
        else if (!hasLegalMoves(config, board, layerWinners)) setDraw(true);
      }).catch(() => undefined);
    }, delay);

    return () => clearTimeout(timer);
  }, [config, gameMode, isXNext, winner, draw, board, layerWinners, makeMove, requestMove]);

  useEffect(() => {
    if (!config || winner || draw) return;
    // The board briefly belongs to a previous config while a new session is
    // initializing; a length mismatch would make every cell read as occupied.
    if (board.length !== config.cellCount) return;
    if (!hasLegalMoves(config, board, layerWinners)) {
      setDraw(true);
    }
  }, [config, board, layerWinners, winner, draw]);

  const handleCellClick = useCallback(
    (index: number) => {
      if (gameMode === 'PVE' && !isXNext) return;
      makeMove(index);
    },
    [gameMode, isXNext, makeMove]
  );

  const handleStart = (size: BoardSize, mode: GameMode) => {
    const nextConfig = createGameConfig(size, '3D');
    // Initialize the board in the same render batch as the session so no
    // effect ever observes the new config alongside a stale board.
    applyInitialState(nextConfig);
    setSession({ config: nextConfig, gameMode: mode });
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

  const overlayOutcome: GameOverOutcome = draw
    ? 'draw'
    : gameMode === 'PVE' && winner === 'O'
      ? 'lose'
      : 'win';
  const overlayAccent =
    !draw && gameMode === 'PVP' && winner === 'O' ? ('violet' as const) : undefined;
  const overlayTitle = draw
    ? 'STALEMATE'
    : gameMode === 'PVE'
      ? winner === 'X'
        ? 'YOU WIN'
        : 'AI WINS'
      : `${winner} TAKES IT`;
  const overlaySubtitle = draw
    ? 'The cube holds. Nobody cracked it.'
    : config.size === 1
      ? gameMode === 'PVE'
        ? winner === 'X'
          ? 'You conquered the void.'
          : 'The void consumed you.'
        : 'The void is claimed.'
      : crossLayerWinningLine
        ? 'A clean line straight through the stack.'
        : config.is3D
          ? `${config.matchWinThreshold} layers locked down.`
          : 'Line complete.';

  return (
    <ArcadeShell variant="gameplay">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {statusMessage}
      </div>

      <header className="sticky top-0 z-50 shrink-0 px-3 py-2 sm:px-4">
        <div className="mx-auto w-full max-w-5xl px-1">
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

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={arcadeIconBtn}
                  onClick={toggleMuted}
                  aria-label={muted ? 'Unmute sound' : 'Mute sound'}
                >
                  {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{muted ? 'Sound off' : 'Sound on'}</TooltipContent>
            </Tooltip>

            <ThemeToggle className={arcadeIconBtn} />
          </div>

          <div className="mt-1.5 flex items-start gap-2 border-t border-white/10 pt-1.5 dark:border-white/10">
            <button
              type="button"
              onClick={() => setRulesOpen((open) => !open)}
              className="font-body flex shrink-0 items-center gap-1 rounded-lg px-1.5 py-0.5 text-xs text-[var(--arcade-fg)]/80 transition-colors hover:bg-white/5 hover:text-[var(--arcade-fg)]"
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

      <main className="relative flex min-h-0 flex-1 flex-col items-center overflow-auto px-3 py-2 sm:px-4">
        <VersusScoreboard
          className="z-20 mt-0.5 shrink-0"
          xLabel={gameMode === 'PVE' ? 'You' : 'X'}
          oLabel={gameMode === 'PVE' ? 'AI' : 'O'}
          xScore={xScore}
          oScore={oScore}
          threshold={showLayerScore ? config.matchWinThreshold : 0}
          xActive={isXActive}
          oActive={isOActive}
          thinking={gameMode === 'PVE' && isGameActive && !isXNext}
          thinkingSide="o"
        />

        {!winner && !draw && (config.is3D || showZoomControls) && (
          <p className="font-body pointer-events-none mt-2 flex shrink-0 items-center gap-1.5 text-xs whitespace-nowrap arcade-text-muted">
            <MousePointer2 className="size-3.5 shrink-0" aria-hidden />
            {config.is3D
              ? showCameraJoystick
                ? 'Drag to rotate · Scroll to zoom'
                : 'Drag to rotate · Pinch to zoom'
              : isMobile
                ? 'Pinch or panel buttons to zoom'
                : 'Scroll or panel buttons to zoom'}
          </p>
        )}

        <div className="relative flex min-h-0 flex-1 items-center justify-center self-stretch">
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
              'relative flex flex-1 touch-none items-center justify-center self-stretch',
              config.is3D && 'cursor-grab active:cursor-grabbing'
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
                      pieceStackCount={
                        isMobile
                          ? Math.min(4, config.visual.pieceStackCount)
                          : config.visual.pieceStackCount
                      }
                      lowPerf={isMobile}
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

      <LayerWinStinger event={layerEvent} />

      {showGameOver && (winner || draw) && (
        <GameOverOverlay
          outcome={overlayOutcome}
          accent={overlayAccent}
          title={overlayTitle}
          subtitle={overlaySubtitle}
          casual
          primaryLabel="Play again"
          onPrimary={resetGameState}
          secondaryLabel="Change mode"
          onSecondary={exitToMenu}
          footer={
            isConfigured && !user ? (
              <button
                type="button"
                onClick={() => void signInWithGoogle()}
                className="font-body text-sm text-white/60 underline-offset-4 transition-colors hover:text-white hover:underline"
              >
                Sign in to play ranked online
              </button>
            ) : undefined
          }
        />
      )}
    </ArcadeShell>
  );
}
