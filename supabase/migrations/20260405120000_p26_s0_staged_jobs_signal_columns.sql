-- UPDATE LOG
-- 2026-04-05 12:00:00 | P26 S0-2 — Add structured signal extraction columns to
--   sats_staged_jobs. These are populated by the extractJobSignals() step inside
--   async-ats-scorer after LLM processing. location_raw already added by migration
--   20260405000000; not repeated here.

ALTER TABLE public.sats_staged_jobs
  ADD COLUMN IF NOT EXISTS certifications         TEXT[]      NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tools                  TEXT[]      NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS methodologies          TEXT[]      NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS seniority_band         TEXT,
  ADD COLUMN IF NOT EXISTS salary_min             NUMERIC,
  ADD COLUMN IF NOT EXISTS salary_max             NUMERIC,
  ADD COLUMN IF NOT EXISTS salary_currency        TEXT,
  ADD COLUMN IF NOT EXISTS market_code            TEXT,
  ADD COLUMN IF NOT EXISTS role_family_id         UUID        REFERENCES public.sats_role_families(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS structured_extracted_at TIMESTAMPTZ;

-- Constraint: seniority_band must be one of the allowed values (or NULL)
ALTER TABLE public.sats_staged_jobs
  ADD CONSTRAINT staged_jobs_seniority_band_check
    CHECK (seniority_band IN ('junior','mid','senior','lead','director','executive') OR seniority_band IS NULL);

-- Constraint: market_code must be one of the 5 supported markets (or NULL)
ALTER TABLE public.sats_staged_jobs
  ADD CONSTRAINT staged_jobs_market_code_check
    CHECK (market_code IN ('nz','au','uk','br','us') OR market_code IS NULL);

-- Index for market-based aggregation queries (used by aggregate-market-signals function)
CREATE INDEX IF NOT EXISTS staged_jobs_market_role_family_idx
  ON public.sats_staged_jobs (market_code, role_family_id, structured_extracted_at)
  WHERE structured_extracted_at IS NOT NULL;

-- GIN indexes for array signal columns (used in frequency counting)
CREATE INDEX IF NOT EXISTS staged_jobs_certifications_gin
  ON public.sats_staged_jobs USING GIN (certifications);

CREATE INDEX IF NOT EXISTS staged_jobs_tools_gin
  ON public.sats_staged_jobs USING GIN (tools);

CREATE INDEX IF NOT EXISTS staged_jobs_methodologies_gin
  ON public.sats_staged_jobs USING GIN (methodologies);

-- Verification:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'sats_staged_jobs'
-- AND column_name IN ('certifications','tools','methodologies','market_code','role_family_id')
-- ORDER BY column_name;
-- Expected: 5 rows
