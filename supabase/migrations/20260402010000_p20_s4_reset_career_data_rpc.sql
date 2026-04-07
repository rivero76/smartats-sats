-- UPDATE LOG
-- 2026-04-02 01:00:00 | P20 S4 — reset_career_data(user_id) RPC.
--                       Hard-deletes all career data for the calling user while
--                       preserving auth.users, profiles, and settings.
--                       Deletes in FK-safe order; logs to sats_account_deletion_logs.
--                       SECURITY DEFINER — caller must be the owner of the data.

CREATE OR REPLACE FUNCTION public.reset_career_data(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resumes_deleted       INT := 0;
  v_jds_deleted           INT := 0;
  v_analyses_deleted      INT := 0;
  v_enrichments_deleted   INT := 0;
  v_skills_deleted        INT := 0;
  v_skill_exp_deleted     INT := 0;
  v_skill_prof_deleted    INT := 0;
  v_roadmaps_deleted      INT := 0;
  v_milestones_deleted    INT := 0;
  v_personas_deleted      INT := 0;
  v_notifications_deleted INT := 0;
BEGIN
  -- Enforce caller owns the data
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Can only reset career data for your own account';
  END IF;

  -- -----------------------------------------------------------------------
  -- Delete in FK-safe order (children before parents)
  -- -----------------------------------------------------------------------

  -- Roadmap milestones (FK → sats_learning_roadmaps)
  DELETE FROM public.sats_roadmap_milestones
  WHERE roadmap_id IN (
    SELECT id FROM public.sats_learning_roadmaps WHERE user_id = target_user_id
  );
  GET DIAGNOSTICS v_milestones_deleted = ROW_COUNT;

  -- Upskilling roadmaps
  DELETE FROM public.sats_learning_roadmaps WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_roadmaps_deleted = ROW_COUNT;

  -- ATS analyses
  DELETE FROM public.sats_analyses WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_analyses_deleted = ROW_COUNT;

  -- Enriched experiences
  DELETE FROM public.sats_enriched_experiences WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_enrichments_deleted = ROW_COUNT;

  -- Job descriptions
  DELETE FROM public.sats_job_descriptions WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_jds_deleted = ROW_COUNT;

  -- Document extractions (FK → sats_resumes)
  DELETE FROM public.document_extractions
  WHERE resume_id IN (
    SELECT id FROM public.sats_resumes WHERE user_id = target_user_id
  );

  -- Resumes
  DELETE FROM public.sats_resumes WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_resumes_deleted = ROW_COUNT;

  -- Skill experiences
  DELETE FROM public.sats_skill_experiences WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_skill_exp_deleted = ROW_COUNT;

  -- User skills
  DELETE FROM public.sats_user_skills WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_skills_deleted = ROW_COUNT;

  -- Skill profiles (P25)
  DELETE FROM public.sats_skill_profiles WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_skill_prof_deleted = ROW_COUNT;

  -- Resume personas
  DELETE FROM public.sats_resume_personas WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_personas_deleted = ROW_COUNT;

  -- User notifications
  DELETE FROM public.sats_user_notifications WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_notifications_deleted = ROW_COUNT;

  -- -----------------------------------------------------------------------
  -- Audit log — preserves evidence even after data is wiped
  -- -----------------------------------------------------------------------
  INSERT INTO public.sats_account_deletion_logs (
    user_id,
    action,
    deletion_reason,
    data_deleted
  ) VALUES (
    target_user_id,
    'career_data_reset',
    'User requested full career data reset',
    jsonb_build_object(
      'timestamp', now(),
      'scope', 'career_data_only',
      'rows_deleted', jsonb_build_object(
        'sats_resumes',           v_resumes_deleted,
        'sats_job_descriptions',  v_jds_deleted,
        'sats_analyses',          v_analyses_deleted,
        'sats_enriched_experiences', v_enrichments_deleted,
        'sats_user_skills',       v_skills_deleted,
        'sats_skill_experiences', v_skill_exp_deleted,
        'sats_skill_profiles',    v_skill_prof_deleted,
        'sats_learning_roadmaps', v_roadmaps_deleted,
        'sats_roadmap_milestones', v_milestones_deleted,
        'sats_resume_personas',   v_personas_deleted,
        'sats_user_notifications', v_notifications_deleted
      ),
      'preserved', jsonb_build_array('profiles', 'auth.users', 'settings', 'sats_user_role_assignments')
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Career data reset complete. Account and settings preserved.',
    'rows_deleted', jsonb_build_object(
      'resumes', v_resumes_deleted,
      'job_descriptions', v_jds_deleted,
      'analyses', v_analyses_deleted,
      'enriched_experiences', v_enrichments_deleted,
      'user_skills', v_skills_deleted,
      'skill_experiences', v_skill_exp_deleted,
      'skill_profiles', v_skill_prof_deleted,
      'roadmaps', v_roadmaps_deleted,
      'milestones', v_milestones_deleted,
      'personas', v_personas_deleted,
      'notifications', v_notifications_deleted
    )
  );
END;
$$;

-- -----------------------------------------------------------------------
-- Verification
-- -----------------------------------------------------------------------
-- SELECT proname, prosecdef FROM pg_proc WHERE proname = 'reset_career_data';
-- Expected: 1 row, prosecdef = true (SECURITY DEFINER)
