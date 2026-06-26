import { Link } from 'react-router-dom';
import { LegalPageLayout } from '../components/legal/LegalPageLayout';

const LAST_UPDATED = 'June 26, 2026';
const CONTACT_EMAIL = 'asitsignals@gmail.com';

export function TermsOfServicePage() {
  return (
    <LegalPageLayout title="Terms of Service" lastUpdated={LAST_UPDATED}>
      <p>
        Welcome to Twisted Tac. These Terms of Service (&ldquo;Terms&rdquo;) govern your access to
        and use of <a href="https://twistedtac.com">twistedtac.com</a> and the Twisted Tac game
        (the &ldquo;Service&rdquo;). By using the Service, you agree to these Terms.
      </p>

      <h2>1. The Service</h2>
      <p>
        Twisted Tac is a free browser-based game that offers solo play, play against an AI
        opponent, local two-player mode on one device, and optional online multiplayer with
        leaderboards when you sign in. We may add, change, or remove features at any time.
      </p>

      <h2>2. Eligibility</h2>
      <p>
        You must be at least 13 years old to create an account or use online features that require
        sign-in. By using the Service, you represent that you meet this requirement and that you
        have the legal capacity to agree to these Terms.
      </p>

      <h2>3. Accounts</h2>
      <p>
        Online play, profiles, and leaderboards require signing in with Google. You are responsible
        for activity that occurs under your account. Usernames must be 3–20 characters and may
        contain only letters, numbers, and underscores. You may not impersonate others or choose
        names that are offensive, misleading, or infringe third-party rights.
      </p>

      <h2>4. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Service for any unlawful purpose.</li>
        <li>Harass, abuse, or harm other players.</li>
        <li>Attempt to cheat, manipulate leaderboards, or disrupt matches.</li>
        <li>Reverse engineer, scrape, or overload the Service or its infrastructure.</li>
        <li>Upload or display content that is illegal, harmful, or violates others&apos; rights.</li>
        <li>Circumvent security measures or access data you are not authorized to access.</li>
      </ul>

      <h2>5. User content</h2>
      <p>
        You may set a display name, username, and avatar URL on your profile. You retain ownership
        of content you provide, but you grant us a non-exclusive license to display it as needed to
        operate the Service (for example, on the leaderboard). You are solely responsible for the
        content you choose to display.
      </p>

      <h2>6. Leaderboards and public information</h2>
      <p>
        If you participate in ranked play, your username, avatar, and game statistics may be
        displayed publicly on the leaderboard. See our{' '}
        <Link to="/privacy-policy">Privacy Policy</Link> for details on what information is
        collected and shared.
      </p>

      <h2>7. Online matches</h2>
      <p>
        Online matches depend on network connectivity and third-party services. Matches may be
        marked abandoned if a player disconnects. We do not guarantee uninterrupted availability
        of online play.
      </p>

      <h2>8. Intellectual property</h2>
      <p>
        The Service, including its design, code, graphics, and branding, is owned by Twisted Tac
        and its licensors and is protected by applicable intellectual property laws. You may not
        copy, modify, distribute, or create derivative works from the Service except as permitted
        by law or with our written permission.
      </p>

      <h2>9. Third-party services</h2>
      <p>
        The Service integrates with third parties such as Google (sign-in) and Supabase (backend
        services). Your use of those services may be subject to their separate terms and policies.
      </p>

      <h2>10. Disclaimer of warranties</h2>
      <p>
        THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT
        WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF
        MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT
        THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
      </p>

      <h2>11. Limitation of liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, TWISTED TAC AND ITS OPERATORS WILL NOT BE LIABLE
        FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF
        PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY FOR
        ANY CLAIM RELATING TO THE SERVICE WILL NOT EXCEED THE AMOUNT YOU PAID US IN THE PAST TWELVE
        MONTHS (WHICH IS ZERO FOR THIS FREE SERVICE).
      </p>

      <h2>12. Termination</h2>
      <p>
        We may suspend or terminate your access to the Service at any time if you violate these
        Terms or if we discontinue the Service. You may stop using the Service at any time. Sections
        that by their nature should survive termination will continue to apply.
      </p>

      <h2>13. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. We will revise the &ldquo;Last updated&rdquo;
        date when we do. Your continued use of the Service after changes take effect constitutes
        acceptance of the updated Terms.
      </p>

      <h2>14. Governing law</h2>
      <p>
        These Terms are governed by the laws applicable in the jurisdiction where the Service is
        operated, without regard to conflict-of-law principles. If you have a dispute, please
        contact us first so we can try to resolve it informally.
      </p>

      <h2>15. Contact</h2>
      <p>
        Questions about these Terms? Contact us at{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> or review our{' '}
        <Link to="/privacy-policy">Privacy Policy</Link>.
      </p>
    </LegalPageLayout>
  );
}
