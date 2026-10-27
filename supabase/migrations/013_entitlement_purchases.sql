-- Ties a 'large_boards' entitlement to the App Store purchase that paid for it.
--
-- The iOS app sends Apple's signed transaction to the verify-purchase edge
-- function, which checks the signature and then writes the entitlement with the
-- service role. `original_transaction_id` is the purchase's stable identifier
-- (the same across restores and re-downloads). Making it unique means one
-- purchase unlocks one account, so a single ₹150 purchase can't be shared by
-- replaying the same transaction from many accounts.
--
-- Rows granted by hand (source 'manual') have no transaction and are unaffected.

alter table public.entitlements
  add column if not exists original_transaction_id text;

create unique index if not exists entitlements_original_transaction_id_key
  on public.entitlements (original_transaction_id)
  where original_transaction_id is not null;
