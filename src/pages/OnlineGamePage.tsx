import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Loader2, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useMatch } from '../hooks/useMatch';
import {
  submitMatchMove,
  getInviteLink,
  getOpponentProfile,
  forfeitMatch,
  getSymbolForUser,
  getUserIdForSymbol,
} from '../services/matchService';
import { deserializeGameConfig } from '../utils/configSerialize';
import { getBoardTitle, getRulesPreview } from '../utils/gameConfig';
import { applyMove, type BoardState, type LayerResult } from '../utils/gameLogic';
import type { MatchRow } from '../types/database';
import { ArcadeShell } from '../components/ArcadeShell';
import { BoardLayer } from '../components/BoardLayer';
import { BoardCameraJoystick } from '../components/BoardCameraJoystick';
import { PlayerScore, TurnBadge } from '../components/game/GameHud';
import { useBoardScale } from '../hooks/useBoardScale';
import { useBoardViewport } from '../hooks/useBoardViewport';
import { useRotationSensitivity } from '../hooks/useRotationSensitivity';
import { useBoardTranslucency } from '../hooks/useBoardTranslucency';
import { layerOpacityToCellAlpha } from '../utils/boardTranslucency';
import { useIsMobile } from '../components/ui/use-mobile';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { cn } from '../lib/utils';

