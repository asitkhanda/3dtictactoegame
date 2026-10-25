import type { MatchRow } from '../types/database';

/**
 * Decides which copy of a match the client should keep.
 *
 * Moves, joins and settlements bump `revision`, so a higher revision always
 * wins. Presence heartbeats deliberately do not (a bump would invalidate
 * in-flight moves), so at the same revision only the presence fields are
 * taken from the incoming row — the board stays as the client has it.
 */
export function mergeMatch(current: MatchRow | null, next: MatchRow | null): MatchRow | null {
  if (!next) return current;
  if (!current || current.id !== next.id) return next;
  if (next.revision > current.revision) return next;
  if (next.revision < current.revision) return current;

  if (
    current.host_disconnected_at === next.host_disconnected_at &&
    current.guest_disconnected_at === next.guest_disconnected_at
  ) {
    return current;
  }
  return {
    ...current,
    host_disconnected_at: next.host_disconnected_at,
    guest_disconnected_at: next.guest_disconnected_at,
    host_last_seen_at: next.host_last_seen_at,
    guest_last_seen_at: next.guest_last_seen_at,
  };
}
