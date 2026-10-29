# Twisted Tac for Android

Native Kotlin app for the PhonePe Indus Appstore, matching the iOS app. The
Supabase backend is shared with the web and iOS apps.

## Build and test
Needs a JDK 17+ (Android Studio's bundled one works) and the Android SDK.

```bash
cd android
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
./gradlew :engine:test
```

## Modules
- `engine` — pure Kotlin/JVM game engine: rules, AI, match model and merge rule.
  A port of `ios/TwistedTacKit` (itself a port of `supabase/functions/_shared/gameRules.ts`).
  Has no Android dependencies, so tests run on the JVM.

## Rules parity
The TypeScript rules are canonical. `ParityTest` replays the same
`parity-vectors.json` the Swift tests use, read in place from
`ios/TwistedTacKit/Tests/TwistedTacKitTests/Resources`. After changing
`gameRules.ts`, regenerate with `npm run gen:parity` and rerun both suites.
