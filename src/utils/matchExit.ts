import type { MatchRow } from '../types/database';

type MatchStatus = MatchRow['status'];

/** What leaving a match page should do, given where the match stands. */
export type ExitAction = 'leave' | 'confirm-cancel' | 'confirm-forfeit';

/**
 * Only a match that is still going can be forfeited, and only a room nobody has joined can be
 * cancelled. A finished or abandoned match has nothing left to give up, so leaving is just leaving.
 */
export function exitActionFor(status: MatchStatus): ExitAction {
  if (status === 'waiting') return 'confirm-cancel';
  if (status === 'active') return 'confirm-forfeit';
  return 'leave';
}

/** A match worth offering to resume or cancel: one that is still waiting or being played. */
export function isUnfinished(status: MatchStatus): boolean {
  return status === 'waiting' || status === 'active';
}
