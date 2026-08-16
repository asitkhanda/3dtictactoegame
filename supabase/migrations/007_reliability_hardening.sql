-- Reliability hardening: authoritative revisions, idempotent settlement, and
-- privileged atomic commits. Existing rows and historical results are kept.

alter table public.matches
  add column if not exists revision bigint not null default 0;

-- Leave historical rows untouched; new ranked settlements receive a stable
-- idempotency key that is protected by a unique index.
alter table public.game_results
  add column if not exists settlement_key text;

create unique index if not exists game_results_settlement_key_unique
  on public.game_results (settlement_key)
  where settlement_key is not null;

create or replace function public.validate_match_state()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  board_size int;
  view_mode text;
  expected_cells int;
  expected_layers int;
begin
  board_size := (new.config->>'size')::int;
  view_mode := new.config->>'viewMode';

  if board_size is null or board_size < 1 or board_size > 8 then
    raise exception 'Invalid board size';
  end if;
  if view_mode not in ('2D', '3D') then
    raise exception 'Invalid view mode';
  end if;

  expected_cells := case when view_mode = '3D' then board_size ^ 3 else board_size ^ 2 end;
  expected_layers := case when view_mode = '3D' then board_size else 1 end;

  if jsonb_typeof(new.board) <> 'array' or jsonb_array_length(new.board) <> expected_cells then
    raise exception 'Invalid board state';
  end if;
  if jsonb_typeof(new.layer_winners) <> 'array' or jsonb_array_length(new.layer_winners) <> expected_layers then
    raise exception 'Invalid layer state';
  end if;

  return new;
end;
$$;

drop trigger if exists matches_validate_state on public.matches;
create trigger matches_validate_state
  before insert or update on public.matches
  for each row execute function public.validate_match_state();

