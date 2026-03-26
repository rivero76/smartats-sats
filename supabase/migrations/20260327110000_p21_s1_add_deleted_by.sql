-- UPDATE LOG
-- 2026-03-27 11:00:00 | P21 Stage 1 — Add deleted_by to all tables that already have deleted_at.
--                       Knowing when a record was deleted is incomplete without knowing who deleted it.
--                       Also patches soft_delete_enriched_experience() RPC to populate deleted_by.
--                       Depends on: 20260327100000_p21_s1_add_created_by_updated_by.sql

-- -----------------------------------------------------------------------
-- Add deleted_by to all soft-delete tables (13 tables)
-- -----------------------------------------------------------------------

ALTER TABLE public.ats_jobs
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE public.ats_resumes
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE public.ats_runs
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE public.sats_analyses
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE public.sats_job_descriptions
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE public.sats_resume_personas
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE public.sats_resumes
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE public.sats_skill_experiences
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE public.sats_user_skills
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE public.sats_users_public
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE public.enriched_experiences
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE public.work_experiences
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- -----------------------------------------------------------------------
-- Patch soft_delete_enriched_experience() to populate deleted_by
-- -----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION soft_delete_enriched_experience(experience_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.enriched_experiences
  SET
    deleted_at     = NOW(),
    deleted_by     = auth.uid()
  WHERE id      = experience_id
    AND user_id = auth.uid();
END;
$$;

-- -----------------------------------------------------------------------
-- Verification
-- -----------------------------------------------------------------------
-- SELECT table_name
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND column_name = 'deleted_by'
-- ORDER BY table_name;
-- Expected: 13 rows

-- NOTE: Run scripts/ops/gen-types.sh after applying this migration.
