-- Update the user's role in sats_users_public to match their admin status
-- This fixes the mismatch between the legacy role field and the proper user_roles table

-- First, let's check the current state and update the specific user
DO $$
BEGIN
  IF to_regclass('public.sats_users_public') IS NOT NULL
     AND to_regclass('public.user_roles') IS NOT NULL THEN
    UPDATE public.sats_users_public
    SET role = 'admin'
    WHERE auth_user_id IN (
      SELECT user_id
      FROM public.user_roles
      WHERE role::text = 'admin'
    )
    AND role != 'admin';
  END IF;
END $$;

-- Add a comment explaining this is a one-time fix
-- In the future, consider removing the legacy role field from sats_users_public
-- and rely solely on the user_roles table with proper RLS policies