export function OnlineGamePage() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { match, connectionStatus, opponentDisconnected, error, refresh, applyMatch } = useMatch(
    matchId,
    user?.id
  );
  const [pendingMoveIndex, setPendingMoveIndex] = useState<number | null>(null);
  const [lastMoveIndex, setLastMoveIndex] = useState<number | null>(null);
  const [opponentLabel, setOpponentLabel] = useState('Opponent');
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [forfeiting, setForfeiting] = useState(false);
  const prevBoardRef = useRef<BoardState | null>(null);
  const forfeitInitiatedRef = useRef(false);
  const forfeitToastShownRef = useRef(false);

  const config = useMemo(
    () => (match ? deserializeGameConfig(match.config) : null),
    [match]
  );

  const board = (match?.board ?? []) as BoardState;
  const layerWinners = (match?.layer_winners ?? []) as LayerResult[];
  const isXNext = match?.is_x_next ?? true;
  const winner = match?.winner ?? null;
  const draw = match?.draw ?? false;
  const isGameActive = match?.status === 'active' && !winner && !draw;

  const mySymbol =
    match && user ? getSymbolForUser(match, user.id) : null;

  const isMyTurn = Boolean(match && user && match.current_turn_user_id === user.id);

  const opponentId =
    match && user
      ? user.id === match.host_id
        ? match.guest_id
        : match.host_id
      : null;

  useEffect(() => {
    if (!opponentId) return;
    void getOpponentProfile(opponentId).then(({ profile: opponentProfile }) => {
      if (opponentProfile?.username) {
        setOpponentLabel(opponentProfile.username);
      }
    });
  }, [opponentId]);

  useEffect(() => {
    if (!match?.board) return;

    const prev = prevBoardRef.current;
    if (prev && prev.length === match.board.length) {
      for (let i = 0; i < match.board.length; i++) {
        if (prev[i] === null && match.board[i] !== null) {
          setLastMoveIndex(i);
          break;
        }
      }
    }
    prevBoardRef.current = match.board as BoardState;
  }, [match?.board]);

  useEffect(() => {
    if (lastMoveIndex === null) return;
    const timer = setTimeout(() => setLastMoveIndex(null), 1500);
    return () => clearTimeout(timer);
  }, [lastMoveIndex]);

  useEffect(() => {
    if (
      !match ||
      !user ||
      match.status !== 'finished' ||
      match.abandon_reason !== 'voluntary_forfeit' ||
      forfeitInitiatedRef.current ||
      forfeitToastShownRef.current
    ) {
      return;
    }

    const mySym = getSymbolForUser(match, user.id);
    if (match.winner === mySym) {
      forfeitToastShownRef.current = true;
      toast.success('Opponent forfeited — you win!');
    }
  }, [match, user]);

  const boardScale = useBoardScale({
    boardPx: config?.visual.boardPx ?? 300,
    is3D: config?.is3D ?? false,
    layerCount: config?.layerCount ?? 1,
    layerSpacing: config?.visual.layerSpacing ?? 100,
    hudHeight: 80,
  });

  const isMobile = useIsMobile();
  const showCameraJoystick = config?.is3D && !isMobile;
  const { sensitivity, setSensitivity, rotationMultiplier } = useRotationSensitivity();
  const { translucency, setTranslucency } = useBoardTranslucency();
  const cellOpacity = layerOpacityToCellAlpha(translucency);

  const { viewportRef, boardRef, setView, activePreset, zoomIn, zoomOut, rotateBy, viewportHandlers } =
    useBoardViewport({
      baseScale: boardScale,
      is3D: config?.is3D ?? false,
      enabled: !!config,
      rotationSensitivity: rotationMultiplier,
    });

  const buildOptimisticMatch = useCallback(
    (current: MatchRow, index: number): MatchRow | null => {
      if (!config) return null;
      const result = applyMove(config, board, layerWinners, index, isXNext);
      if (!result) return null;

      const finished = Boolean(result.winner || result.draw);
      const nextTurnUserId = finished
        ? null
        : result.isXNext
          ? getUserIdForSymbol(current, 'X')
          : getUserIdForSymbol(current, 'O');

      return {
        ...current,
        board: result.board,
        layer_winners: result.layerWinners,
        is_x_next: result.isXNext,
        winner: result.winner,
        draw: result.draw,
        status: finished ? 'finished' : 'active',
        current_turn_user_id: nextTurnUserId,
      };
    },
    [config, board, layerWinners, isXNext]
  );

  const handleCellClick = useCallback(
    async (index: number) => {
      if (!matchId || !match || !config || !isMyTurn || !isGameActive || pendingMoveIndex !== null) {
        return;
      }

      const optimistic = buildOptimisticMatch(match, index);
      if (!optimistic) return;

      setPendingMoveIndex(index);
      setLastMoveIndex(index);
      applyMatch(optimistic);

      const { match: serverMatch, error: moveError } = await submitMatchMove(matchId, index);
      setPendingMoveIndex(null);

      if (moveError) {
        toast.error(moveError);
        setLastMoveIndex(null);
        void refresh();
        return;
      }

      if (serverMatch) {
        applyMatch(serverMatch);
      }
    },
    [
      matchId,
      match,
      config,
      isMyTurn,
      isGameActive,
      pendingMoveIndex,
      buildOptimisticMatch,
      applyMatch,
      refresh,
    ]
  );

  const handleForfeit = useCallback(async () => {
    if (!matchId) return;
    setForfeiting(true);
    forfeitInitiatedRef.current = true;
    const { error: forfeitError } = await forfeitMatch(matchId);
    setForfeiting(false);
    setExitDialogOpen(false);

    if (forfeitError) {
      forfeitInitiatedRef.current = false;
      toast.error(forfeitError);
      return;
    }

    navigate('/');
  }, [matchId, navigate]);

  const isLayerDisabled = (layerIndex: number) =>
    !isMyTurn ||
    !isGameActive ||
    pendingMoveIndex !== null ||
    !!layerWinners[layerIndex]?.winner;

  if (authLoading) {
    return (
      <ArcadeShell variant="gameplay">
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-8 animate-spin arcade-text-muted" />
        </div>
      </ArcadeShell>
    );
  }

  if (!user || !profile?.username) {
    return (
      <ArcadeShell variant="landing">
        <main className="mx-auto max-w-md px-4 pt-24 text-center">
          <p className="font-body arcade-text-muted">Sign in and pick a username to play online.</p>
          <Link to="/" className="font-body mt-4 inline-block text-sm underline">
            Back home
          </Link>
        </main>
      </ArcadeShell>
    );
  }

  if (error || !match || !config) {
    return (
      <ArcadeShell variant="landing">
        <main className="mx-auto max-w-md px-4 pt-24 text-center">
          <p className="font-body text-destructive">{error ?? 'Match not found'}</p>
          <Link to="/" className="font-body mt-4 inline-block text-sm underline">
            Back home
          </Link>
        </main>
      </ArcadeShell>
    );
  }

  const exitDialogTitle =
    match.status === 'waiting'
      ? match.host_id === user.id
        ? 'Cancel room?'
        : 'Leave room?'
      : 'Forfeit match?';

  const exitDialogDescription =
    match.status === 'waiting'
      ? 'This will end the room. You will not be able to resume this match.'
      : 'Your opponent will win. This match cannot be resumed.';

  if (match.status === 'waiting') {
    const isHost = user.id === match.host_id;
    return (
      <ArcadeShell variant="landing">
        <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 pt-24 pb-10 text-center">
          <h1 className="font-display text-2xl font-bold text-white">Waiting for opponent</h1>
          <p className="font-body text-sm arcade-text-muted">
            {isHost ? 'Share this code or link with a friend.' : 'The host is setting up the room.'}
          </p>
          <div className="arcade-glass w-full rounded-2xl p-5">
            <p className="font-display text-3xl font-bold tracking-[0.3em]">{match.room_code}</p>
            {isHost && (
              <Button
                type="button"
                variant="outline"
                className="font-body mt-4 arcade-glass"
                onClick={() => {
                  void navigator.clipboard.writeText(getInviteLink(match.room_code));
                  toast.success('Invite link copied');
                }}
              >
                <Copy className="size-4" />
                Copy invite link
              </Button>
            )}
          </div>
          <p className="font-body text-xs arcade-text-muted">Room expires after 10 minutes without a guest.</p>
          <Button type="button" variant="ghost" className="font-body" onClick={() => setExitDialogOpen(true)}>
            <ArrowLeft className="size-4" />
            Exit
          </Button>
        </main>

        <Dialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{exitDialogTitle}</DialogTitle>
              <DialogDescription>{exitDialogDescription}</DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setExitDialogOpen(false)} disabled={forfeiting}>
                Stay
              </Button>
              <Button type="button" variant="destructive" onClick={() => void handleForfeit()} disabled={forfeiting}>
                {forfeiting ? <Loader2 className="size-4 animate-spin" /> : 'Exit'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </ArcadeShell>
    );
  }

  const boardTitle = getBoardTitle(config);
  const rulesHint = getRulesPreview(config);
  const xScore = layerWinners.filter((l) => l.winner === 'X').length;
  const oScore = layerWinners.filter((l) => l.winner === 'O').length;
  const showLayerScore = config.is3D && config.size > 1;
  const isXActive = winner === 'X' || (isGameActive && isXNext);
  const isOActive = winner === 'O' || (isGameActive && !isXNext);
  const xLabel = mySymbol === 'X' ? 'You' : opponentLabel;
  const oLabel = mySymbol === 'O' ? 'You' : opponentLabel;

  const statusMessage = draw
    ? 'Game ended in a draw.'
    : winner
      ? match.abandon_reason === 'voluntary_forfeit'
        ? winner === mySymbol
          ? 'Opponent forfeited — you win!'
          : 'You forfeited.'
        : `${winner} wins.`
      : isMyTurn
        ? 'Your turn.'
        : "Opponent's turn.";

  return (
    <ArcadeShell variant="gameplay">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {statusMessage}
      </div>

      <header className="sticky top-0 z-50 shrink-0 px-3 py-2 sm:px-4">
        <div className="arcade-panel mx-auto w-full max-w-3xl rounded-2xl px-2 py-1.5 sm:px-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="size-8" onClick={() => setExitDialogOpen(true)}>
              <ArrowLeft className="size-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="font-display truncate text-sm font-bold sm:text-base">{boardTitle}</h1>
              <p className="font-body text-xs arcade-text-muted">Online · You are {mySymbol}</p>
            </div>

            {showLayerScore ? (
              <div className="flex shrink-0 items-center gap-1.5">
                <PlayerScore
                  label={xLabel}
                  score={xScore}
                  threshold={config.matchWinThreshold}
                  active={isXActive}
                  tone="x"
                />
                <span className="font-mono text-xs arcade-text-muted">vs</span>
                <PlayerScore
                  label={oLabel}
                  score={oScore}
                  threshold={config.matchWinThreshold}
                  active={isOActive}
                  tone="o"
                />
              </div>
            ) : (
              <TurnBadge
                active={isMyTurn}
                label={isMyTurn ? 'Your turn' : 'Opponent…'}
              />
            )}
          </div>

          {(connectionStatus === 'reconnecting' || opponentDisconnected) && (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs arcade-text-muted">
              <WifiOff className="size-3.5 shrink-0" />
              {connectionStatus === 'reconnecting'
                ? 'Reconnecting…'
                : 'Opponent disconnected — waiting to reconnect…'}
            </div>
          )}

          <p className="font-body mt-1.5 border-t border-white/10 pt-1.5 text-xs arcade-text-muted">{rulesHint}</p>
        </div>
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto px-3 py-2 sm:px-4">
        <div className="relative flex flex-1 items-center justify-center self-stretch">
          <div
            ref={viewportRef}
            className={cn(
              'relative flex flex-1 touch-none items-center justify-center self-stretch',
              config.is3D && 'cursor-grab active:cursor-grabbing'
            )}
            style={{ transformOrigin: 'center center' }}
            {...viewportHandlers}
          >
            <div
              className="flex items-center justify-center"
              style={{ perspective: config.size >= 6 ? '900px' : '1200px' }}
            >
              <div ref={boardRef} className="relative h-0 w-0" style={{ transformStyle: 'preserve-3d' }}>
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
                    onCellClick={(idx) => void handleCellClick(idx)}
                    winningLine={layerWinners[i]?.line}
                    disabled={isLayerDisabled(i)}
                    showLabel={config.layerCount > 1}
                    layerOpacity={translucency}
                    cellOpacity={cellOpacity}
                    lastMoveIndex={lastMoveIndex}
                  />
                ))}
              </div>
            </div>
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
      </main>

      <Dialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{exitDialogTitle}</DialogTitle>
            <DialogDescription>{exitDialogDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setExitDialogOpen(false)} disabled={forfeiting}>
              Stay
            </Button>
            <Button type="button" variant="destructive" onClick={() => void handleForfeit()} disabled={forfeiting}>
              {forfeiting ? <Loader2 className="size-4 animate-spin" /> : 'Forfeit & exit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ArcadeShell>
  );
}
