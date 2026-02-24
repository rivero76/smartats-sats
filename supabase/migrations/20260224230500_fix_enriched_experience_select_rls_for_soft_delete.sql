-- Ensure soft-delete update flows can return rows without tripping SELECT RLS.
-- 2026-02-24 23:05:00
--
-- Context:
-- Some clients issue UPDATE ... RETURNING during soft-delete. If SELECT policy only
-- allows deleted_at IS NULL, Postgres can reject returning the updated row with:
-- "new row violates row-level security policy".
--
-- Fix:
-- Keep ownership boundary at RLS level and let application queries control active/inactive filters.

DROP POLICY IF EXISTS "Users can access active enriched experiences" ON public.enriched_experiences;

CREATE POLICY "Users can access their enriched experiences"
  ON public.enriched_experiences
  FOR SELECT
  USING (auth.uid() = user_id);
