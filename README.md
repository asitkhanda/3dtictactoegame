![Bluesky followers](https://img.shields.io/bluesky/followers/asit.space?style=plastic&logo=bluesky)  ![X (formerly Twitter) Follow](https://img.shields.io/twitter/follow/asitkhanda?style=plastic&logo=x)


  # 3D Tic Tac Toe Game

  Hello! I created this project as a part of my experimentation and learning of vibe-coding tools like Figma Make.

  This is a simple twist on the classic game of Tic Tac Toe where now you have to win spatially across the 3 layers.

  This is a code bundle for 3D Tic Tac Toe Game. The original project is available at https://www.figma.com/design/okF1cKZss3NZUxd7AevclT/3D-Tic-Tac-Toe-Game.

  Please feel free to fork it or suggest changes to merge so that we can make it even better.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Live services (Supabase)

  1. Create a [Supabase](https://supabase.com) project.
  2. Enable **Google** under Authentication → Providers.
  3. Add redirect URLs: `http://localhost:3000` (and your production URL).
  4. Run migrations in `supabase/migrations/` via the SQL editor or Supabase CLI.
  5. Deploy the edge function: `supabase functions deploy submit-move`
  6. Schedule abandonment cleanup (Dashboard → Cron): run `select public.abandon_stale_matches()` every minute.
  7. Copy `.env.example` to `.env` and set:
     - `VITE_SUPABASE_URL` — your project URL
     - `VITE_SUPABASE_ANON_KEY` — your **publishable** key (`sb_publishable_...`), not the legacy anon JWT

  Without Supabase configured, the game still works offline (AI + local 2-player). Leaderboard, profile, and online play require Supabase.
  
