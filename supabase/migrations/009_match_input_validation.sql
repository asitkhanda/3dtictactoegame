-- Reject invalid match configurations before allocating board JSON arrays.

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
