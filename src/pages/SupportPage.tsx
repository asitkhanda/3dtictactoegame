import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LegalPageLayout } from '../components/legal/LegalPageLayout';
import { SUPPORT_EMAIL, getIosBetaCta } from '../config/app';

const LAST_UPDATED = 'October 25, 2026';

export function SupportPage() {
  const betaCta = getIosBetaCta();
  const { hash } = useLocation();

  // React Router doesn't scroll to #anchors on its own.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [hash]);

  return (
    <LegalPageLayout title="Support" lastUpdated={LAST_UPDATED}>
      <p>
        Need help with Twisted Tac on the web or on iPhone and iPad? Email us at{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and include what device or browser
        you are using, what you expected to happen, and what happened instead. We aim to reply
        within a few days.
      </p>

      <h2>Common questions</h2>

      <h3>How do I win?</h3>
      <p>
        On the classic 3×3×3 board, complete a row, column or diagonal on a single layer to claim
        that layer. A claimed layer locks, and claiming two of three layers wins the match. You can
        also win on the spot by connecting three marks straight through the stack or along a space
        diagonal. If no legal moves remain and nobody has won, the game is a draw.
      </p>

      <h3>Do I need an account?</h3>
      <p>
        No. Playing against the AI and local two-player mode never need an account. An account is
        only required for online matches, your profile and the leaderboard. On the website you sign
        in with Google. In the iPhone and iPad app you can sign in with Apple or Google. Use the
        same Google account in both places to keep your username and stats.
      </p>

      <h3>How do online rooms work?</h3>
      <p>
        Choose <strong>Play online</strong> to create a room, then share the six-character code or
        link with a friend. Rooms expire after 10 minutes without a second player. If a player
        disconnects for 10 minutes, the player who stayed is awarded the win.
      </p>

      <h3>How do I delete my account?</h3>
      <p>
        In the iPhone and iPad app, open your profile and choose <strong>Delete account</strong>.
        It confirms with Apple if you signed in with Apple, then permanently deletes your profile,
        statistics and game history. On the website, email us from the address on your account and
        we will delete it for you. See our <Link to="/privacy-policy">Privacy Policy</Link> for
        details.
      </p>

      <h3>Something is wrong with a match or my score</h3>
      <p>
        Email us with the room code or the approximate time of the match and your username. We can
        look at the match record and correct genuine mistakes.
      </p>

      <h2 id="ios-beta">iPhone and iPad app (beta)</h2>
      <p>
        Twisted Tac for iPhone and iPad is in beta on Apple&apos;s TestFlight. It needs iOS 26 or
        later. It uses the same accounts and leaderboard as the website, so you can play online
        against people on either platform.
      </p>
      <p>
        <a
          href={betaCta.href}
          {...(betaCta.external ? { target: '_blank', rel: 'noreferrer' } : {})}
        >
          {betaCta.label}
        </a>
        {betaCta.external ? '' : ' — we will send an invitation to your Apple ID email.'}
      </p>
      <p>
        To report a bug from the app, use TestFlight&apos;s <strong>Send Beta Feedback</strong>{' '}
        option (it attaches a screenshot and device details), or email us.
      </p>

      <h2>Legal</h2>
      <p>
        <Link to="/privacy-policy">Privacy Policy</Link> ·{' '}
        <Link to="/terms-of-service">Terms of Service</Link>
      </p>
    </LegalPageLayout>
  );
}
