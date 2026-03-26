-- UPDATE LOG
-- 2026-03-27 25:00:00 | P21 Stage 3 — Add tenant_id to 12 core data tables.
--                       All columns are nullable with DEFAULT pointing to the personal tenant
--                       sentinel (00000000-0000-0000-0000-000000000001) — zero-downtime, no
--                       backfill needed. Tenant-scoped RLS is NOT activated here; it is
--                       activated separately when the app sets app.current_tenant_id in
--                       middleware (see comment block at bottom of this file).
--                       Depends on: 20260327230000_p21_s3_tenants_table.sql

-- -----------------------------------------------------------------------
-- Add tenant_id to all primary data tables
-- -----------------------------------------------------------------------

ALTER TABLE public.sats_resumes
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.sats_tenants(id)
    DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE public.sats_job_descriptions
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.sats_tenants(id)
    DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE public.sats_analyses
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.sats_tenants(id)
    DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE public.sats_resume_personas
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.sats_tenants(id)
    DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE public.sats_user_skills
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.sats_tenants(id)
    DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE public.sats_skill_experiences
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.sats_tenants(id)
    DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE public.work_experiences
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.sats_tenants(id)
    DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE public.sats_enriched_experiences
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.sats_tenants(id)
    DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE public.sats_learning_roadmaps
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.sats_tenants(id)
    DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE public.ats_runs
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.sats_tenants(id)
    DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE public.sats_llm_call_logs
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.sats_tenants(id)
    DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE public.sats_audit_logs
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.sats_tenants(id)
    DEFAULT '00000000-0000-0000-0000-000000000001';

-- -----------------------------------------------------------------------
-- Indexes — every tenant_id column needs an index for RLS performance
-- Uses partial indexes where deleted_at is available.
-- -----------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_sats_resumes_tenant
  ON public.sats_resumes (tenant_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sats_job_descriptions_tenant
  ON public.sats_job_descriptions (tenant_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sats_analyses_tenant
  ON public.sats_analyses (tenant_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sats_resume_personas_tenant
  ON public.sats_resume_personas (tenant_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sats_user_skills_tenant
  ON public.sats_user_skills (tenant_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sats_skill_experiences_tenant
  ON public.sats_skill_experiences (tenant_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_work_experiences_tenant
  ON public.work_experiences (tenant_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sats_enriched_experiences_tenant
  ON public.sats_enriched_experiences (tenant_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sats_learning_roadmaps_tenant
  ON public.sats_learning_roadmaps (tenant_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ats_runs_tenant
  ON public.ats_runs (tenant_id);

CREATE INDEX IF NOT EXISTS idx_sats_llm_call_logs_tenant
  ON public.sats_llm_call_logs (tenant_id);

CREATE INDEX IF NOT EXISTS idx_sats_audit_logs_tenant
  ON public.sats_audit_logs (tenant_id, occurred_at DESC);

-- -----------------------------------------------------------------------
-- Verification
-- -----------------------------------------------------------------------
-- SELECT table_name, COUNT(*) AS tenant_id_count
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND column_name = 'tenant_id'
-- GROUP BY table_name ORDER BY table_name;
-- Expected: 12+ rows

-- -----------------------------------------------------------------------
-- TENANT-SCOPED RLS ACTIVATION (run in a SEPARATE migration when ready)
-- -----------------------------------------------------------------------
-- DO NOT activate here. Activate only when the app middleware sets
-- app.current_tenant_id in each Supabase session.
--
-- Pattern (example for sats_resumes):
--
-- DROP POLICY IF EXISTS "Users can view their own active resumes" ON public.sats_resumes;
-- CREATE POLICY "Tenant-scoped resume access"
--   ON public.sats_resumes FOR SELECT
--   USING (
--     tenant_id = current_setting('app.current_tenant_id', true)::uuid
--     AND deleted_at IS NULL
--   );
--
-- Set in edge functions before each query:
--   await supabase.rpc('set_config', { key: 'app.current_tenant_id', value: tenantId })
-- -----------------------------------------------------------------------

-- NOTE: Run scripts/ops/gen-types.sh after applying this migration.
