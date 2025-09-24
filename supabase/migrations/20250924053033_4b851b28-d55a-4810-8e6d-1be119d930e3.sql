-- Create manual reactivation function that can be called independently
CREATE OR REPLACE FUNCTION public.reactivate_soft_deleted_user(target_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify the caller is the target user (security check)
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Can only reactivate your own account';
  END IF;

  -- Check if account is soft deleted
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = target_user_id AND deleted_at IS NOT NULL
  ) THEN
    -- Not soft deleted, return success anyway
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Account is already active'
    );
  END IF;

  -- Reactivate profiles
  UPDATE public.profiles 
  SET 
    deleted_at = NULL,
    deletion_requested_at = NULL,
    deletion_scheduled_for = NULL,
    updated_at = now()
  WHERE user_id = target_user_id;

  -- Reactivate sats_users_public
  UPDATE public.sats_users_public 
  SET 
    deleted_at = NULL,
    deletion_requested_at = NULL,
    deletion_scheduled_for = NULL,
    updated_at = now()
  WHERE auth_user_id = target_user_id;

  -- Reactivate all user-owned data
  UPDATE public.ats_jobs SET deleted_at = NULL WHERE user_id = target_user_id AND deleted_at IS NOT NULL;
  UPDATE public.ats_resumes SET deleted_at = NULL WHERE user_id = target_user_id AND deleted_at IS NOT NULL;
  UPDATE public.ats_runs SET deleted_at = NULL WHERE user_id = target_user_id AND deleted_at IS NOT NULL;
  UPDATE public.sats_analyses SET deleted_at = NULL WHERE user_id = target_user_id AND deleted_at IS NOT NULL;
  UPDATE public.sats_job_descriptions SET deleted_at = NULL WHERE user_id = target_user_id AND deleted_at IS NOT NULL;
  UPDATE public.sats_resumes SET deleted_at = NULL WHERE user_id = target_user_id AND deleted_at IS NOT NULL;
  UPDATE public.sats_skill_experiences SET deleted_at = NULL WHERE user_id = target_user_id AND deleted_at IS NOT NULL;
  UPDATE public.sats_user_skills SET deleted_at = NULL WHERE user_id = target_user_id AND deleted_at IS NOT NULL;
  UPDATE public.work_experiences SET deleted_at = NULL WHERE user_id = target_user_id AND deleted_at IS NOT NULL;

  -- Log the reactivation
  INSERT INTO public.account_deletion_logs (
    user_id,
    action,
    data_deleted
  ) VALUES (
    target_user_id,
    'reactivated',
    jsonb_build_object('reactivation_date', now(), 'method', 'manual_function')
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Account reactivated successfully'
  );
END;
$function$;

-- Immediately reactivate the current user
SELECT public.reactivate_soft_deleted_user('00b75955-f8b4-42b1-9d96-1478bbd2873d'::uuid);