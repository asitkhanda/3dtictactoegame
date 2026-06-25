import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { joinMatchByCode } from '../../services/matchService';
import { useAuth } from '../../contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner@2.0.3';

interface JoinRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoined: (matchId: string) => void;
}

export function JoinRoomDialog({ open, onOpenChange, onJoined }: JoinRoomDialogProps) {
  const { user, signInWithGoogle, needsUsername } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!user) {
      await signInWithGoogle();
      return;
    }
    if (needsUsername) {
      toast.error('Pick a username first.');
      return;
    }
    if (!code.trim()) return;

    setLoading(true);
    const { match, error } = await joinMatchByCode(code);
    setLoading(false);

    if (error || !match) {
      toast.error(error ?? 'Could not join room');
      return;
    }

    onJoined(match.id);
    onOpenChange(false);
    setCode('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="arcade-glass sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Join room</DialogTitle>
          <DialogDescription className="font-body arcade-text-muted">
            Enter the 6-character room code from your friend.
          </DialogDescription>
        </DialogHeader>

        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
          placeholder="ABC123"
          className="font-display text-center text-lg tracking-[0.3em]"
          maxLength={6}
        />

        <Button type="button" className="font-body w-full" disabled={loading || code.length < 6} onClick={() => void handleJoin()}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Joining…
            </>
          ) : !user ? (
            'Sign in to join'
          ) : (
            'Join room'
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
