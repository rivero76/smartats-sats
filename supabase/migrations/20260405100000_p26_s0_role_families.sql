-- UPDATE LOG
-- 2026-04-05 10:00:00 | P26 S0-1 — Create sats_role_families table. Curated lookup
--   table mapping raw job titles to canonical role families. Used by the Gap Analysis
--   engine (P26) to group staged job postings and aggregate market frequency signals.

-- ─── Table ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sats_role_families (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT,
  -- Alias array: all job title variants that map to this family.
  -- Matching is performed with ILIKE against any alias element.
  aliases     TEXT[]      NOT NULL DEFAULT '{}',
  -- Which of the 5 supported markets this family is relevant in.
  market_codes TEXT[]     NOT NULL DEFAULT '{nz,au,uk,br,us}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- GIN index for efficient ANY(aliases) ILIKE lookups
CREATE INDEX IF NOT EXISTS sats_role_families_aliases_gin
  ON public.sats_role_families USING GIN (aliases);

-- B-tree index for name-based queries
CREATE INDEX IF NOT EXISTS sats_role_families_name_lower_idx
  ON public.sats_role_families (lower(name));

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.sats_role_families ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read the full taxonomy (shared reference data)
CREATE POLICY "role_families_authenticated_select"
  ON public.sats_role_families
  FOR SELECT
  TO authenticated
  USING (true);

-- Anonymous users can also read (needed for Settings dropdown before login)
CREATE POLICY "role_families_anon_select"
  ON public.sats_role_families
  FOR SELECT
  TO anon
  USING (true);

-- DML restricted to service_role (seed migrations, admin tooling only)
-- No INSERT/UPDATE/DELETE policies for non-service roles = implicit deny

-- Verification:
-- SELECT count(*) FROM public.sats_role_families;  -- 0 before seed migration
-- SELECT * FROM information_schema.tables WHERE table_name = 'sats_role_families';
