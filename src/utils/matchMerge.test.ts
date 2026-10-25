import { describe, expect, it } from 'vitest';
import type { MatchRow } from '../types/database';
import { mergeMatch } from './matchMerge';

function row(overrides: Partial<MatchRow> = {}): MatchRow {
  return {
    id: 'm1',
    room_code: 'ABC234',
    host_id: 'h',
    guest_id: 'g',
    status: 'active',
    config: { size: 3, viewMode: '3D' },
    board: Array(27).fill(null),
    layer_winners: [],
    is_x_next: true,
    host_plays_x: true,
    winner: null,
    draw: false,
    current_turn_user_id: 'h',
    host_disconnected_at: null,
    guest_disconnected_at: null,
    host_last_seen_at: null,
    guest_last_seen_at: null,
    abandon_reason: null,
    created_at: '',
    updated_at: '',
    revision: 1,
    ...overrides,
  };
}

describe('mergeMatch', () => {
  it('takes a higher revision wholesale', () => {
    const next = row({ revision: 2, status: 'finished' });
    expect(mergeMatch(row(), next)).toBe(next);
  });

  it('ignores a stale revision', () => {
    const current = row({ revision: 3 });
    expect(mergeMatch(current, row({ revision: 2, guest_disconnected_at: 'x' }))).toBe(current);
  });

  it('applies a same-revision disconnect without touching the board', () => {
    const board = Array(27).fill(null);
    board[4] = 'X';
    const current = row({ board });
    const merged = mergeMatch(current, row({ guest_disconnected_at: '2026-01-01T00:00:00Z' }));
    expect(merged?.guest_disconnected_at).toBe('2026-01-01T00:00:00Z');
    expect(merged?.board).toBe(board);
  });

  it('keeps the same object when nothing changed', () => {
    const current = row();
    expect(mergeMatch(current, row())).toBe(current);
  });

  it('adopts a different match outright', () => {
    const next = row({ id: 'm2' });
    expect(mergeMatch(row(), next)).toBe(next);
  });
});
