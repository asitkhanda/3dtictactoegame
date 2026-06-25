-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  username_lower text generated always as (lower(username)) stored,
  display_name text,
  avatar_url text,
  points int not null default 0,
  wins int not null default 0,
  losses int not null default 0,
  draws int not null default 0,
  games_played int not null default 0,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint profiles_username_length check (username is null or char_length(username) between 3 and 20),
  constraint profiles_username_format check (username is null or username ~ '^[a-zA-Z0-9_]+$')
);

create unique index profiles_username_lower_idx on public.profiles (username_lower) where username is not null;

alter table public.profiles enable row level security;

create policy "profiles_select_public"
  on public.profiles for select
  using (true);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Username helpers
create or replace function public.check_username_available(desired_username text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text := lower(trim(desired_username));
begin
  if normalized is null or char_length(normalized) < 3 or char_length(normalized) > 20 then
    return false;
  end if;
  if normalized !~ '^[a-z0-9_]+$' then
    return false;
  end if;
  return not exists (
    select 1 from public.profiles where username_lower = normalized
  );
end;
$$;

create or replace function public.set_username(desired_username text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text := trim(desired_username);
  result public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not public.check_username_available(normalized) then
    raise exception 'Username unavailable or invalid';
  end if;
  update public.profiles
  set
    username = normalized,
    onboarding_completed_at = coalesce(onboarding_completed_at, now())
  where id = auth.uid()
  returning * into result;
  return result;
end;
$$;

grant execute on function public.check_username_available(text) to anon, authenticated;
grant execute on function public.set_username(text) to authenticated;

-- Game results
create table public.game_results (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete cascade,
  opponent_id uuid references public.profiles(id) on delete set null,
  mode text not null,
  board_size int not null,
  outcome text not null check (outcome in ('win', 'loss', 'draw')),
  points_earned int not null default 0,
  match_id uuid,
  created_at timestamptz not null default now()
);

alter table public.game_results enable row level security;

create policy "game_results_select_own"
  on public.game_results for select
  using (auth.uid() = player_id);

create policy "game_results_insert_own"
  on public.game_results for insert
  with check (auth.uid() = player_id);

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

  if p_outcome = 'win' then
    pts := case p_mode
      when 'PVE' then 10
      when 'PVP' then 15
      when 'PVP_ONLINE' then 25
      else 0
    end;
  elsif p_outcome = 'draw' then
    pts := case p_mode
      when 'PVE' then 3
      when 'PVP' then 5
      when 'PVP_ONLINE' then 5
      else 0
    end;
  elsif p_outcome = 'loss' then
    pts := case when p_mode = 'PVP_ONLINE' then -5 else 0 end;
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

grant execute on function public.record_game_result(text, int, text, uuid, uuid) to authenticated;

-- Matches
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique,
  host_id uuid not null references public.profiles(id) on delete cascade,
  guest_id uuid references public.profiles(id) on delete set null,
  status text not null default 'waiting' check (status in ('waiting', 'active', 'finished', 'abandoned')),
  config jsonb not null,
  board jsonb not null default '[]'::jsonb,
  layer_winners jsonb not null default '[]'::jsonb,
  is_x_next boolean not null default true,
  host_plays_x boolean not null default true,
  winner text check (winner in ('X', 'O')),
  draw boolean not null default false,
  current_turn_user_id uuid references public.profiles(id),
  host_disconnected_at timestamptz,
  guest_disconnected_at timestamptz,
  host_last_seen_at timestamptz default now(),
  guest_last_seen_at timestamptz,
  abandon_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index matches_host_id_idx on public.matches (host_id);
create index matches_guest_id_idx on public.matches (guest_id);
create index matches_status_idx on public.matches (status);
create index matches_room_code_idx on public.matches (room_code);

alter table public.matches enable row level security;

create policy "matches_select_participants"
  on public.matches for select
  using (auth.uid() = host_id or auth.uid() = guest_id);

create policy "matches_update_participants"
  on public.matches for update
  using (auth.uid() = host_id or auth.uid() = guest_id)
  with check (auth.uid() = host_id or auth.uid() = guest_id);

alter table public.game_results
  add constraint game_results_match_id_fkey
  foreign key (match_id) references public.matches(id) on delete set null;

create or replace function public.generate_room_code()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..6 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$;

create or replace function public.create_match(
  p_board_size int default 3,
  p_view_mode text default '3D'
)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  prof public.profiles;
  new_code text;
  cell_count int;
  layer_count int;
  cfg jsonb;
  empty_board jsonb;
  empty_layers jsonb;
  result public.matches;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  select * into prof from public.profiles where id = uid;
  if prof.username is null then raise exception 'Username required'; end if;

  layer_count := case when p_view_mode = '3D' then p_board_size else 1 end;
  cell_count := case when p_view_mode = '3D' then p_board_size * p_board_size * p_board_size else p_board_size * p_board_size end;
  cfg := jsonb_build_object('size', p_board_size, 'viewMode', p_view_mode);
  empty_board := to_jsonb(array(select null::text from generate_series(1, cell_count)));
  empty_layers := to_jsonb(array(select jsonb_build_object('winner', null, 'line', null) from generate_series(1, layer_count)));

  loop
    new_code := public.generate_room_code();
    exit when not exists (select 1 from public.matches where room_code = new_code);
  end loop;

  insert into public.matches (
    room_code, host_id, status, config, board, layer_winners,
    is_x_next, host_plays_x, current_turn_user_id, host_last_seen_at
  ) values (
    new_code, uid, 'waiting', cfg, empty_board, empty_layers,
    true, true, uid, now()
  ) returning * into result;

  return result;
end;
$$;

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
      updated_at = now()
    where id = m.id
    returning * into m;
  end if;

  return m;
end;
$$;

create or replace function public.update_match_presence(
  p_match_id uuid,
  p_connected boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  m public.matches;
begin
  if uid is null then return; end if;
  select * into m from public.matches where id = p_match_id for update;
  if m.id is null then return; end if;
  if uid <> m.host_id and uid <> m.guest_id then return; end if;

  if uid = m.host_id then
    update public.matches set
      host_last_seen_at = now(),
      host_disconnected_at = case when p_connected then null else coalesce(host_disconnected_at, now()) end,
      updated_at = now()
    where id = p_match_id;
  else
    update public.matches set
      guest_last_seen_at = now(),
      guest_disconnected_at = case when p_connected then null else coalesce(guest_disconnected_at, now()) end,
      updated_at = now()
    where id = p_match_id;
  end if;
end;
$$;

create or replace function public.abandon_stale_matches()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.matches
  set status = 'abandoned', abandon_reason = 'lobby_timeout', updated_at = now()
  where status = 'waiting'
    and guest_id is null
    and created_at < now() - interval '10 minutes';

  update public.matches
  set
    status = 'finished',
    abandon_reason = 'disconnect_forfeit',
    winner = case
      when host_disconnected_at is not null and guest_disconnected_at is null then
        case when host_plays_x then 'O' else 'X' end
      when guest_disconnected_at is not null and host_disconnected_at is null then
        case when host_plays_x then 'X' else 'O' end
      else winner
    end,
    updated_at = now()
  where status = 'active'
    and (
      (host_disconnected_at is not null and host_disconnected_at < now() - interval '10 minutes' and guest_disconnected_at is null)
      or
      (guest_disconnected_at is not null and guest_disconnected_at < now() - interval '10 minutes' and host_disconnected_at is null)
    );
end;
$$;

grant execute on function public.create_match(int, text) to authenticated;
grant execute on function public.join_match_by_code(text) to authenticated;
grant execute on function public.update_match_presence(uuid, boolean) to authenticated;

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger matches_updated_at
  before update on public.matches
  for each row execute function public.set_updated_at();

-- Enable realtime for matches
alter publication supabase_realtime add table public.matches;
