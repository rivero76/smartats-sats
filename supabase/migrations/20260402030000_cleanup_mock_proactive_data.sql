-- UPDATE LOG
-- 2026-04-02 03:00:00 | Cleanup — hard-delete mock/test proactive job descriptions, analyses,
--                       and staged jobs whose source_url originates from example.com.
--                       These were created during the P14 async-ats-scorer test run (2026-03-29)
--                       using 3 mock staged jobs against all 6 auth accounts = 18 ghost JDs.
--                       The prior migration (20260402020000) deleted nothing because the test
--                       accounts still exist in auth.users — wrong filter was used.

-- -----------------------------------------------------------------------
-- Step 1: Delete analyses linked to mock proactive JDs
-- -----------------------------------------------------------------------
DELETE FROM public.sats_analyses
WHERE jd_id IN (
  SELECT id FROM public.sats_job_descriptions
  WHERE source_url LIKE 'https://example.com/%'
);

-- -----------------------------------------------------------------------
-- Step 2: Delete mock proactive job descriptions
-- -----------------------------------------------------------------------
DELETE FROM public.sats_job_descriptions
WHERE source_url LIKE 'https://example.com/%';

-- -----------------------------------------------------------------------
-- Step 3: Reset mock staged jobs back to queued (or delete them)
-- They are test data — delete them so the real fetcher can replace them
-- with real job postings on the next cron run.
-- -----------------------------------------------------------------------
DELETE FROM public.sats_staged_jobs
WHERE source_url LIKE 'https://example.com/%';

-- -----------------------------------------------------------------------
-- Verification
-- -----------------------------------------------------------------------
-- SELECT COUNT(*) FROM public.sats_job_descriptions WHERE source_url LIKE 'https://example.com/%';
-- Expected: 0
--
-- SELECT COUNT(*) FROM public.sats_staged_jobs WHERE source_url LIKE 'https://example.com/%';
-- Expected: 0
--
-- SELECT id, name, source_url FROM public.sats_job_descriptions ORDER BY created_at DESC;
-- Expected: only your real JDs remain
