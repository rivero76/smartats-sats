-- UPDATE LOG
-- 2026-04-05 14:00:00 | P26 S0-4 — Create sats_gap_snapshots and sats_gap_items
--   tables. Snapshots are point-in-time gap analysis results per user per
--   (role_family, market). Items are the individual prioritised gap records
--   within a snapshot. Populated on-demand by the generate-gap-matrix function.

-- ─── sats_gap_snapshots ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sats_gap_snapshots (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id                UUID,
  role_family_id           UUID        NOT NULL REFERENCES public.sats_role_families(id) ON DELETE RESTRICT,
  market_code              TEXT        NOT NULL
                             CHECK (market_code IN ('nz','au','uk','br','us')),
  snapshot_date            DATE        NOT NULL DEFAULT CURRENT_DATE,
  -- overall_gap_score: 0 = no gaps, 100 = all critical signals missing
  overall_gap_score        NUMERIC     NOT NULL DEFAULT 0
                             CHECK (overall_gap_score >= 0 AND overall_gap_score <= 100),
  critical_gap_count       INTEGER     NOT NULL DEFAULT 0,
  important_gap_count      INTEGER     NOT NULL DEFAULT 0,
  nice_to_have_gap_count   INTEGER     NOT NULL DEFAULT 0,
  -- Freshness of the market signals used to compute this snapshot
  market_signals_window_end DATE,
  -- Standard audit columns
  version                  INTEGER     NOT NULL DEFAULT 1,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by               UUID,
  updated_by               UUID,
  deleted_at               TIMESTAMPTZ,
  deleted_by               UUID,

  -- Only one snapshot per user/role/market per day (on-demand refresh replaces)
  CONSTRAINT gap_snapshots_unique
    UNIQUE (user_id, role_family_id, market_code, snapshot_date)
);

-- Primary query: latest snapshot for a user/role/market
CREATE INDEX IF NOT EXISTS gap_snapshots_user_role_market_idx
  ON public.sats_gap_snapshots (user_id, role_family_id, market_code, snapshot_date DESC)
  WHERE deleted_at IS NULL;

-- ─── sats_gap_items ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sats_gap_items (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id               UUID        NOT NULL REFERENCES public.sats_gap_snapshots(id) ON DELETE CASCADE,
  user_id                   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_type               TEXT        NOT NULL
                              CHECK (signal_type IN ('skill','certification','tool','methodology')),
  signal_value              TEXT        NOT NULL,
  -- Market frequency: how common this signal is in postings for the role/market
  frequency_pct             NUMERIC     NOT NULL CHECK (frequency_pct >= 0 AND frequency_pct <= 100),
  priority_tier             TEXT        NOT NULL
                              CHECK (priority_tier IN ('critical','important','nice_to_have')),
  -- Candidate's current status for this signal
  candidate_status          TEXT        NOT NULL
                              CHECK (candidate_status IN ('missing','in_progress','held')),
  -- LLM-generated fields
  recommended_action        TEXT,
  estimated_weeks_to_close  INTEGER     CHECK (estimated_weeks_to_close > 0),
  resume_language_template  TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fetch all items for a snapshot (primary access pattern)
CREATE INDEX IF NOT EXISTS gap_items_snapshot_idx
  ON public.sats_gap_items (snapshot_id, priority_tier, frequency_pct DESC);

-- User-scoped lookup (for invalidation/cleanup)
CREATE INDEX IF NOT EXISTS gap_items_user_idx
  ON public.sats_gap_items (user_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.sats_gap_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sats_gap_items     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gap_snapshots_owner_select"
  ON public.sats_gap_snapshots FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "gap_snapshots_owner_insert"
  ON public.sats_gap_snapshots FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "gap_snapshots_owner_update"
  ON public.sats_gap_snapshots FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "gap_items_owner_select"
  ON public.sats_gap_items FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "gap_items_owner_insert"
  ON public.sats_gap_items FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "gap_items_owner_delete"
  ON public.sats_gap_items FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Verification:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_name IN ('sats_gap_snapshots','sats_gap_items');
-- Expected: 2 rows
