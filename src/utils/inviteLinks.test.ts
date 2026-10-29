import { describe, expect, it } from 'vitest';
import { appInviteUrl, isMobileBrowser, normalizeRoomCode } from './inviteLinks';

describe('normalizeRoomCode', () => {
  it('upper-cases and trims a valid code', () => {
    expect(normalizeRoomCode(' k7m2qx ')).toBe('K7M2QX');
  });

  it.each(['', 'SHORT', 'TOOLONGCODE', 'K7M2Q;', 'K7M 2QX'])('rejects %j', (value) => {
    expect(normalizeRoomCode(value)).toBeNull();
  });

  it('rejects a missing code', () => {
    expect(normalizeRoomCode(undefined)).toBeNull();
  });
});

describe('appInviteUrl', () => {
  it('builds the link the native apps register', () => {
    expect(appInviteUrl('k7m2qx')).toBe('twistedtac://join/K7M2QX');
  });

  it('gives nothing for a bad code', () => {
    expect(appInviteUrl('nope')).toBeNull();
  });
});

describe('isMobileBrowser', () => {
  it('recognises phones and tablets', () => {
    expect(isMobileBrowser('Mozilla/5.0 (Linux; Android 16; Pixel) Chrome/130 Mobile')).toBe(true);
    expect(isMobileBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X)')).toBe(true);
    expect(isMobileBrowser('Mozilla/5.0 (iPad; CPU OS 26_0 like Mac OS X)')).toBe(true);
  });

  it('leaves desktops alone', () => {
    expect(isMobileBrowser('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/130')).toBe(false);
    expect(isMobileBrowser('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/130')).toBe(false);
  });
});
