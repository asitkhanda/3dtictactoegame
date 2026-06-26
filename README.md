# Twisted Tac

**Stack layers. Strike through depth. Win the cube.**

[Play now →](https://twistedtac.com/)

Twisted Tac is a 3D take on tic-tac-toe. Instead of lining up three marks on a flat grid, you play across stacked layers — rotate the cube, read lines through depth, and outthink your opponent in space.

---

## How it works

On the classic **3×3×3** board, you can win in two ways:

1. **Layer wins** — complete a row, column, or diagonal on a single layer. First to **2 of 3 layers** takes the match.
2. **3D lines** — connect three marks through the stack (vertical columns, depth diagonals, and space diagonals).

Once a layer is won, it locks — no more moves on that layer. If neither player can reach the win threshold and no legal moves remain, the game ends in a **draw**.

---

## Game modes

| Mode | Description |
|------|-------------|
| **VS AI** | Solo play against a strategic opponent |
| **2 Player** | Local pass-and-play on the same device |
| **Online** | Create or join a room and play remotely (sign-in required) |

Earn points for wins and draws. Sign in with Google to track your profile and climb the **leaderboard**.

---

## Features

- Interactive **3D board** — rotate with the joystick, zoom in and out
- Neon arcade-style UI with smooth piece animations
- **Leaderboard** and player profiles
- **Secret board sizes** (1×1 through 8×8) — find the easter egg on the landing page
- Works offline for AI and local two-player; online features need a backend connection

---

## Play

**Live game:** [twistedtac.com](https://twistedtac.com/)

No install required — open the link and pick a mode.

---

## Run locally

```bash
npm install
npm run dev
```

Open the URL shown in your terminal (typically `http://localhost:3000`).

### Optional: online features

Leaderboard, profiles, and online multiplayer use [Supabase](https://supabase.com). Without it, the game still runs for AI and local two-player.

1. Create a Supabase project and enable **Google** under Authentication → Providers.
2. Add redirect URLs for `http://localhost:3000` and your production domain.
3. Run migrations from `supabase/migrations/`.
4. Deploy the edge function: `supabase functions deploy submit-move`
5. Schedule a cron job to run `select public.abandon_stale_matches()` every minute.
6. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm test` | Run tests |

---

## Tech stack

React · TypeScript · Vite · Tailwind CSS · Supabase · Vercel

---

## Author

Built by [Asit Khanda](https://asit.space/)

Forks and contributions welcome.
