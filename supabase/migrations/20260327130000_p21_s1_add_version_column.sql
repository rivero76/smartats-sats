-- UPDATE LOG
-- 2026-03-27 13:00:00 | P21 Stage 1 — Add version column (optimistic lock) to 9 mutable tables.
--                       Protects against concurrent edit conflicts on key user-owned records.
--                       Default 1 — existing rows are treated as version 1.
--                       set_audit_fields() trigger (from migration 20260327000000) auto-increments on UPDATE.

ALTER TABLE public.sats_resumes
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

ALTER TABLE public.sats_job_descriptions
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

ALTER TABLE public.sats_analyses
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

ALTER TABLE public.sats_resume_personas
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

ALTER TABLE public.sats_skill_experiences
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

ALTER TABLE public.sats_user_skills
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

ALTER TABLE public.work_experiences
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

ALTER TABLE public.enriched_experiences
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

ALTER TABLE public.sats_learning_roadmaps
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

-- -----------------------------------------------------------------------
-- Verification
-- -----------------------------------------------------------------------
-- SELECT table_name, column_name, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND column_name = 'version'
-- ORDER BY table_name;
-- Expected: 9 rows, all with column_default = '1'

-- NOTE: Run scripts/ops/gen-types.sh after applying this migration.
