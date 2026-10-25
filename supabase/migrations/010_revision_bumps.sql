-- Join visibility, mutual-disconnect settlement and dead-code cleanup.

-- 1. Joining a room now bumps `revision`. The client only accepts realtime
--    updates with a newer revision, so without this the host never saw the
--    guest arrive until they reloaded.
create or replace function public.join_match_by_code(p_room_code text)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  prof public.profiles;
  m public.matches;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  select * into prof from public.profiles where id = uid;
  if prof.username is null then raise exception 'Username required'; end if;

  select * into m from public.matches
  where room_code = upper(trim(p_room_code))
  for update;

  if m.id is null then raise exception 'Room not found'; end if;
  if m.status = 'abandoned' then raise exception 'Room expired'; end if;
  if m.status = 'finished' then raise exception 'Match already finished'; end if;
  if m.host_id = uid then return m; end if;
  if m.guest_id is not null and m.guest_id <> uid then raise exception 'Room full'; end if;

  if m.guest_id is null then
    update public.matches
    set
      guest_id = uid,
      status = 'active',
      current_turn_user_id = case when host_plays_x then host_id else uid end,
      guest_last_seen_at = now(),
      guest_disconnected_at = null,
      revision = revision + 1,
      updated_at = now()
    where id = m.id
    returning * into m;
  end if;

  return m;
end;
$$;

grant execute on function public.join_match_by_code(text) to authenticated;

-- 2. Matches where BOTH players dropped used to stay "active" forever, since
--    the worker only handled exactly one disconnected side. When both have
--    been gone for 10 minutes the match is abandoned with no scoring, so
--    nobody gains or loses points for a game neither finished.
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

  if m.host_disconnected_at is not null and m.guest_disconnected_at is not null then
    if greatest(m.host_disconnected_at, m.guest_disconnected_at) >= now() - interval '10 minutes' then
      return m;
    end if;
    update public.matches
    set
      status = 'abandoned',
      current_turn_user_id = null,
      abandon_reason = 'mutual_disconnect',
      revision = revision + 1,
      updated_at = now()
    where id = p_match_id
    returning * into m;
    return m;
  end if;

  disconnected_at := case
    when m.host_disconnected_at is not null then m.host_disconnected_at
    when m.guest_disconnected_at is not null then m.guest_disconnected_at
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

revoke execute on function public.settle_stale_match(uuid, bigint, text, boolean, text) from public, anon, authenticated;
grant execute on function public.settle_stale_match(uuid, bigint, text, boolean, text) to service_role;

-- 3. Superseded by settle_match_results (007) and not callable by clients.
drop function if exists public.apply_match_result(uuid, uuid, int, uuid, text, int);
