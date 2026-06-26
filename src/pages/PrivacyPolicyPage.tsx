import { Link } from 'react-router-dom';
import { LegalPageLayout } from '../components/legal/LegalPageLayout';

const LAST_UPDATED = 'June 26, 2026';
const CONTACT_EMAIL = 'asitsignals@gmail.com';

export function PrivacyPolicyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated={LAST_UPDATED}>
      <p>
        Twisted Tac (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates{' '}
        <a href="https://twistedtac.com">twistedtac.com</a>, a free browser game. This Privacy
        Policy explains what information we collect, how we use it, and your choices.
      </p>

      <h2>1. Information we collect</h2>

      <h3>When you play without signing in</h3>
      <p>
        You can play against the AI or locally with another player on the same device without
        creating an account. In that mode we do not collect account information. We may store
        gameplay preferences in your browser&apos;s <code>localStorage</code> (for example, board
        translucency and rotation sensitivity) and a session-only flag in{' '}
        <code>sessionStorage</code> for optional in-app features.
      </p>

      <h3>When you sign in with Google</h3>
      <p>
        If you choose to sign in, we use Google OAuth through our authentication provider,
        Supabase. Google may share basic profile information with us, such as your name, email
        address, and profile picture, according to your Google account settings and Google&apos;s
        privacy policy.
      </p>

      <h3>Account and gameplay data</h3>
      <p>When you use online features, we store:</p>
      <ul>
        <li>
          <strong>Profile information:</strong> username, display name, avatar URL, and game
          statistics (points, wins, losses, draws, games played).
        </li>
        <li>
          <strong>Match data:</strong> online game state, room codes, turn information, and
          connection timestamps shared between match participants.
        </li>
        <li>
          <strong>Game history:</strong> records of your match outcomes, modes played, board size,
          and points earned.
        </li>
        <li>
          <strong>Authentication data:</strong> session tokens managed by Supabase to keep you
          signed in.
        </li>
      </ul>

      <h3>Automatically collected information</h3>
      <p>
        Our hosting and infrastructure providers may process standard technical data such as IP
        address, browser type, device information, and request logs when you access the site.
      </p>

      <h2>2. How we use your information</h2>
      <p>We use the information we collect to:</p>
      <ul>
        <li>Provide and operate the game, including online multiplayer and matchmaking.</li>
        <li>Create and manage your account and profile.</li>
        <li>Maintain leaderboards and display public player rankings.</li>
        <li>Remember your in-browser gameplay preferences.</li>
        <li>Protect the service, prevent abuse, and enforce our Terms of Service.</li>
        <li>Improve reliability and fix technical issues.</li>
      </ul>

      <h2>3. What is public</h2>
      <p>
        If you sign in and choose a username, your <strong>username</strong>,{' '}
        <strong>avatar</strong>, and <strong>game statistics</strong> may be visible to other
        players on the public leaderboard. Your email address is not shown on the leaderboard.
      </p>

      <h2>4. Cookies and local storage</h2>
      <p>
        We use cookies and similar technologies through Supabase to maintain your sign-in session.
        We also use browser storage for non-account settings as described above. You can clear
        cookies and local storage in your browser settings, though doing so may sign you out or
        reset preferences.
      </p>

      <h2>5. Third-party services</h2>
      <p>We rely on the following third parties to run Twisted Tac:</p>
      <ul>
        <li>
          <strong>Google</strong> — sign-in authentication. See{' '}
          <a href="https://policies.google.com/privacy" rel="noreferrer" target="_blank">
            Google&apos;s Privacy Policy
          </a>
          .
        </li>
        <li>
          <strong>Supabase</strong> — authentication, database, and backend services. See{' '}
          <a href="https://supabase.com/privacy" rel="noreferrer" target="_blank">
            Supabase&apos;s Privacy Policy
          </a>
          .
        </li>
        <li>
          <strong>Vercel</strong> — website hosting. See{' '}
          <a href="https://vercel.com/legal/privacy-policy" rel="noreferrer" target="_blank">
            Vercel&apos;s Privacy Policy
          </a>
          .
        </li>
        <li>
          <strong>Fontshare</strong> — web fonts loaded when you visit the site.
        </li>
      </ul>
      <p>
        These providers process data on our behalf according to their own policies and our
        configuration of their services.
      </p>

      <h2>6. Data retention</h2>
      <p>
        We retain account and gameplay data for as long as your account is active or as needed to
        provide the service. Inactive online matches may be cleaned up automatically. You may
        request deletion of your account and associated data by contacting us at{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2>7. Your choices and rights</h2>
      <p>Depending on where you live, you may have rights to access, correct, or delete personal
        data we hold about you. You can:</p>
      <ul>
        <li>Update your display name and avatar from your profile page.</li>
        <li>Sign out at any time to end your session.</li>
        <li>
          Contact us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> to request account
          deletion or other privacy-related requests.
        </li>
      </ul>

      <h2>8. Children&apos;s privacy</h2>
      <p>
        Twisted Tac is not directed at children under 13, and we do not knowingly collect personal
        information from children under 13. If you believe a child has provided us personal
        information, please contact us and we will take steps to delete it.
      </p>

      <h2>9. Security</h2>
      <p>
        We use industry-standard measures through our service providers to protect your information.
        No method of transmission or storage is completely secure, and we cannot guarantee absolute
        security.
      </p>

      <h2>10. International users</h2>
      <p>
        Your information may be processed in countries other than your own, including where our
        service providers operate. By using Twisted Tac, you consent to this processing.
      </p>

      <h2>11. Changes to this policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will revise the &ldquo;Last
        updated&rdquo; date at the top of this page when we do. Continued use of the service after
        changes become effective constitutes acceptance of the updated policy.
      </p>

      <h2>12. Contact us</h2>
      <p>
        If you have questions about this Privacy Policy, contact us at{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> or visit our{' '}
        <Link to="/terms-of-service">Terms of Service</Link>.
      </p>
    </LegalPageLayout>
  );
}
