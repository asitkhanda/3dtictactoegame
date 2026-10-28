export const SITE_URL = 'https://twistedtac.com';
export const SUPPORT_EMAIL = 'contact@refrakted.com';

/**
 * Public TestFlight link for the iOS beta. Leave null until an external
 * TestFlight group has a public link; the site then offers "request access"
 * by email instead. Setting this one value switches every beta call to action.
 */
export const IOS_BETA_URL: string | null = null;

export interface BetaCta {
  label: string;
  href: string;
  external: boolean;
}

export function getIosBetaCta(
  betaUrl: string | null = IOS_BETA_URL,
  email: string = SUPPORT_EMAIL
): BetaCta {
  if (betaUrl) {
    return { label: 'Join the beta on TestFlight', href: betaUrl, external: true };
  }
  const subject = encodeURIComponent('Twisted Tac iOS beta access');
  const body = encodeURIComponent(
    'Hi! I would like to try the Twisted Tac iOS beta.\n\nMy Apple ID email (used for TestFlight):\n'
  );
  return {
    label: 'Request beta access',
    href: `mailto:${email}?subject=${subject}&body=${body}`,
    external: false,
  };
}
