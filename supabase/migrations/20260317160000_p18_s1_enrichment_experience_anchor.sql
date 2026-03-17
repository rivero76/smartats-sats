-- UPDATE LOG
-- 2026-03-17 16:00:00 | P18 Story 1: add skill_experience_id FK to enriched_experiences
--   so each enrichment can be anchored to a specific job role (company + job_title) from
--   the user's CV. Nullable — existing records are unaffected. Required for CV Optimisation
--   Score to know which part of the CV an accepted enrichment would replace.

ALTER TABLE public.enriched_experiences
  ADD COLUMN IF NOT EXISTS skill_experience_id UUID
    REFERENCES public.sats_skill_experiences(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_enriched_experiences_skill_experience_id
  ON public.enriched_experiences(skill_experience_id);

COMMENT ON COLUMN public.enriched_experiences.skill_experience_id IS
  'Links this enrichment to a specific job role in sats_skill_experiences '
  '(company + job_title + description). Used by the CV Optimisation Score engine '
  'to project how updating that role description would change the ATS score.';
