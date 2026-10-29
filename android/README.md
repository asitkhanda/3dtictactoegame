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

## Backend setup
Online play, sign-in and the leaderboard use the same Supabase project as the web and iOS apps.
Copy `supabase.example.properties` to `supabase.local.properties` (gitignored) and fill in the project
URL and publishable key. Without it the app still builds and plays local games; the online buttons hide.

- **Google sign-in** opens the system browser and returns through `twistedtac://login-callback`, the
  same redirect URL the iOS app uses, so it is already on Supabase's allow-list.
- **Invite links** open the app from `twistedtac://join/CODE`. `https://www.twistedtac.com/join/CODE`
  also opens it once the site serves `/.well-known/assetlinks.json` for the release signing key
  (added when the app is signed for the store).

## Run the app
Open `android/` in Android Studio and run the `app` configuration, or:

```bash
./gradlew :app:installDebug
```

Debug builds can open any board straight away, like the iOS debug picker:

```bash
adb shell am start -n com.twistedtac.app/.MainActivity --ei size 8 --ez flat false --es mode ai
```
`size` is 1–8, `flat` makes a 2D board, `mode` is `ai` or `two`, and `--ez a11y true` shows the TalkBack board without a screen reader. Release builds always play the classic 3×3×3.

## Modules
- `app` — Jetpack Compose UI, the OpenGL ES 3 board renderer (`board/`) and sound and
  haptics (`feedback/`). The sound files are listed in `app/SOUND_SOURCES.md`.
- `engine` — pure Kotlin/JVM game engine: rules, AI, match model and merge rule.
  A port of `ios/TwistedTacKit` (itself a port of `supabase/functions/_shared/gameRules.ts`).
  Has no Android dependencies, so tests run on the JVM. Also holds the board layout,
  camera presets and tap-picking maths (`com.twistedtac.board`), so they are unit-tested too.

## Rules parity
The TypeScript rules are canonical. `ParityTest` replays the same
`parity-vectors.json` the Swift tests use, read in place from
`ios/TwistedTacKit/Tests/TwistedTacKitTests/Resources`. After changing
`gameRules.ts`, regenerate with `npm run gen:parity` and rerun both suites.
