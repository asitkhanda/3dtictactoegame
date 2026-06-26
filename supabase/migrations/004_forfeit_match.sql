create or replace function public.forfeit_match(p_match_id uuid)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  m public.matches;
  forfeit_symbol text;
  winner_symbol text;
  player_id uuid;
  opponent_id uuid;
  outcome text;
  pts int;
  prof public.profiles;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into m from public.matches where id = p_match_id for update;

  if m.id is null then
    raise exception 'Match not found';
  end if;

  if uid <> m.host_id and uid <> m.guest_id then
    raise exception 'Not a participant';
  end if;

  if m.status in ('finished', 'abandoned') then
    return m;
  end if;

  if m.status = 'waiting' then
    update public.matches
    set
      status = 'abandoned',
      abandon_reason = 'cancelled',
      updated_at = now()
    where id = p_match_id
    returning * into m;

    return m;
  end if;

  forfeit_symbol := case
    when (uid = m.host_id and m.host_plays_x) or (uid = m.guest_id and not m.host_plays_x) then 'X'
    else 'O'
  end;
  winner_symbol := case when forfeit_symbol = 'X' then 'O' else 'X' end;

  update public.matches
  set
    status = 'finished',
    winner = winner_symbol,
    draw = false,
    abandon_reason = 'voluntary_forfeit',
    current_turn_user_id = null,
    updated_at = now()
  where id = p_match_id
  returning * into m;

  -- X player scoring
  player_id := case when m.host_plays_x then m.host_id else m.guest_id end;
  opponent_id := case when m.host_plays_x then m.guest_id else m.host_id end;
  outcome := case when winner_symbol = 'X' then 'win' else 'loss' end;
  pts := case when outcome = 'win' then 25 else -5 end;

  insert into public.game_results (player_id, opponent_id, mode, board_size, outcome, points_earned, match_id)
  values (player_id, opponent_id, 'PVP_ONLINE', (m.config->>'size')::int, outcome, pts, p_match_id);

  select * into prof from public.profiles where id = player_id;
  if prof.id is not null then
    update public.profiles
    set
      points = greatest(0, prof.points + pts),
      wins = prof.wins + case when outcome = 'win' then 1 else 0 end,
      losses = prof.losses + case when outcome = 'loss' then 1 else 0 end,
      games_played = prof.games_played + 1
    where id = player_id;
  end if;

  -- O player scoring
  player_id := case when m.host_plays_x then m.guest_id else m.host_id end;
  opponent_id := case when m.host_plays_x then m.host_id else m.guest_id end;
  outcome := case when winner_symbol = 'O' then 'win' else 'loss' end;
  pts := case when outcome = 'win' then 25 else -5 end;

  insert into public.game_results (player_id, opponent_id, mode, board_size, outcome, points_earned, match_id)
  values (player_id, opponent_id, 'PVP_ONLINE', (m.config->>'size')::int, outcome, pts, p_match_id);

  select * into prof from public.profiles where id = player_id;
  if prof.id is not null then
    update public.profiles
    set
      points = greatest(0, prof.points + pts),
      wins = prof.wins + case when outcome = 'win' then 1 else 0 end,
      losses = prof.losses + case when outcome = 'loss' then 1 else 0 end,
      games_played = prof.games_played + 1
    where id = player_id;
  end if;

  return m;
end;
$$;

grant execute on function public.forfeit_match(uuid) to authenticated;
