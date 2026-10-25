# Twisted Tac for iOS

Native SwiftUI + RealityKit app (iOS 26+, iPhone and iPad). The Supabase backend
is shared with the web app, so both platforms play on one leaderboard.

## Build and run
The Xcode project is generated from `project.yml` with [XcodeGen](https://github.com/yonaskolb/XcodeGen)
(`brew install xcodegen`) and is not committed.

```bash
cd ios && xcodegen generate && open TwistedTac.xcodeproj
```

For online features, copy `Config/Supabase.example.xcconfig` to
`Config/Supabase.local.xcconfig` (gitignored) and fill in the project URL and
publishable key — the same values as the web app's `.env`. Without it the app
still works for local play, and sign-in and the leaderboard stay hidden.

Pick an iPhone or iPad simulator and run. Local play (vs AI and 2 player) works
offline. Debug builds show a board-size picker on the landing screen. Release
builds play the classic 3×3×3 only: the other sizes are reserved for a future paid,
app-only feature (see `LargeBoards`).

## Invite links and accessibility
- **Invite links:** `https://www.twistedtac.com/join/CODE` opens the app via universal
  links (the `apple-app-site-association` file is served from `public/.well-known/`),
  and `twistedtac://join/CODE` works as a fallback. Test with
  `xcrun simctl openurl booted "twistedtac://join/K7M2QX"`.
- **VoiceOver / Switch Control:** the 3D board is replaced by a layer-by-layer grid of
  labelled buttons, with move announcements. `-forceAccessibleBoard YES` previews it.
- **Reduce Motion** disables piece and camera animations.

## Previewing online screens
Debug builds can open any online screen against a fake server, with no account or
second player: launch with `-previewOnline <scenario>` (`waiting`, `active`,
`theirturn`, `disconnected`, `win`, `loss`, `forfeit`, `abandoned`). The same fake
backs the unit tests in `TwistedTacTests`.

```bash
xcrun simctl launch booted com.twistedtac.TwistedTac -previewOnline disconnected
```

## Sign in with Google
Google uses Supabase's browser OAuth flow (`ASWebAuthenticationSession`), so it reuses
the website's Google setup and existing web accounts carry over. One-time setup:
add `twistedtac://login-callback` to Supabase → Authentication → URL Configuration →
Redirect URLs. Sign in with Apple stays first and equally prominent, as App Store
guideline 4.8 requires when another login is offered.

## Sign in with Apple
The app signs in natively with `AuthenticationServices` and exchanges Apple's
identity token with Supabase (`signInWithIdToken`). One-time setup:
1. Supabase dashboard → Authentication → Providers → Apple: enable it and add the
   app's bundle ID (`com.twistedtac.TwistedTac`) under **Client IDs**. The native
   flow needs no secret key.
2. In Xcode, set your Development Team on the target so the Sign in with Apple
   capability can be provisioned (the entitlement is already in `project.yml`).
3. Apply `supabase/migrations/011_delete_my_account.sql`, which backs the in-app
   "Delete account" button.

## Layout
- `TwistedTac/Board` — RealityKit scene (`BoardSceneController`), camera state, gestures
- `TwistedTac/Game` — `LocalGameModel` (AI and pass-and-play), settings
- `TwistedTac/Feedback` — synthesized sound cues and Core Haptics, ported from `arcadeSound.ts`
- `TwistedTac/Auth` — `AuthManager` (Sign in with Apple, profile, username, deletion)
- `TwistedTac/Services` — Supabase client and leaderboard queries
- `TwistedTac/Views` — SwiftUI screens using Liquid Glass

## Packages
- `TwistedTacKit` — pure game engine: rules, AI, match model and merge rule.
  A Swift port of `supabase/functions/_shared/gameRules.ts`.

## Rules parity
The TypeScript rules are canonical. Test vectors generated from them live in
`TwistedTacKit/Tests/TwistedTacKitTests/Resources/parity-vectors.json`, and the
Swift tests replay every move. After changing `gameRules.ts`, regenerate:

```bash
npm run gen:parity
```

```bash
cd ios/TwistedTacKit && swift test
```
