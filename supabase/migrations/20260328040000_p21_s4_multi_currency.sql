-- UPDATE LOG
-- 2026-03-28 04:00:00 | P21 Stage 4 — sats_currencies (ISO 4217, 8 seeded) + sats_exchange_rates.
--                       Adds currency_code CHAR(3) to sats_llm_call_logs and sats_plans.
--                       Adds preferred_currency to profiles (legacy table, no sats_ rename).
--                       All new table refs use sats_ prefix. Existing plan refs use
--                       sats_plans (renamed in Stage 3).

-- -----------------------------------------------------------------------
-- sats_currencies — ISO 4217 currency reference table
-- -----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sats_currencies (
  code           CHAR(3)   PRIMARY KEY,   -- ISO 4217 e.g. 'USD', 'EUR', 'BRL'
  name           TEXT      NOT NULL,
  symbol         TEXT      NOT NULL,
  decimal_places SMALLINT  NOT NULL DEFAULT 2,
  is_active      BOOL      NOT NULL DEFAULT true
);

INSERT INTO public.sats_currencies (code, name, symbol, decimal_places) VALUES
  ('USD', 'US Dollar',         '$',   2),
  ('EUR', 'Euro',              '€',   2),
  ('GBP', 'British Pound',     '£',   2),
  ('BRL', 'Brazilian Real',    'R$',  2),
  ('CAD', 'Canadian Dollar',   'CA$', 2),
  ('AUD', 'Australian Dollar', 'A$',  2),
  ('JPY', 'Japanese Yen',      '¥',   0),
  ('INR', 'Indian Rupee',      '₹',   2)
ON CONFLICT (code) DO NOTHING;

-- -----------------------------------------------------------------------
-- sats_exchange_rates — daily rate snapshots for local-currency billing reports
-- -----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sats_exchange_rates (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency CHAR(3)       NOT NULL REFERENCES public.sats_currencies(code),
  to_currency   CHAR(3)       NOT NULL REFERENCES public.sats_currencies(code),
  rate          NUMERIC(20,8) NOT NULL,
  source        TEXT          NOT NULL DEFAULT 'manual',
  -- 'manual' | 'openexchangerates' | 'fixer'
  effective_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (from_currency, to_currency, effective_at)
);

CREATE INDEX IF NOT EXISTS idx_sats_exchange_rates_pair
  ON public.sats_exchange_rates (from_currency, to_currency, effective_at DESC);

-- -----------------------------------------------------------------------
-- Add currency_code to cost-bearing tables
-- -----------------------------------------------------------------------

ALTER TABLE public.sats_llm_call_logs
  ADD COLUMN IF NOT EXISTS currency_code CHAR(3) NOT NULL DEFAULT 'USD'
    REFERENCES public.sats_currencies(code);

ALTER TABLE public.sats_plans
  ADD COLUMN IF NOT EXISTS currency_code CHAR(3) NOT NULL DEFAULT 'USD'
    REFERENCES public.sats_currencies(code);

-- User-level currency preference (profiles is a legacy table — no sats_ rename)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_currency CHAR(3) NOT NULL DEFAULT 'USD'
    REFERENCES public.sats_currencies(code);

-- -----------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------

ALTER TABLE public.sats_currencies    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sats_exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read currencies"
  ON public.sats_currencies FOR SELECT TO authenticated USING (true);

CREATE POLICY "All authenticated users can read exchange rates"
  ON public.sats_exchange_rates FOR SELECT TO authenticated USING (true);

-- -----------------------------------------------------------------------
-- Verification
-- -----------------------------------------------------------------------
-- SELECT COUNT(*) FROM public.sats_currencies;
-- Expected: 8
--
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'sats_llm_call_logs'
--   AND column_name = 'currency_code';
-- Expected: 1 row

-- NOTE: Run scripts/ops/gen-types.sh after applying this migration.
