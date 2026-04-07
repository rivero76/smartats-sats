-- UPDATE LOG
-- 2026-04-07 00:00:00 | P28 S1 — Create sats_profile_fit_reports table.
-- 2026-04-07 00:01:00 | Fix: remove invalid NULLABLE keyword (PostgreSQL columns are nullable by default).
--   Stores on-demand Profile Fit analysis results: fit_score (0-100),
--   gap_items JSONB, optional reconciliation_conflicts JSONB.
--   Reports are immutable (no UPDATE policy). Owner-only RLS.

CREATE TABLE IF NOT EXISTS public.sats_profile_fit_reports (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_role_family_id    UUID        NOT NULL REFERENCES public.sats_role_families(id),
  target_market_code       TEXT        NOT NULL
                             CHECK (target_market_code IN ('nz','au','uk','br','us')),
  fit_score                INTEGER     NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
  score_rationale          TEXT,
  gap_items                JSONB       NOT NULL DEFAULT '[]',
  gap_snapshot_id          UUID        REFERENCES public.sats_gap_snapshots(id),
  resume_id                UUID,
  reconciliation_conflicts JSONB,
  model_used               TEXT,
  cost_estimate_usd        NUMERIC(10,6),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index: user + role + market + date for history queries
CREATE INDEX IF NOT EXISTS profile_fit_reports_user_role_market_idx
  ON public.sats_profile_fit_reports (user_id, target_role_family_id, target_market_code, created_at DESC);

-- Index: user + date for full history listing
CREATE INDEX IF NOT EXISTS profile_fit_reports_user_created_idx
  ON public.sats_profile_fit_reports (user_id, created_at DESC);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.sats_profile_fit_reports ENABLE ROW LEVEL SECURITY;

-- Owner can read their own reports
CREATE POLICY "profile_fit_reports_owner_select"
  ON public.sats_profile_fit_reports FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Owner can insert their own reports
CREATE POLICY "profile_fit_reports_owner_insert"
  ON public.sats_profile_fit_reports FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Owner can delete their own reports (Clear History button)
CREATE POLICY "profile_fit_reports_owner_delete"
  ON public.sats_profile_fit_reports FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- No UPDATE policy — reports are immutable.

-- Verification:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_name = 'sats_profile_fit_reports';
-- Expected: 1 row
