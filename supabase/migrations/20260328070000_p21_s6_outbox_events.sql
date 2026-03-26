-- UPDATE LOG
-- 2026-03-28 07:00:00 | P21 Stage 6 — sats_outbox_events: transactional outbox pattern.
--                       Prevents dual-write inconsistency when triggering agent tasks,
--                       webhooks, or downstream integrations. Business data + outbox event
--                       are written in the same DB transaction; a background worker
--                       (pg_cron or edge function) polls and publishes to the message bus.
--                       Service-role-only access — no direct user reads.

CREATE TABLE IF NOT EXISTS public.sats_outbox_events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        REFERENCES public.sats_tenants(id),
  event_type      TEXT        NOT NULL,   -- e.g. 'analysis.completed' | 'user.deleted'
  aggregate_type  TEXT        NOT NULL,   -- 'sats_analyses' | 'profiles' | 'ats_runs'
  aggregate_id    UUID        NOT NULL,
  payload         JSONB       NOT NULL DEFAULT '{}',
  status          TEXT        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','published','failed','dead_letter')),
  retry_count     INT         NOT NULL DEFAULT 0,
  max_retries     INT         NOT NULL DEFAULT 3,
  published_at    TIMESTAMPTZ,
  last_error      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial index for worker polling: only pending events, ordered oldest-first
CREATE INDEX IF NOT EXISTS idx_sats_outbox_pending
  ON public.sats_outbox_events (created_at ASC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_sats_outbox_tenant
  ON public.sats_outbox_events (tenant_id, created_at DESC);

ALTER TABLE public.sats_outbox_events ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS; no direct user access to the outbox
CREATE POLICY "Service role manages outbox"
  ON public.sats_outbox_events FOR ALL
  USING (true);

-- -----------------------------------------------------------------------
-- Verification
-- -----------------------------------------------------------------------
-- SELECT tablename FROM pg_tables
-- WHERE schemaname = 'public' AND tablename = 'sats_outbox_events';
-- Expected: 1 row

-- NOTE: Run scripts/ops/gen-types.sh after applying this migration.
