-- UPDATE LOG
-- 2026-03-17 15:00:00 | Fix BUG-2026-03-17-LOCATION-RLS: replace over-restrictive SELECT policies
--   on sats_locations and sats_companies with open authenticated-read policies.
--   Root cause: .insert().select().single() in PostgREST triggers a SELECT re-check after
--   INSERT. The old SELECT policy required the row to already be linked to a user's JD —
--   impossible for a just-inserted row — causing "new row violates row-level security policy".
--   Both tables are shared reference data (city/state/country; company names); no sensitive
--   information warrants per-user read isolation.

BEGIN;

-- ---------------------------------------------------------------------------
-- sats_locations: replace JD-linked SELECT with open authenticated-read
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view locations they use in job descriptions" ON public.sats_locations;

CREATE POLICY "Authenticated users can view all locations"
ON public.sats_locations
FOR SELECT
TO authenticated
USING (true);

-- ---------------------------------------------------------------------------
-- sats_companies: replace JD-linked SELECT with open authenticated-read
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view companies they use in job descriptions" ON public.sats_companies;

CREATE POLICY "Authenticated users can view all companies"
ON public.sats_companies
FOR SELECT
TO authenticated
USING (true);

COMMIT;
