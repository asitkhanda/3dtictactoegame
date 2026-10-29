/**
 * Room invite links. The same link, https://www.twistedtac.com/join/ABC123, opens the iPhone,
 * iPad and Android apps when they are installed (universal links and Android App Links, see
 * public/.well-known) and this website otherwise. The custom scheme below is the manual
 * fallback for browsers that don't hand the link to an installed app on their own.
 */
export const APP_SCHEME = 'twistedtac';

const ROOM_CODE = /^[A-Z0-9]{6}$/;

/** The room code in upper case, or null if it isn't a six-character code. */
export function normalizeRoomCode(raw: string | undefined): string | null {
  const code = raw?.trim().toUpperCase() ?? '';
  return ROOM_CODE.test(code) ? code : null;
}

/** `twistedtac://join/ABC123`, which the native apps register, or null for a bad code. */
export function appInviteUrl(raw: string | undefined): string | null {
  const code = normalizeRoomCode(raw);
  return code ? `${APP_SCHEME}://join/${code}` : null;
}

/** Phones and tablets, where an installed app could take the link. */
export function isMobileBrowser(userAgent: string): boolean {
  return /Android|iPhone|iPad|iPod/i.test(userAgent);
}
