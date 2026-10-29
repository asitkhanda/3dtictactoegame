import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Play } from 'lucide-react';
import { toast } from 'sonner';
import { forfeitMatch, getActiveMatchForUser } from '../../services/matchService';
import { useAuth } from '../../contexts/AuthContext';
import type { MatchRow } from '../../types/database';
import { isUnfinished } from '../../utils/matchExit';
import { Button } from '../ui/button';

/**
 * Offers to resume the player's newest unfinished match, or to cancel a room that is still
 * waiting for an opponent so it doesn't linger.
 */
export function ResumeGameBanner() {
  const navigate = useNavigate();
  const { user, profile, isConfigured } = useAuth();
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!isConfigured || !user || !profile?.username) return;
    let cancelled = false;
    void getActiveMatchForUser().then(({ match: found }) => {
      if (!cancelled) setMatch(found && isUnfinished(found.status) ? found : null);
    });
    return () => {
      cancelled = true;
    };
  }, [user, profile?.username, isConfigured]);

  if (!match) return null;

  const waiting = match.status === 'waiting';

  const cancelRoom = async () => {
    setCancelling(true);
    const { error } = await forfeitMatch(match.id);
    setCancelling(false);
    if (error) {
      toast.error(error);
      return;
    }
    setMatch(null);
  };

  return (
    <div className="arcade-glass mb-4 flex flex-col items-start justify-between gap-3 rounded-2xl p-4 sm:flex-row sm:items-center">
      <div>
        <p className="font-display text-sm font-bold text-white">
          {waiting ? `Open room ${match.room_code}` : 'Active online match'}
        </p>
        <p className="font-body text-xs arcade-text-muted">
          {waiting ? 'Still waiting for an opponent.' : 'Resume where you left off.'}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {waiting && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="font-body"
            disabled={cancelling}
            onClick={() => void cancelRoom()}
          >
            {cancelling ? <Loader2 className="size-4 animate-spin" /> : 'Cancel room'}
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          className="font-body"
          onClick={() => navigate(`/play/${match.id}`)}
        >
          <Play className="size-4" />
          {waiting ? 'Resume' : 'Resume game'}
        </Button>
      </div>
    </div>
  );
}
