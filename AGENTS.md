# AGENTS.md

## Cursor Cloud specific instructions

Twisted Tac is a single-service frontend: a Vite + React + TypeScript app (3D tic-tac-toe). There is no separate backend to run locally — Supabase (online multiplayer, leaderboard, Google auth) is optional and the game is fully playable offline for **VS AI** and **2 Player** modes without any env vars.

### Run / test / build
- Dev server: `npm run dev` (Vite, serves on `http://localhost:3000`, configured in `vite.config.ts`). Note `server.open: true` is set, which is harmless in headless/cloud environments.
- Tests: `npm test` (Vitest, runs `src/**/*.test.ts` only — game-logic unit tests).
- Build: `npm run build` (outputs to `dist/`).
- There is **no lint script** and no TypeScript typecheck script defined in `package.json`; `npm run build` is the closest correctness gate.

### Optional Supabase config
Online features need `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (copy `.env.example` to `.env`). Without them the app still runs; online/auth UI is simply disabled (`isConfigured` is false).

### Testing gameplay in a browser (non-obvious gotcha)
The 3D board renders with a tilted default camera (`rotateX -25deg, rotateY 45deg`, see `src/utils/cameraPresets.ts`). Because of the CSS 3D perspective transform, a cell's visible position is offset from its real DOM `<button>` hitbox, so naive clicks at the apparent cell location often miss. To click reliably during manual/automated UI testing, use the camera joystick (bottom-left of the board) and select the **Front** preset (`F`, `rotation {x:0,y:0}`) to flatten the front layer into a normal flat 3x3 grid, then click cell centers. In VS AI mode the AI auto-responds ~750ms after your move.
