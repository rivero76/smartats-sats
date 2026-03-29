-- UPDATE LOG
-- 2026-03-28 23:00:00 | Fix P14 async-ats-scorer pipeline by replacing partial unique indexes with full unique constraints (allows ON CONFLICT usage)

-- PROBLEM:
-- The tables sats_job_descriptions and sats_analyses both have partial unique indexes:
--   idx_sats_job_descriptions_user_staged_job_unique
--   idx_sats_analyses_user_staged_job_unique
-- These partial indexes cannot be used with ON CONFLICT (user_id, proactive_staged_job_id) because
-- PostgreSQL/PostgREST requires a full unique constraint, not a partial index.
-- Error: "42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification"
--
-- SOLUTION:
-- Drop the partial indexes and create full UNIQUE constraints instead.
-- PostgreSQL's NULL handling in unique constraints (NULL != NULL) ensures:
--   - Multiple rows with proactive_staged_job_id = NULL for the same user are still allowed
--   - The constraint only enforces uniqueness for non-NULL proactive_staged_job_id values
--   - Existing data (which has multiple null-proactive analyses) will not be violated
--
-- This preserves the original intent while enabling ON CONFLICT semantics.

-- Drop partial indexes that cannot work with ON CONFLICT
DROP INDEX IF EXISTS public.idx_sats_job_descriptions_user_staged_job_unique;
DROP INDEX IF EXISTS public.idx_sats_analyses_user_staged_job_unique;

-- Add full unique constraints (PostgreSQL allows NULL != NULL, so multiple nulls are fine)
ALTER TABLE public.sats_job_descriptions
  ADD CONSTRAINT uq_sats_job_descriptions_user_staged_job
  UNIQUE (user_id, proactive_staged_job_id);

ALTER TABLE public.sats_analyses
  ADD CONSTRAINT uq_sats_analyses_user_staged_job
  UNIQUE (user_id, proactive_staged_job_id);
