-- Security hardening: make the server authoritative for all match and score writes.
--
-- 1. Drop the broad participant update policy on matches. Every legitimate
--    write path already goes through a security-definer RPC
--    (join_match_by_code, update_match_presence, forfeit_match) or the
--    submit-move edge function (service role). The policy let any participant
--    PATCH arbitrary columns (board, winner, status) via PostgREST.
drop policy if exists "matches_update_participants" on public.matches;

-- 2. Drop the client insert policy on game_results. Result rows are inserted
--    by security-definer functions and the edge function only; the policy let
--    clients insert rows with arbitrary points_earned.
drop policy if exists "game_results_insert_own" on public.game_results;

-- 3. Online results are recorded server-side (submit-move edge function and
--    forfeit_match). Reject client-reported PVP_ONLINE outcomes so points
--    cannot be farmed by calling this RPC directly.
create or replace function public.record_game_result(
  p_mode text,
  p_board_size int,
  p_outcome text,
  p_opponent_id uuid default null,
  p_match_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  pts int := 0;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_mode not in ('PVE', 'PVP') then
    raise exception 'Invalid mode';
  end if;

  if p_outcome not in ('win', 'loss', 'draw') then
    raise exception 'Invalid outcome';
  end if;

  if p_outcome = 'win' then
    pts := case p_mode when 'PVE' then 10 when 'PVP' then 15 else 0 end;
  elsif p_outcome = 'draw' then
    pts := case p_mode when 'PVE' then 3 when 'PVP' then 5 else 0 end;
  end if;

  insert into public.game_results (player_id, opponent_id, mode, board_size, outcome, points_earned, match_id)
  values (auth.uid(), p_opponent_id, p_mode, p_board_size, p_outcome, pts, p_match_id);

  update public.profiles
  set
    points = greatest(0, points + pts),
    wins = wins + case when p_outcome = 'win' then 1 else 0 end,
    losses = losses + case when p_outcome = 'loss' then 1 else 0 end,
    draws = draws + case when p_outcome = 'draw' then 1 else 0 end,
    games_played = games_played + 1
  where id = auth.uid();
end;
$$;

-- 4. Atomic scoring for the submit-move edge function. Replaces its
--    read-modify-write on profiles (racy) with a single relative update.
--    Service role only: not granted to anon/authenticated.
create or replace function public.apply_match_result(
  p_player_id uuid,
  p_opponent_id uuid,
  p_board_size int,
  p_match_id uuid,
  p_outcome text,
  p_points int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_outcome not in ('win', 'loss', 'draw') then
    raise exception 'Invalid outcome';
  end if;

  insert into public.game_results (player_id, opponent_id, mode, board_size, outcome, points_earned, match_id)
  values (p_player_id, p_opponent_id, 'PVP_ONLINE', p_board_size, p_outcome, p_points, p_match_id);

  update public.profiles
  set
    points = greatest(0, points + p_points),
    wins = wins + case when p_outcome = 'win' then 1 else 0 end,
    losses = losses + case when p_outcome = 'loss' then 1 else 0 end,
    draws = draws + case when p_outcome = 'draw' then 1 else 0 end,
    games_played = games_played + 1
  where id = p_player_id;
end;
$$;

revoke execute on function public.apply_match_result(uuid, uuid, int, uuid, text, int) from public, anon, authenticated;
