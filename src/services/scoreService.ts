import type { GameMode } from '../utils/gameConfig';

export type GameOutcome = 'win' | 'loss' | 'draw';

/**
 * Rank points are only awarded for online matches against real opponents.
 * Local play (vs AI and pass-and-play) is deliberately unscored — otherwise
 * the leaderboard just measures who farmed the bot the longest.
 *
 * Online results are written server-side by the submit-move edge function and
 * forfeit_match; this is only used to show the player what they earned.
 */
export function getPointsForOutcome(mode: GameMode, outcome: GameOutcome): number {
  if (mode !== 'PVP_ONLINE') return 0;
  if (outcome === 'win') return 25;
  if (outcome === 'draw') return 5;
  return -5;
}

/** True when a mode contributes to profile stats and the leaderboard. */
export function isRankedMode(mode: GameMode): boolean {
  return mode === 'PVP_ONLINE';
}
