-- Enable pg_cron and schedule 10-minute match abandonment cleanup.
-- Safe to re-run: removes existing job with same name before scheduling.

create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'abandon-stale-matches';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end $$;

select cron.schedule(
  'abandon-stale-matches',
  '* * * * *',
  $$select public.abandon_stale_matches();$$
);
