-- UPDATE LOG
-- 2026-03-27 10:00:00 | P21 Stage 1 — Add created_by and updated_by to all 19 data tables.
--                       All columns are nullable with no defaults — zero-downtime on live Supabase tables.
--                       Attaches set_audit_fields() trigger to each table.
--                       Depends on: 20260327000000_p21_s1_universal_audit_trigger.sql

-- -----------------------------------------------------------------------
-- Core user and profile tables
-- -----------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.sats_users_public
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- -----------------------------------------------------------------------
-- Resume and job tables
-- -----------------------------------------------------------------------

ALTER TABLE public.sats_resumes
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.sats_job_descriptions
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.sats_analyses
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.sats_resume_personas
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- -----------------------------------------------------------------------
-- Skills and experience tables
-- -----------------------------------------------------------------------

ALTER TABLE public.sats_user_skills
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.sats_skill_experiences
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.enriched_experiences
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.work_experiences
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- -----------------------------------------------------------------------
-- Learning tables
-- -----------------------------------------------------------------------

ALTER TABLE public.sats_learning_roadmaps
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.sats_roadmap_milestones
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- -----------------------------------------------------------------------
-- ATS pipeline tables
-- -----------------------------------------------------------------------

ALTER TABLE public.ats_jobs
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.ats_resumes
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.ats_runs
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.ats_derivatives
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.ats_job_documents
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.sats_user_notifications
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.document_extractions
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- -----------------------------------------------------------------------
-- Attach audit trigger to all 19 tables
-- -----------------------------------------------------------------------

CREATE TRIGGER trg_audit_profiles
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

CREATE TRIGGER trg_audit_sats_users_public
  BEFORE INSERT OR UPDATE ON public.sats_users_public
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

CREATE TRIGGER trg_audit_sats_resumes
  BEFORE INSERT OR UPDATE ON public.sats_resumes
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

CREATE TRIGGER trg_audit_sats_job_descriptions
  BEFORE INSERT OR UPDATE ON public.sats_job_descriptions
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

CREATE TRIGGER trg_audit_sats_analyses
  BEFORE INSERT OR UPDATE ON public.sats_analyses
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

CREATE TRIGGER trg_audit_sats_resume_personas
  BEFORE INSERT OR UPDATE ON public.sats_resume_personas
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

CREATE TRIGGER trg_audit_sats_user_skills
  BEFORE INSERT OR UPDATE ON public.sats_user_skills
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

CREATE TRIGGER trg_audit_sats_skill_experiences
  BEFORE INSERT OR UPDATE ON public.sats_skill_experiences
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

CREATE TRIGGER trg_audit_enriched_experiences
  BEFORE INSERT OR UPDATE ON public.enriched_experiences
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

CREATE TRIGGER trg_audit_work_experiences
  BEFORE INSERT OR UPDATE ON public.work_experiences
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

CREATE TRIGGER trg_audit_sats_learning_roadmaps
  BEFORE INSERT OR UPDATE ON public.sats_learning_roadmaps
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

CREATE TRIGGER trg_audit_sats_roadmap_milestones
  BEFORE INSERT OR UPDATE ON public.sats_roadmap_milestones
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

CREATE TRIGGER trg_audit_ats_jobs
  BEFORE INSERT OR UPDATE ON public.ats_jobs
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

CREATE TRIGGER trg_audit_ats_resumes
  BEFORE INSERT OR UPDATE ON public.ats_resumes
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

CREATE TRIGGER trg_audit_ats_runs
  BEFORE INSERT OR UPDATE ON public.ats_runs
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

CREATE TRIGGER trg_audit_ats_derivatives
  BEFORE INSERT OR UPDATE ON public.ats_derivatives
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

CREATE TRIGGER trg_audit_ats_job_documents
  BEFORE INSERT OR UPDATE ON public.ats_job_documents
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

CREATE TRIGGER trg_audit_sats_user_notifications
  BEFORE INSERT OR UPDATE ON public.sats_user_notifications
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

CREATE TRIGGER trg_audit_document_extractions
  BEFORE INSERT OR UPDATE ON public.document_extractions
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

-- -----------------------------------------------------------------------
-- Verification
-- -----------------------------------------------------------------------
-- SELECT table_name
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND column_name = 'created_by'
-- ORDER BY table_name;
-- Expected: 19 rows

-- NOTE: Run scripts/ops/gen-types.sh after applying this migration.
