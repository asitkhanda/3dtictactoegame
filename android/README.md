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

## Run the app
Open `android/` in Android Studio and run the `app` configuration, or:

```bash
./gradlew :app:installDebug
```

Debug builds can open any board straight away, like the iOS debug picker:

```bash
adb shell am start -n com.twistedtac.app/.MainActivity --ei size 8 --ez flat false --es mode ai
```
`size` is 1–8, `flat` makes a 2D board, `mode` is `ai` or `two`. Release builds always play the classic 3×3×3.

## Modules
- `app` — Jetpack Compose UI and the OpenGL ES 3 board renderer (`board/`).
- `engine` — pure Kotlin/JVM game engine: rules, AI, match model and merge rule.
  A port of `ios/TwistedTacKit` (itself a port of `supabase/functions/_shared/gameRules.ts`).
  Has no Android dependencies, so tests run on the JVM. Also holds the board layout,
  camera presets and tap-picking maths (`com.twistedtac.board`), so they are unit-tested too.

## Rules parity
The TypeScript rules are canonical. `ParityTest` replays the same
`parity-vectors.json` the Swift tests use, read in place from
`ios/TwistedTacKit/Tests/TwistedTacKitTests/Resources`. After changing
`gameRules.ts`, regenerate with `npm run gen:parity` and rerun both suites.
