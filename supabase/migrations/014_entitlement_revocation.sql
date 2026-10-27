-- Refunds take the large-boards entitlement away.
--
-- Apple tells the app-store-notifications function when a purchase is refunded
-- (or the refund is reversed). Rather than deleting the row, the function stamps
-- `revoked_at`, so a REFUND_REVERSED can switch it back on and so verify-purchase
-- can refuse a stale receipt from before the refund.
--
-- has_entitlement (used by create_match) now ignores revoked rows. Matches that
-- are already running are untouched; only creating new large-board rooms stops.

alter table public.entitlements
  add column if not exists revoked_at timestamptz;

create or replace function public.has_entitlement(p_feature text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.entitlements
    where user_id = auth.uid() and feature = p_feature and revoked_at is null
  );
$$;

revoke execute on function public.has_entitlement(text) from public, anon;
grant execute on function public.has_entitlement(text) to authenticated;
