-- Small correctness fixes for profile updates and stale-match scheduling.

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
    select 1 from public.profiles
    where username_lower = normalized
      and id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
  );
end;
$$;

grant execute on function public.check_username_available(text) to anon, authenticated;

do $$
begin
  alter table public.profiles
    add constraint profiles_avatar_url_format
    check (avatar_url is null or avatar_url ~* '^https?://');
exception when duplicate_object then null;
end $$;

-- Active-match timeout evaluation now belongs to the scheduled edge worker;
-- this database job only expires rooms that never received a guest.
create or replace function public.abandon_stale_matches()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.matches
  set status = 'abandoned', abandon_reason = 'lobby_timeout', revision = revision + 1, updated_at = now()
  where status = 'waiting'
    and guest_id is null
    and created_at < now() - interval '10 minutes';
end;
$$;

grant execute on function public.abandon_stale_matches() to postgres;

-- The tactical timeout worker is scheduled through pg_cron + pg_net in
-- deployments that configure the project URL and STALE_MATCH_SECRET in Vault.
-- Waiting-room cleanup remains handled by the existing database cron job.
