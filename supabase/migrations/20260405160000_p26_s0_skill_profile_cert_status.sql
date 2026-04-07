-- UPDATE LOG
-- 2026-04-05 16:00:00 | P26 S0-6 — Add certification status columns to
--   sats_skill_profiles. Used by the gap matrix engine to distinguish held
--   certifications (no gap) from in-progress (partial gap) vs missing (full gap).
--   Only semantically relevant when category = 'certification'; nullable for
--   all other skill categories.

ALTER TABLE public.sats_skill_profiles
  ADD COLUMN IF NOT EXISTS certification_status        TEXT
    CHECK (certification_status IN ('held','in_progress','planned') OR certification_status IS NULL),
  ADD COLUMN IF NOT EXISTS certification_expected_date DATE;

-- Index for gap matrix queries that filter on certification category + status
CREATE INDEX IF NOT EXISTS skill_profiles_cert_status_idx
  ON public.sats_skill_profiles (user_id, certification_status)
  WHERE category = 'certification';

-- Verification:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'sats_skill_profiles'
-- AND column_name IN ('certification_status', 'certification_expected_date')
-- ORDER BY column_name;
-- Expected: 2 rows
