-- Schedule via Supabase Dashboard → Database → Cron, or pg_cron:
-- select cron.schedule('abandon-stale-matches', '* * * * *', $$select public.abandon_stale_matches()$$);

grant execute on function public.abandon_stale_matches() to postgres;
