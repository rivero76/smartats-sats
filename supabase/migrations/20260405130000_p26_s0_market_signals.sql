-- UPDATE LOG
-- 2026-04-05 13:00:00 | P26 S0-3 — Create sats_market_signals table. Stores
--   aggregated frequency data per (role_family, market, signal_type, time window).
--   Populated nightly by the aggregate-market-signals edge function.
--   This is shared market intelligence — not user-owned — so RLS allows all
--   authenticated users to SELECT.

CREATE TABLE IF NOT EXISTS public.sats_market_signals (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  role_family_id UUID        NOT NULL REFERENCES public.sats_role_families(id) ON DELETE CASCADE,
  market_code    TEXT        NOT NULL
                   CHECK (market_code IN ('nz','au','uk','br','us')),
  signal_type    TEXT        NOT NULL
                   CHECK (signal_type IN ('skill','certification','tool','methodology')),
  signal_value   TEXT        NOT NULL,
  -- frequency_pct: percentage of postings for this role/market that require this signal
  frequency_pct  NUMERIC     NOT NULL CHECK (frequency_pct >= 0 AND frequency_pct <= 100),
  -- posting_count: denominator — total postings analysed in this window for this role/market
  posting_count  INTEGER     NOT NULL CHECK (posting_count > 0),
  window_start   DATE        NOT NULL,
  window_end     DATE        NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT market_signals_window_check CHECK (window_end > window_start),
  CONSTRAINT market_signals_unique
    UNIQUE (role_family_id, market_code, signal_type, signal_value, window_start, window_end)
);

-- Primary query pattern: fetch latest signals for a role/market pair
CREATE INDEX IF NOT EXISTS market_signals_role_market_window_idx
  ON public.sats_market_signals (role_family_id, market_code, window_end DESC);

-- Frequency-based sorting (gap matrix pulls top signals for a role/market/window)
-- Note: subqueries are not permitted in index predicates; the query layer filters
-- by window_end using the role_market_window_idx above.
CREATE INDEX IF NOT EXISTS market_signals_frequency_idx
  ON public.sats_market_signals (role_family_id, market_code, window_end, frequency_pct DESC);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.sats_market_signals ENABLE ROW LEVEL SECURITY;

-- Market signals are shared intelligence — any authenticated user can read
CREATE POLICY "market_signals_authenticated_select"
  ON public.sats_market_signals
  FOR SELECT
  TO authenticated
  USING (true);

-- DML reserved for service_role (aggregate-market-signals function)
-- No INSERT/UPDATE/DELETE policies for non-service roles = implicit deny

-- Verification:
-- SELECT count(*) FROM public.sats_market_signals;  -- 0 until aggregation runs
-- SELECT * FROM information_schema.tables WHERE table_name = 'sats_market_signals';
