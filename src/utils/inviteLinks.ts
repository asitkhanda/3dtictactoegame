/**
 * Room invite links. The same link, https://www.twistedtac.com/join/ABC123, opens the iPhone,
 * iPad and Android apps when they are installed (universal links and Android App Links, see
 * public/.well-known) and this website otherwise. The custom scheme below is the manual
 * fallback for browsers that don't hand the link to an installed app on their own.
 */
export const APP_SCHEME = 'twistedtac';
export const ANDROID_PACKAGE = 'com.twistedtac.app';

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

export function isAndroidBrowser(userAgent: string): boolean {
  return /Android/i.test(userAgent);
}

/**
 * An Android `intent:` link: Chrome and most browsers launch the app if it is installed and
 * otherwise go to [fallbackUrl]. More dependable than the bare custom scheme, which some
 * browsers and in-app web views ignore. Needs a tap; browsers block it as an automatic redirect.
 */
export function androidIntentUrl(raw: string | undefined, fallbackUrl: string): string | null {
  const code = normalizeRoomCode(raw);
  if (!code) return null;
  return (
    `intent://join/${code}#Intent;scheme=${APP_SCHEME};package=${ANDROID_PACKAGE};` +
    `S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end`
  );
}

/**
 * The link behind the "Open in the app" button: an intent link on Android, the custom scheme
 * on iPhone and iPad, and nothing on desktops. [fallbackUrl] is where Android sends people
 * whose phone doesn't have the app.
 */
export function openInAppUrl(
  raw: string | undefined,
  userAgent: string,
  fallbackUrl: string
): string | null {
  if (!isMobileBrowser(userAgent)) return null;
  return isAndroidBrowser(userAgent) ? androidIntentUrl(raw, fallbackUrl) : appInviteUrl(raw);
}
