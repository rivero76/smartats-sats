-- UPDATE LOG
-- 2026-04-05 15:00:00 | P26 S0-5 — Add career goal columns to profiles table.
--   target_market_codes: array of markets the user wants gap analysis for.
--   primary_target_role_family_id: FK to sats_role_families for the user's
--   primary target role. Drives defaults in the Gap Matrix page and Settings card.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS target_market_codes             TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS primary_target_role_family_id   UUID    REFERENCES public.sats_role_families(id) ON DELETE SET NULL;

-- Constraint: all elements of target_market_codes must be valid market codes
-- Note: PostgreSQL does not support CHECK on array element values natively without a function.
-- Enforced at application layer (Settings form restricts to known values).
-- A partial enforcement via trigger can be added in Phase 2 if needed.

-- Verification:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'profiles'
-- AND column_name IN ('target_market_codes', 'primary_target_role_family_id')
-- ORDER BY column_name;
-- Expected: 2 rows
