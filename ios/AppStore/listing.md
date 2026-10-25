# App Store listing — Twisted Tac

Draft copy and answers for App Store Connect. Edit freely.

## Basics
| Field | Value |
|---|---|
| Name (30) | Twisted Tac |
| Subtitle (30) | 3D tic-tac-toe, stacked |
| Bundle ID | com.twistedtac.TwistedTac |
| Primary category | Games → Board |
| Secondary category | Games → Strategy |
| Price | Free, no in-app purchases |
| Support URL | https://twistedtac.com |
| Privacy Policy URL | https://twistedtac.com/privacy-policy |
| Marketing URL | https://twistedtac.com |
| Copyright | © 2026 Asit Khanda |

## Promotional text (170)
Stack layers. Strike through depth. Win the cube. Rotate a glass 3D board, outsmart the AI, or take on friends online.

## Description
Twisted Tac is tic-tac-toe in three dimensions. Instead of lining up marks on a flat grid, you play across stacked glass layers: rotate the cube, read lines through depth, and outthink your opponent in space.

HOW TO WIN
• Claim a layer by completing a row, column or diagonal on it. A claimed layer locks. Take 2 of 3 layers to win the match.
• Or strike through the stack: connect three marks straight down the cube or along a space diagonal and win on the spot.

PLAY YOUR WAY
• VS AI — a search-based opponent that finds forks and blocks threats.
• 2 Player — pass and play on one device.
• Online — create a room, share the code, and play a friend in real time. Ranked wins, draws and losses move you on the leaderboard.

BUILT FOR iPHONE AND iPAD
• A real 3D board you can drag to orbit and pinch to zoom, with camera presets.
• Liquid Glass interface, synthesized sound and haptics.
• VoiceOver support with a layer-by-layer board, plus Reduce Motion.
• Secret bigger boards, up to 8×8×8, for anyone who finds the code.

Local games work offline. Sign in with Apple only for online play and the leaderboard.

## Keywords (100)
tic tac toe,3d,puzzle,strategy,board game,cube,multiplayer,brain,two player,ai,online

## What's New (first release)
First release of Twisted Tac for iPhone and iPad.

## Age rating questionnaire
All "None" except:
- Unrestricted web access: No
- User-generated content: Usernames are shown to other players, but they are restricted to
  3–20 letters, numbers and underscores. There is no chat, free text or image sharing.
- Gambling / contests: None

Expected rating: 4+

## App Privacy ("nutrition label")
Data is linked to the user's account and used for App Functionality only. No tracking, no
third-party advertising, no analytics SDKs.

| Data type | Collected | Linked | Tracking | Purpose |
|---|---|---|---|---|
| Email address (Sign in with Apple, may be a private relay address; or Google) | Yes | Yes | No | App Functionality |
| Name (optional, from Apple) | Yes | Yes | No | App Functionality |
| User ID | Yes | Yes | No | App Functionality |
| Gameplay content (matches, scores) | Yes | Yes | No | App Functionality |

Mirrors `TwistedTac/PrivacyInfo.xcprivacy`. Keep the two in sync.

## Export compliance
Uses only standard HTTPS. `ITSAppUsesNonExemptEncryption = NO` is set in the app, so no
per-build prompt.

## App Review notes
The app offers Sign in with Apple and Continue with Google (Google exists so players from our website keep their stats). Reviewers can use their own Apple ID; there is no username/password.
Local play (VS AI and 2 Player) needs no account. Online play needs a second player: review
can create a room on one device and join from another, or from twistedtac.com.
Account deletion: Profile → Delete account (re-confirms with Apple, then deletes the
account and revokes the app's Apple access).

## Screenshots needed
- iPhone 6.9" (1320×2868) — at least 3, up to 10
- iPad 13" (2064×2752) — at least 3 (the app supports iPad)
Suggested set: the 3D cube mid-game, the menu, a layer claim, online room code, leaderboard, win screen.

## Before submitting
- [ ] Apply `supabase/migrations/011_delete_my_account.sql`
- [ ] Deploy `supabase/functions/delete-account` and set its Apple secrets
- [ ] Deploy the website so `/.well-known/apple-app-site-association` is live
- [ ] Create the app record in App Store Connect with the bundle ID above
