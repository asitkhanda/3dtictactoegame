# Twisted Tac for iOS

Native SwiftUI + RealityKit app (iOS 26+, iPhone and iPad). The Supabase backend
is shared with the web app, so both platforms play on one leaderboard.

## Build and run
The Xcode project is generated from `project.yml` with [XcodeGen](https://github.com/yonaskolb/XcodeGen)
(`brew install xcodegen`) and is not committed.

```bash
cd ios && xcodegen generate && open TwistedTac.xcodeproj
```

Pick an iPhone or iPad simulator and run. Local play (vs AI and 2 player) works
offline. Debug builds show a board-size picker on the landing screen, standing in
for the web's Konami-code secret sizes.

## Layout
- `TwistedTac/Board` — RealityKit scene (`BoardSceneController`), camera state, gestures
- `TwistedTac/Game` — `LocalGameModel` (AI and pass-and-play), settings
- `TwistedTac/Feedback` — synthesized sound cues and Core Haptics, ported from `arcadeSound.ts`
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
