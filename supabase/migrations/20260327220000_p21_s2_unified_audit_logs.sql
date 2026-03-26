-- UPDATE LOG
-- 2026-03-27 22:00:00 | P21 Stage 2 — sats_audit_logs: unified compliance-grade audit trail.
--                       Consolidates fragmented sats_account_deletion_logs, error_logs, sats_log_entries.
--                       Append-only (UPDATE + DELETE blocked via RLS). Service role inserts only.
--                       sats_log_audit_event() trigger attached to 4 high-value tables.
--                       Admin SELECT policy uses sats_user_role_assignments (not flat sats_user_roles).
--                       Depends on: 20260327200000_p21_s2_rbac_tables.sql

-- -----------------------------------------------------------------------
-- sats_audit_logs — unified append-only event stream
-- -----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sats_audit_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Who
  actor_id      UUID        REFERENCES auth.users(id),  -- NULL = system/cron action
  actor_type    TEXT        NOT NULL DEFAULT 'user',    -- 'user' | 'system' | 'agent' | 'cron'
  -- What
  action        TEXT        NOT NULL,   -- 'sats_resumes.insert' | 'user.delete' etc.
  resource_type TEXT        NOT NULL,   -- table name or domain object
  resource_id   UUID,                   -- affected row id
  -- State snapshot
  old_values    JSONB,                  -- row before change (NULL for INSERT)
  new_values    JSONB,                  -- row after change (NULL for DELETE)
  -- Context
  ip_address    INET,
  user_agent    TEXT,
  session_id    TEXT,
  metadata      JSONB,
  -- Timestamp (immutable)
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Primary query patterns
CREATE INDEX IF NOT EXISTS idx_sats_audit_actor
  ON public.sats_audit_logs (actor_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_sats_audit_resource
  ON public.sats_audit_logs (resource_type, resource_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_sats_audit_action
  ON public.sats_audit_logs (action, occurred_at DESC);

-- -----------------------------------------------------------------------
-- RLS — append-only; no UPDATE or DELETE permitted (compliance requirement)
-- -----------------------------------------------------------------------

ALTER TABLE public.sats_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own audit events"
  ON public.sats_audit_logs FOR SELECT
  USING (actor_id = auth.uid());

CREATE POLICY "Admins can read all audit events"
  ON public.sats_audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sats_user_role_assignments ura
      JOIN public.sats_roles r ON ura.role_id = r.id
      WHERE ura.user_id = auth.uid()
        AND r.slug IN ('owner', 'admin')
        AND (ura.expires_at IS NULL OR ura.expires_at > NOW())
    )
  );

-- Service role inserts from edge functions and triggers
CREATE POLICY "Service role inserts audit events"
  ON public.sats_audit_logs FOR INSERT
  WITH CHECK (true);

-- Hard deny — no row may ever be modified or removed
CREATE POLICY "No updates allowed on audit_logs"
  ON public.sats_audit_logs FOR UPDATE USING (false);

CREATE POLICY "No deletes allowed on audit_logs"
  ON public.sats_audit_logs FOR DELETE USING (false);

-- -----------------------------------------------------------------------
-- sats_log_audit_event() — generic trigger function
-- Attaches to any table to auto-log row changes into sats_audit_logs.
-- -----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION sats_log_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.sats_audit_logs (
    actor_id,
    actor_type,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values,
    occurred_at
  ) VALUES (
    auth.uid(),
    'user',
    TG_TABLE_NAME || '.' || LOWER(TG_OP),
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE')  THEN to_jsonb(NEW) ELSE NULL END,
    NOW()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- -----------------------------------------------------------------------
-- Attach to high-value tables
-- -----------------------------------------------------------------------

CREATE TRIGGER trg_audit_log_sats_resumes
  AFTER INSERT OR UPDATE OR DELETE ON public.sats_resumes
  FOR EACH ROW EXECUTE FUNCTION sats_log_audit_event();

CREATE TRIGGER trg_audit_log_sats_analyses
  AFTER INSERT OR UPDATE OR DELETE ON public.sats_analyses
  FOR EACH ROW EXECUTE FUNCTION sats_log_audit_event();

CREATE TRIGGER trg_audit_log_work_experiences
  AFTER INSERT OR UPDATE OR DELETE ON public.work_experiences
  FOR EACH ROW EXECUTE FUNCTION sats_log_audit_event();

CREATE TRIGGER trg_audit_log_sats_user_role_assignments
  AFTER INSERT OR UPDATE OR DELETE ON public.sats_user_role_assignments
  FOR EACH ROW EXECUTE FUNCTION sats_log_audit_event();

-- -----------------------------------------------------------------------
-- Verification
-- -----------------------------------------------------------------------
-- SELECT polname, cmd FROM pg_policies WHERE tablename = 'sats_audit_logs' ORDER BY cmd;
-- Expected: 5 policies (SELECT x2, INSERT x1, UPDATE x1, DELETE x1)
--
-- SELECT tgname FROM pg_trigger
-- WHERE tgname LIKE 'trg_audit_log_%' ORDER BY tgname;
-- Expected: 4 rows

-- NOTE: Run scripts/ops/gen-types.sh after applying this migration.
