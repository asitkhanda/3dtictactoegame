import { describe, expect, it } from 'vitest';
import { exitActionFor, isUnfinished } from './matchExit';

describe('exitActionFor', () => {
  it('asks before cancelling a room nobody has joined', () => {
    expect(exitActionFor('waiting')).toBe('confirm-cancel');
  });

  it('asks before forfeiting a match in progress', () => {
    expect(exitActionFor('active')).toBe('confirm-forfeit');
  });

  it('leaves a finished or abandoned match without asking to forfeit it', () => {
    expect(exitActionFor('finished')).toBe('leave');
    expect(exitActionFor('abandoned')).toBe('leave');
  });
});

describe('isUnfinished', () => {
  it('is true only while a room is waiting or a match is being played', () => {
    expect(isUnfinished('waiting')).toBe(true);
    expect(isUnfinished('active')).toBe(true);
    expect(isUnfinished('finished')).toBe(false);
    expect(isUnfinished('abandoned')).toBe(false);
  });
});
