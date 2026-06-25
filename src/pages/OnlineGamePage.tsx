import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Loader2, WifiOff } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { useAuth } from '../contexts/AuthContext';
import { useMatch } from '../hooks/useMatch';
import { submitMatchMove, getInviteLink } from '../services/matchService';
import { deserializeGameConfig } from '../utils/configSerialize';
import { getBoardTitle, getRulesPreview } from '../utils/gameConfig';
import type { BoardState, LayerResult } from '../utils/gameLogic';
import { ArcadeShell } from '../components/ArcadeShell';
import { BoardLayer } from '../components/BoardLayer';
import { BoardCameraJoystick } from '../components/BoardCameraJoystick';
import { useBoardScale } from '../hooks/useBoardScale';
import { useBoardViewport } from '../hooks/useBoardViewport';
import { useRotationSensitivity } from '../hooks/useRotationSensitivity';
import { useBoardTranslucency } from '../hooks/useBoardTranslucency';
import { layerOpacityToCellAlpha } from '../utils/boardTranslucency';
import { useIsMobile } from '../components/ui/use-mobile';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';

export function OnlineGamePage() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { match, connectionStatus, opponentDisconnected, error } = useMatch(matchId, user?.id);
  const [submitting, setSubmitting] = useState(false);
  const [lastMoveIndex, setLastMoveIndex] = useState<number | null>(null);

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
    match && user
      ? user.id === match.host_id
        ? match.host_plays_x
          ? 'X'
          : 'O'
        : match.host_plays_x
          ? 'O'
          : 'X'
      : null;

  const isMyTurn = Boolean(match && user && match.current_turn_user_id === user.id);

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

  const { viewportRef, boardRef, resetView, setView, activePreset, zoomIn, zoomOut, rotateBy, viewportHandlers } =
    useBoardViewport({
      baseScale: boardScale,
      is3D: config?.is3D ?? false,
      enabled: !!config,
      rotationSensitivity: rotationMultiplier,
    });

  const handleCellClick = useCallback(
    async (index: number) => {
      if (!matchId || !isMyTurn || !isGameActive || connectionStatus !== 'synced' || submitting) return;

      setSubmitting(true);
      const { error: moveError } = await submitMatchMove(matchId, index);
      setSubmitting(false);

      if (moveError) {
        toast.error(moveError);
        return;
      }
      setLastMoveIndex(index);
    },
    [matchId, isMyTurn, isGameActive, connectionStatus, submitting]
  );

  const isLayerDisabled = (layerIndex: number) =>
    !isMyTurn ||
    !isGameActive ||
    connectionStatus !== 'synced' ||
    submitting ||
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
          <Link to="/" className="font-body mt-4 inline-block text-sm underline">Back home</Link>
        </main>
      </ArcadeShell>
    );
  }

  if (error || !match || !config) {
    return (
      <ArcadeShell variant="landing">
        <main className="mx-auto max-w-md px-4 pt-24 text-center">
          <p className="font-body text-destructive">{error ?? 'Match not found'}</p>
          <Link to="/" className="font-body mt-4 inline-block text-sm underline">Back home</Link>
        </main>
      </ArcadeShell>
    );
  }

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
          <Button type="button" variant="ghost" className="font-body" onClick={() => navigate('/')}>
            Back to menu
          </Button>
        </main>
      </ArcadeShell>
    );
  }

  const boardTitle = getBoardTitle(config);
  const rulesHint = getRulesPreview(config);
  const statusMessage = draw
    ? 'Draw'
    : winner
      ? `${winner} wins`
      : isMyTurn
        ? 'Your turn'
        : "Opponent's turn";

  return (
    <ArcadeShell variant="gameplay">
      <header className="sticky top-0 z-50 shrink-0 px-3 py-2 sm:px-4">
        <div className="arcade-panel mx-auto w-full max-w-3xl rounded-2xl px-2 py-1.5 sm:px-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="size-8" onClick={() => navigate('/')}>
              <ArrowLeft className="size-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="font-display truncate text-sm font-bold sm:text-base">{boardTitle}</h1>
              <p className="font-body text-xs arcade-text-muted">Online · You are {mySymbol}</p>
            </div>
            <span
              className={cn(
                'font-body rounded-full px-2 py-0.5 text-xs font-semibold',
                isMyTurn ? 'bg-[var(--neon-lime)]/15 text-[var(--neon-lime)]' : 'arcade-text-muted'
              )}
            >
              {statusMessage}
            </span>
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
        <div className="relative flex flex-1 items-center justify-center">
          <div
            ref={viewportRef}
            className={cn(
              'relative flex flex-1 items-center justify-center',
              config.is3D && 'touch-none cursor-grab active:cursor-grabbing'
            )}
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
                    pieceStackCount={config.visual.pieceStackCount}
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
    </ArcadeShell>
  );
}
