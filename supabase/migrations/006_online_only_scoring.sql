-- Rank points are for matches against real opponents only.
--
-- record_game_result let the client report its own local (vs-AI and
-- pass-and-play) results and be credited for them. Beyond being farmable in a
-- loop, it made the leaderboard meaningless: grinding the bot outranked
-- actually beating people. Online results are already written server-side by
-- the submit-move edge function (apply_match_result) and forfeit_match, so
-- this function has no remaining legitimate caller.
drop function if exists public.record_game_result(text, int, text, uuid, uuid);

-- This migration is deliberately non-destructive. Standings earned before it
-- are kept as they are: existing points, profile stats and game_results rows
-- all stay put, and nobody's rank moves because the rules changed underneath
-- them. The ranked-only rule applies to matches played from here on, since
-- local play stops being recorded at all once the function above is gone.
