# Twisted Tac for iOS

Native SwiftUI + RealityKit app (iOS 26+, iPhone and iPad). The Supabase backend
is shared with the web app, so both platforms play on one leaderboard.

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
