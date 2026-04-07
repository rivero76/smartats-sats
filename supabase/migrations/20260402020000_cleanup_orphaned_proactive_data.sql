-- UPDATE LOG
-- 2026-04-02 02:00:00 | Cleanup — hard-delete orphaned proactive job descriptions and analyses
--                       whose user_id no longer exists in auth.users. These rows were created
--                       by the P14 async-ats-scorer test run (2026-03-29) against ghost/dev
--                       accounts that have since been removed from auth.users.
--                       Deletes in FK-safe order: analyses first, then job descriptions.

-- -----------------------------------------------------------------------
-- Step 1: Delete analyses linked to orphaned proactive JDs
-- -----------------------------------------------------------------------
DELETE FROM public.sats_analyses
WHERE user_id NOT IN (SELECT id FROM auth.users)
  AND proactive_staged_job_id IS NOT NULL;

-- -----------------------------------------------------------------------
-- Step 2: Delete orphaned proactive job descriptions
-- (proactive_staged_job_id IS NOT NULL guards against touching user-created JDs)
-- -----------------------------------------------------------------------
DELETE FROM public.sats_job_descriptions
WHERE user_id NOT IN (SELECT id FROM auth.users)
  AND proactive_staged_job_id IS NOT NULL;

-- -----------------------------------------------------------------------
-- Step 3: Reset staged jobs back to 'queued' so the scorer can re-process
-- them for real users on the next run.
-- -----------------------------------------------------------------------
UPDATE public.sats_staged_jobs
SET status = 'queued', error_message = NULL
WHERE status = 'processed';

-- -----------------------------------------------------------------------
-- Verification
-- -----------------------------------------------------------------------
-- SELECT COUNT(*) FROM public.sats_job_descriptions
-- WHERE user_id NOT IN (SELECT id FROM auth.users);
-- Expected: 0
--
-- SELECT COUNT(*) FROM public.sats_staged_jobs WHERE status = 'queued';
-- Expected: all staged jobs back to queued for next real-user scorer run
