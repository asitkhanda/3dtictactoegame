import { Routes, Route } from 'react-router-dom';
import { GameBoard } from '../components/GameBoard';
import { LeaderboardPage } from '../pages/LeaderboardPage';
import { ProfilePage } from '../pages/ProfilePage';
import { OnlineGamePage } from '../pages/OnlineGamePage';
import { JoinMatchPage } from '../pages/JoinMatchPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<GameBoard />} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/play/:matchId" element={<OnlineGamePage />} />
      <Route path="/join/:code" element={<JoinMatchPage />} />
    </Routes>
  );
}
