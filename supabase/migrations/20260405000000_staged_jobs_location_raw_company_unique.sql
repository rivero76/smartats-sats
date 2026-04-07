-- UPDATE LOG
-- 2026-04-05 01:00:00 | Add location_raw column to sats_staged_jobs so the
--   inbound-email-ingest function can store the raw location string extracted
--   from LinkedIn job alert emails (e.g. "São Paulo, SP (Hybrid)").
--   Add unique index on sats_companies(lower(name)) to enable upsert-by-name
--   in async-ats-scorer. Deduplicate existing company rows before adding index.

-- 1. Add location_raw to staged jobs
ALTER TABLE public.sats_staged_jobs
  ADD COLUMN IF NOT EXISTS location_raw TEXT;

-- 2. Deduplicate sats_companies by name (keep oldest row per lowercase name)
DELETE FROM public.sats_companies
WHERE id NOT IN (
  SELECT DISTINCT ON (lower(name)) id
  FROM public.sats_companies
  ORDER BY lower(name), created_at ASC
);

-- 3. Add unique index on lowercase name (enables ON CONFLICT (lower(name)))
CREATE UNIQUE INDEX IF NOT EXISTS sats_companies_name_lower_unique
  ON public.sats_companies (lower(name));

-- Verification
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'sats_staged_jobs' AND column_name = 'location_raw';
-- Expected: 1 row

-- SELECT indexname FROM pg_indexes
-- WHERE tablename = 'sats_companies' AND indexname = 'sats_companies_name_lower_unique';
-- Expected: 1 row
