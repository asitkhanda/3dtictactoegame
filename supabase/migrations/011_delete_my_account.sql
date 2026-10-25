-- In-app account deletion, required by App Store guideline 5.1.1(v) for apps
-- that offer account creation. Called by the iOS app (and usable from the web).
--
-- Any match still in progress is forfeited first through the existing
-- idempotent path, so an opponent isn't left waiting on a player who is gone
-- and is credited the win. Then the auth user is deleted, which cascades to the
-- profile, game results and the user's hosted matches (see 001_live_services).
--
-- Sign in with Apple also requires revoking the user's Apple token on deletion.
-- That needs Apple's REST API and a signing key, so the delete-account edge
-- function does it and then calls this. Applied to production as
-- "delete_my_account" (the live migration history uses its own version numbers).

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  open_match record;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  for open_match in
    select id
    from public.matches
    where (host_id = uid or guest_id = uid)
      and status in ('waiting', 'active')
  loop
    perform public.forfeit_match(open_match.id);
  end loop;

  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
