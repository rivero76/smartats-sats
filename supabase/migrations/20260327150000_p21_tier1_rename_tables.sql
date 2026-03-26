-- UPDATE LOG
-- 2026-03-27 15:00:00 | P21 Tier 1 — Rename 6 non-prefixed production tables to sats_ convention.
--                       Tables renamed: enriched_experiences, log_entries, log_settings,
--                       account_deletion_logs, log_cleanup_policies, user_roles.
--                       Recreates functions and policies that reference renamed tables by name.
--                       All renames use ALTER TABLE RENAME (zero-downtime, preserves OIDs,
--                       triggers, indexes, and FK constraints automatically).

-- -----------------------------------------------------------------------
-- RENAME TABLES
-- -----------------------------------------------------------------------

ALTER TABLE IF EXISTS public.enriched_experiences
  RENAME TO sats_enriched_experiences;

ALTER TABLE IF EXISTS public.log_entries
  RENAME TO sats_log_entries;

ALTER TABLE IF EXISTS public.log_settings
  RENAME TO sats_log_settings;

ALTER TABLE IF EXISTS public.account_deletion_logs
  RENAME TO sats_account_deletion_logs;

ALTER TABLE IF EXISTS public.log_cleanup_policies
  RENAME TO sats_log_cleanup_policies;

ALTER TABLE IF EXISTS public.user_roles
  RENAME TO sats_user_roles;

-- -----------------------------------------------------------------------
-- RECREATE run_log_cleanup_policies()
-- References log_cleanup_policies + log_entries by name — must update after rename.
-- -----------------------------------------------------------------------

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
    FROM public.sats_log_cleanup_policies
    WHERE auto_cleanup_enabled = true
    ORDER BY script_name NULLS FIRST
  LOOP
    total_policies := total_policies + 1;

    -- Retention-based cleanup
    IF policy.retention_days IS NOT NULL AND policy.retention_days > 0 THEN
      IF policy.script_name IS NULL THEN
        DELETE FROM public.sats_log_entries
        WHERE created_at < (now() - make_interval(days => policy.retention_days));
      ELSE
        DELETE FROM public.sats_log_entries
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
          FROM public.sats_log_entries
          ORDER BY created_at DESC
          OFFSET policy.max_entries
        )
        DELETE FROM public.sats_log_entries le
        USING excess
        WHERE le.id = excess.id;
      ELSE
        WITH excess AS (
          SELECT id
          FROM public.sats_log_entries
          WHERE script_name = policy.script_name
          ORDER BY created_at DESC
          OFFSET policy.max_entries
        )
        DELETE FROM public.sats_log_entries le
        USING excess
        WHERE le.id = excess.id;
      END IF;
      GET DIAGNOSTICS deleted_excess_count = ROW_COUNT;
      total_deleted_excess := total_deleted_excess + COALESCE(deleted_excess_count, 0);
    END IF;
  END LOOP;

  -- Internal operational log entry
  INSERT INTO public.sats_log_entries (
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

-- -----------------------------------------------------------------------
-- RECREATE soft_delete_enriched_experience()
-- Created by P21 S1 migration 20260327110000; references enriched_experiences by name.
-- -----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION soft_delete_enriched_experience(experience_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.sats_enriched_experiences
  SET
    deleted_at = NOW(),
    deleted_by = auth.uid()
  WHERE id      = experience_id
    AND user_id = auth.uid();
END;
$$;

-- -----------------------------------------------------------------------
-- FIX: admin policy on sats_llm_call_logs references user_roles by name.
-- After rename to sats_user_roles the string lookup would fail — recreate.
-- -----------------------------------------------------------------------

DROP POLICY IF EXISTS "Admins can view all LLM logs" ON public.sats_llm_call_logs;

CREATE POLICY "Admins can view all LLM logs"
  ON public.sats_llm_call_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sats_user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- -----------------------------------------------------------------------
-- Verification
-- -----------------------------------------------------------------------
-- SELECT tablename FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN (
--     'sats_enriched_experiences','sats_log_entries','sats_log_settings',
--     'sats_account_deletion_logs','sats_log_cleanup_policies','sats_user_roles'
--   )
-- ORDER BY tablename;
-- Expected: 6 rows
--
-- SELECT proname FROM pg_proc WHERE proname = 'run_log_cleanup_policies';
-- Expected: 1 row (updated body)
--
-- SELECT polname FROM pg_policies
-- WHERE tablename = 'sats_llm_call_logs' AND polname = 'Admins can view all LLM logs';
-- Expected: 1 row

-- NOTE: Run scripts/ops/gen-types.sh after applying this migration.