create or replace function public.settle_match_results(
  p_match_id uuid,
  p_winner text,
  p_draw boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.matches;
  player_id uuid;
  opponent_id uuid;
  player_symbol text;
  outcome text;
  pts int;
begin
  if p_winner not in ('X', 'O') and not p_draw then
    raise exception 'Invalid match result';
  end if;

  select * into m from public.matches where id = p_match_id for update;
  if m.id is null or m.guest_id is null then
    return;
  end if;

  for player_symbol in select unnest(array['X', 'O']) loop
    player_id := case
      when player_symbol = 'X' then case when m.host_plays_x then m.host_id else m.guest_id end
      else case when m.host_plays_x then m.guest_id else m.host_id end
    end;
    opponent_id := case when player_id = m.host_id then m.guest_id else m.host_id end;
    outcome := case when p_draw then 'draw' when p_winner = player_symbol then 'win' else 'loss' end;
    pts := case outcome when 'win' then 25 when 'draw' then 5 else -5 end;

    insert into public.game_results (player_id, opponent_id, mode, board_size, outcome, points_earned, match_id, settlement_key)
    values (player_id, opponent_id, 'PVP_ONLINE', (m.config->>'size')::int, outcome, pts, p_match_id, p_match_id::text || ':' || player_id::text)
    on conflict do nothing;

    if found then
      update public.profiles
      set
        points = greatest(0, points + pts),
        wins = wins + case when outcome = 'win' then 1 else 0 end,
        losses = losses + case when outcome = 'loss' then 1 else 0 end,
        draws = draws + case when outcome = 'draw' then 1 else 0 end,
        games_played = games_played + 1
      where id = player_id;
    end if;
  end loop;
end;
$$;

create or replace function public.commit_match_move(
  p_match_id uuid,
  p_expected_revision bigint,
  p_board jsonb,
  p_layer_winners jsonb,
  p_is_x_next boolean,
  p_winner text,
  p_draw boolean,
  p_current_turn_user_id uuid,
  p_status text
)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.matches;
begin
  if p_status not in ('active', 'finished') then
    raise exception 'Invalid match status';
  end if;
  if p_winner is not null and p_winner not in ('X', 'O') then
    raise exception 'Invalid winner';
  end if;
  if p_status = 'finished' and p_winner is null and not p_draw then
    raise exception 'Finished match must have a result';
  end if;

  select * into m from public.matches where id = p_match_id for update;
  if m.id is null then raise exception 'Match not found'; end if;
  if m.status <> 'active' or m.revision <> p_expected_revision then
    raise exception 'Match state conflict';
  end if;

  update public.matches
  set
    board = p_board,
    layer_winners = p_layer_winners,
    is_x_next = p_is_x_next,
    winner = p_winner,
    draw = p_draw,
    status = p_status,
    current_turn_user_id = p_current_turn_user_id,
    revision = revision + 1,
    updated_at = now()
  where id = p_match_id
  returning * into m;

  if p_status = 'finished' then
    perform public.settle_match_results(p_match_id, p_winner, p_draw);
  end if;
  return m;
end;
$$;

create or replace function public.settle_stale_match(
  p_match_id uuid,
  p_expected_revision bigint,
  p_winner text,
  p_draw boolean,
  p_reason text
)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.matches;
  disconnected_at timestamptz;
begin
  select * into m from public.matches where id = p_match_id for update;
  if m.id is null or m.status <> 'active' or m.revision <> p_expected_revision then
    return m;
  end if;

  disconnected_at := case
    when m.host_disconnected_at is not null and m.guest_disconnected_at is null then m.host_disconnected_at
    when m.guest_disconnected_at is not null and m.host_disconnected_at is null then m.guest_disconnected_at
    else null
  end;
  if disconnected_at is null or disconnected_at >= now() - interval '10 minutes' then
    return m;
  end if;

  update public.matches
  set
    status = 'finished',
    winner = p_winner,
    draw = p_draw,
    current_turn_user_id = null,
    abandon_reason = p_reason,
    revision = revision + 1,
    updated_at = now()
  where id = p_match_id
  returning * into m;

  perform public.settle_match_results(p_match_id, p_winner, p_draw);
  return m;
end;
$$;

-- Internal RPCs are callable only by trusted server-side clients.
revoke execute on function public.settle_match_results(uuid, text, boolean) from public, anon, authenticated;
revoke execute on function public.commit_match_move(uuid, bigint, jsonb, jsonb, boolean, text, boolean, uuid, text) from public, anon, authenticated;
revoke execute on function public.settle_stale_match(uuid, bigint, text, boolean, text) from public, anon, authenticated;
grant execute on function public.commit_match_move(uuid, bigint, jsonb, jsonb, boolean, text, boolean, uuid, text) to service_role;
grant execute on function public.settle_stale_match(uuid, bigint, text, boolean, text) to service_role;

-- Ensure voluntary forfeits use the same idempotent settlement path.
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
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  select * into m from public.matches where id = p_match_id for update;
  if m.id is null then raise exception 'Match not found'; end if;
  if uid <> m.host_id and uid <> m.guest_id then raise exception 'Not a participant'; end if;
  if m.status in ('finished', 'abandoned') then return m; end if;

  if m.status = 'waiting' then
    update public.matches
    set status = 'abandoned', abandon_reason = 'cancelled', revision = revision + 1, updated_at = now()
    where id = p_match_id returning * into m;
    return m;
  end if;

  forfeit_symbol := case
    when (uid = m.host_id and m.host_plays_x) or (uid = m.guest_id and not m.host_plays_x) then 'X'
    else 'O'
  end;
  winner_symbol := case when forfeit_symbol = 'X' then 'O' else 'X' end;

  update public.matches
  set status = 'finished', winner = winner_symbol, draw = false,
      abandon_reason = 'voluntary_forfeit', current_turn_user_id = null,
      revision = revision + 1, updated_at = now()
  where id = p_match_id returning * into m;

  perform public.settle_match_results(p_match_id, winner_symbol, false);
  return m;
end;
$$;

grant execute on function public.forfeit_match(uuid) to authenticated;
