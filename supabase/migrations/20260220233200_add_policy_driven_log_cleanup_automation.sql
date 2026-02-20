-- P3: Policy-driven automated log cleanup
-- Adds a DB cleanup function that enforces retention_days and max_entries from log_cleanup_policies
-- and wires an optional daily pg_cron schedule when pg_cron is available.

CREATE OR REPLACE FUNCTION public.run_log_cleanup_policies()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  policy RECORD;
  deleted_old_count integer;
  deleted_excess_count integer;
  total_deleted_old integer := 0;
  total_deleted_excess integer := 0;
  total_policies integer := 0;
BEGIN
  FOR policy IN
    SELECT script_name, retention_days, max_entries
    FROM public.log_cleanup_policies
    WHERE auto_cleanup_enabled = true
    ORDER BY script_name NULLS FIRST
  LOOP
    total_policies := total_policies + 1;

    -- Retention-based cleanup
    IF policy.retention_days IS NOT NULL AND policy.retention_days > 0 THEN
      IF policy.script_name IS NULL THEN
        DELETE FROM public.log_entries
        WHERE created_at < (now() - make_interval(days => policy.retention_days));
      ELSE
        DELETE FROM public.log_entries
        WHERE script_name = policy.script_name
          AND created_at < (now() - make_interval(days => policy.retention_days));
      END IF;
      GET DIAGNOSTICS deleted_old_count = ROW_COUNT;
      total_deleted_old := total_deleted_old + COALESCE(deleted_old_count, 0);
    END IF;

    -- Max-entries cleanup
    IF policy.max_entries IS NOT NULL AND policy.max_entries > 0 THEN
      IF policy.script_name IS NULL THEN
        WITH excess AS (
          SELECT id
          FROM public.log_entries
          ORDER BY created_at DESC
          OFFSET policy.max_entries
        )
        DELETE FROM public.log_entries le
        USING excess
        WHERE le.id = excess.id;
      ELSE
        WITH excess AS (
          SELECT id
          FROM public.log_entries
          WHERE script_name = policy.script_name
          ORDER BY created_at DESC
          OFFSET policy.max_entries
        )
        DELETE FROM public.log_entries le
        USING excess
        WHERE le.id = excess.id;
      END IF;
      GET DIAGNOSTICS deleted_excess_count = ROW_COUNT;
      total_deleted_excess := total_deleted_excess + COALESCE(deleted_excess_count, 0);
    END IF;
  END LOOP;

  -- Internal operational log entry
  INSERT INTO public.log_entries (
    script_name,
    log_level,
    message,
    metadata,
    timestamp
  ) VALUES (
    'log-cleanup-worker',
    'INFO',
    'Policy-driven log cleanup completed',
    jsonb_build_object(
      'event_name', 'log_cleanup.completed',
      'component', 'db_cleanup_worker',
      'operation', 'run_log_cleanup_policies',
      'outcome', 'success',
      'policies_processed', total_policies,
      'deleted_by_retention', total_deleted_old,
      'deleted_by_max_entries', total_deleted_excess,
      'timestamp', now()
    ),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'policies_processed', total_policies,
    'deleted_by_retention', total_deleted_old,
    'deleted_by_max_entries', total_deleted_excess
  );
END;
$$;

-- Ensure settings row exists for cleanup worker logs
INSERT INTO public.log_settings (script_name, description, logging_enabled, debug_enabled, trace_enabled, log_level)
VALUES ('log-cleanup-worker', 'Automated policy-driven log cleanup worker', true, false, false, 'INFO')
ON CONFLICT (script_name) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = now();

-- Optional schedule (requires pg_cron extension to be enabled in the project)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM cron.job
      WHERE jobname = 'sats_log_cleanup_daily'
    ) THEN
      PERFORM cron.schedule(
        'sats_log_cleanup_daily',
        '0 3 * * *',
        $$SELECT public.run_log_cleanup_policies();$$
      );
    END IF;
  END IF;
END;
$$;
