-- Boards other than the classic 3x3x3 become a paid, app-only feature.
--
-- Clients no longer offer them, but create_match accepted any size from 1 to 8
-- for any signed-in user. This makes the server enforce it:
--   * a new `entitlements` table records who has paid for what. Players can read
--     their own rows but cannot write to it; only the service role (for example
--     an App Store purchase-verification function) or the SQL editor can.
--   * create_match only accepts the classic board unless the caller holds the
--     'large_boards' entitlement.
--
-- Applied to production as "large_boards_entitlement" (the live migration history
-- uses its own version numbers).
--
-- Existing matches are untouched, and anyone can still JOIN a room that a paying
-- host created. To grant access manually:
--   insert into public.entitlements (user_id, feature, source)
--   values ('<profile id>', 'large_boards', 'manual');

create table if not exists public.entitlements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  feature text not null check (feature in ('large_boards')),
  source text not null default 'manual',
  granted_at timestamptz not null default now(),
  primary key (user_id, feature)
);

alter table public.entitlements enable row level security;

drop policy if exists "entitlements_select_own" on public.entitlements;
create policy "entitlements_select_own"
  on public.entitlements for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Read-only for players: no insert/update/delete policy and no write grants.
revoke all on public.entitlements from anon, authenticated;
grant select on public.entitlements to authenticated;

create or replace function public.has_entitlement(p_feature text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.entitlements
    where user_id = auth.uid() and feature = p_feature
  );
$$;

revoke execute on function public.has_entitlement(text) from public, anon;
grant execute on function public.has_entitlement(text) to authenticated;

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
  if p_board_size is null or p_board_size < 1 or p_board_size > 8 then
    raise exception 'Invalid board size';
  end if;
  if p_view_mode not in ('2D', '3D') then
    raise exception 'Invalid view mode';
  end if;

  -- Anything other than the classic cube needs the paid entitlement.
  if (p_board_size <> 3 or p_view_mode <> '3D')
     and not public.has_entitlement('large_boards') then
    raise exception 'Larger boards are not unlocked for this account';
  end if;

  select * into prof from public.profiles where id = uid;
  if prof.username is null then raise exception 'Username required'; end if;

  layer_count := case when p_view_mode = '3D' then p_board_size else 1 end;
  cell_count := case when p_view_mode = '3D' then p_board_size ^ 3 else p_board_size ^ 2 end;
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

grant execute on function public.create_match(int, text) to authenticated;
