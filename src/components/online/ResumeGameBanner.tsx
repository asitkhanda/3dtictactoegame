import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import { getActiveMatchForUser } from '../../services/matchService';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';

export function ResumeGameBanner() {
  const navigate = useNavigate();
  const { user, profile, isConfigured } = useAuth();
  const [matchId, setMatchId] = useState<string | null>(null);

  useEffect(() => {
    if (!isConfigured || !user || !profile?.username) return;
    void getActiveMatchForUser().then(({ match }) => {
      if (match) setMatchId(match.id);
    });
  }, [user, profile?.username, isConfigured]);

  if (!matchId) return null;

  return (
    <div className="arcade-glass mb-4 flex flex-col items-start justify-between gap-3 rounded-2xl p-4 sm:flex-row sm:items-center">
      <div>
        <p className="font-display text-sm font-bold text-white">Active online match</p>
        <p className="font-body text-xs arcade-text-muted">Resume where you left off.</p>
      </div>
      <Button
        type="button"
        size="sm"
        className="font-body"
        onClick={() => navigate(`/play/${matchId}`)}
      >
        <Play className="size-4" />
        Resume game
      </Button>
    </div>
  );
}
