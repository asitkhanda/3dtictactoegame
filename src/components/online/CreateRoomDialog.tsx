import { useState } from 'react';
import { Copy, Globe, Loader2 } from 'lucide-react';
import { BoardSize } from '../../utils/gameConfig';
import { createMatch, getInviteLink } from '../../services/matchService';
import { useAuth } from '../../contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { toast } from 'sonner@2.0.3';

interface CreateRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardSize: BoardSize;
  onCreated: (matchId: string) => void;
}

export function CreateRoomDialog({
  open,
  onOpenChange,
  boardSize,
  onCreated,
}: CreateRoomDialogProps) {
  const { user, profile, signInWithGoogle, needsUsername } = useAuth();
  const [loading, setLoading] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!user) {
      await signInWithGoogle();
      return;
    }
    if (needsUsername) {
      toast.error('Pick a username first.');
      return;
    }

    setLoading(true);
    const { match, error } = await createMatch(boardSize);
    setLoading(false);

    if (error || !match) {
      toast.error(error ?? 'Failed to create room');
      return;
    }

    setRoomCode(match.room_code);
    setMatchId(match.id);
  };

  const copyLink = async () => {
    if (!roomCode) return;
    await navigator.clipboard.writeText(getInviteLink(roomCode));
    toast.success('Invite link copied');
  };

  const enterRoom = () => {
    if (matchId) {
      onCreated(matchId);
      onOpenChange(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setRoomCode(null);
          setMatchId(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="arcade-glass sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Play online</DialogTitle>
          <DialogDescription className="font-body arcade-text-muted">
            Create a room and share the code with a friend.
          </DialogDescription>
        </DialogHeader>

        {!roomCode ? (
          <Button type="button" className="font-body w-full" disabled={loading} onClick={() => void handleCreate()}>
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Creating…
              </>
            ) : !user ? (
              'Sign in to create room'
            ) : (
              'Create room'
            )}
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
              <p className="font-body mb-1 text-xs arcade-text-muted uppercase tracking-wider">Room code</p>
              <p className="font-display text-3xl font-bold tracking-[0.3em]">{roomCode}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" className="font-body flex-1 arcade-glass" onClick={() => void copyLink()}>
                <Copy className="size-4" />
                Copy link
              </Button>
              <Button type="button" className="font-body flex-1" onClick={enterRoom}>
                <Globe className="size-4" />
                Enter room
              </Button>
            </div>
            <p className="font-body text-center text-xs arcade-text-muted">
              Waiting for opponent… Room expires after 10 minutes.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
