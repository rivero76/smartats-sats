-- P8.1 Post-Migration RLS Verification Checklist
-- Applied migration: 20260224235000_p8_rls_tenant_isolation_hardening.sql
-- Run in Supabase SQL Editor (or psql with authenticated context where applicable).

-- ============================================================================
-- 1) Confirm migration exists in remote history
-- ============================================================================
SELECT version, name, statements, inserted_at
FROM supabase_migrations.schema_migrations
WHERE version = '20260224235000';

-- ============================================================================
-- 2) Confirm target policies exist and role scope is hardened
-- ============================================================================
SELECT
  tablename,
  policyname,
  cmd AS operation,
  roles,
  qual AS using_clause,
  with_check AS check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'account_deletion_logs',
    'document_extractions',
    'ats_derivatives',
    'ats_findings',
    'ats_job_documents',
    'ats_jobs',
    'ats_resumes',
    'ats_runs',
    'ats_scores',
    'enriched_experiences',
    'sats_analyses',
    'sats_job_descriptions',
    'sats_skill_experiences',
    'sats_user_notifications',
    'sats_user_skills',
    'sats_users_public',
    'work_experiences',
    'log_cleanup_policies',
    'log_entries',
    'log_settings',
    'log_settings_audit'
  )
ORDER BY tablename, policyname, cmd;

-- ============================================================================
-- 3) Detect UPDATE/INSERT policies that still miss WITH CHECK
--    (Should be empty for user-writable owner policies)
-- ============================================================================
SELECT
  tablename,
  policyname,
  cmd AS operation,
  roles,
  qual AS using_clause,
  with_check AS check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND cmd IN ('INSERT', 'UPDATE', 'ALL')
  AND with_check IS NULL
  AND tablename IN (
    'document_extractions',
    'ats_derivatives',
    'ats_findings',
    'ats_job_documents',
    'ats_jobs',
    'ats_resumes',
    'ats_runs',
    'ats_scores',
    'enriched_experiences',
    'sats_analyses',
    'sats_job_descriptions',
    'sats_skill_experiences',
    'sats_user_notifications',
    'sats_user_skills',
    'sats_users_public',
    'work_experiences'
  )
ORDER BY tablename, policyname;

-- ============================================================================
-- 4) Detect public/anon role exposure on protected tables
--    Review rows manually. Owner/admin policies should mostly be authenticated.
-- ============================================================================
SELECT
  tablename,
  policyname,
  cmd AS operation,
  roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'account_deletion_logs',
    'document_extractions',
    'enriched_experiences',
    'profiles',
    'sats_analyses',
    'sats_job_descriptions',
    'sats_resumes',
    'sats_users_public',
    'work_experiences',
    'log_entries',
    'log_settings',
    'log_cleanup_policies'
  )
  AND (
    roles::text ILIKE '%public%'
    OR roles::text ILIKE '%anon%'
  )
ORDER BY tablename, policyname;

-- ============================================================================
-- 5) Ensure no duplicate/overlapping policy names remain on document_extractions
-- ============================================================================
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'document_extractions'
ORDER BY policyname, cmd;

-- Expected policies only:
-- - Users can create extractions for own resumes
-- - Users can view extractions for own resumes
-- - Users can update extractions for own resumes
-- - Users can delete extractions for own resumes

-- ============================================================================
-- 6) Runtime smoke checks (execute as authenticated user in app/UI)
-- ============================================================================
-- A. Enriched experience delete should succeed:
--    - Trigger delete in UI.
--    - Verify log_entries has event_name = 'enrichment.deleted' and no RLS error.
--
-- B. Cross-tenant access denial:
--    - Use two test users (A/B).
--    - As A, confirm you cannot read/update/delete rows owned by B.
--
-- C. Ownership reassignment denial:
--    - As A, attempt UPDATE user_id to another UUID on owner-scoped tables.
--    - Expect RLS denial due to WITH CHECK.

-- ============================================================================
-- 7) Optional SQL assertions for critical policy names
-- ============================================================================
SELECT 'missing_policy' AS issue, t.required_policy
FROM (
  VALUES
    ('Users can insert own deletion logs'),
    ('Users can create extractions for own resumes'),
    ('Users can view extractions for own resumes'),
    ('Users can update extractions for own resumes'),
    ('Users can delete extractions for own resumes')
) AS t(required_policy)
LEFT JOIN pg_policies p
  ON p.schemaname = 'public'
 AND p.policyname = t.required_policy
WHERE p.policyname IS NULL;
