-- UPDATE LOG
-- 2026-04-05 17:00:00 | P26 S2-1 — Register nightly pg_cron job for the
--   aggregate-market-signals edge function. Runs at 02:00 UTC daily.
--   Wrapped in a DO block so this migration is safe to run in local dev
--   environments where pg_cron schema is not available.
-- 2026-04-05 17:01:00 | Fix: guard with schema-existence check so migration
--   applies cleanly in local Supabase (no pg_cron) and production (pg_cron present).

DO $$
BEGIN
  -- Only attempt to schedule if pg_cron is available in this environment
  IF EXISTS (
    SELECT 1 FROM information_schema.schemata WHERE schema_name = 'cron'
  ) THEN
    -- Remove existing job (idempotent)
    PERFORM cron.unschedule('aggregate-market-signals-nightly')
    WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'aggregate-market-signals-nightly'
    );

    -- Schedule nightly at 02:00 UTC
    PERFORM cron.schedule(
      'aggregate-market-signals-nightly',
      '0 2 * * *',
      $cron$
      SELECT net.http_post(
        url     := (SELECT value FROM public.sats_runtime_settings WHERE key = 'SUPABASE_FUNCTIONS_URL') || '/aggregate-market-signals',
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || (SELECT value FROM public.sats_runtime_settings WHERE key = 'SUPABASE_SERVICE_ROLE_KEY')
        ),
        body    := '{}'::jsonb
      ) AS request_id;
      $cron$
    );

    RAISE NOTICE 'pg_cron job aggregate-market-signals-nightly registered.';
  ELSE
    RAISE NOTICE 'pg_cron schema not found — skipping cron registration. Configure the schedule via Supabase Dashboard > Edge Functions > Schedules.';
  END IF;
END;
$$;

-- Production fallback: if the above DO block did not register the cron,
-- configure the schedule manually:
--   Function: aggregate-market-signals
--   Schedule: 0 2 * * *  (02:00 UTC daily)
--   HTTP POST to /functions/v1/aggregate-market-signals
