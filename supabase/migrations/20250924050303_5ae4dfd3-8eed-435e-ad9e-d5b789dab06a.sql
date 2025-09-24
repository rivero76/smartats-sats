-- Fix for soft-deleted users trying to signup again
-- This function will be called by the signup trigger to handle re-activation

CREATE OR REPLACE FUNCTION public.handle_user_reactivation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if this is a reactivation of a soft-deleted user
  IF EXISTS (
    SELECT 1 FROM public.sats_users_public 
    WHERE auth_user_id = NEW.id AND deleted_at IS NOT NULL
  ) THEN
    -- Reactivate the soft-deleted user
    UPDATE public.sats_users_public 
    SET 
      deleted_at = NULL,
      deletion_requested_at = NULL,
      deletion_scheduled_for = NULL,
      name = COALESCE(
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'full_name', 
        split_part(NEW.email, '@', 1)
      ),
      updated_at = now()
    WHERE auth_user_id = NEW.id;
    
    -- Also reactivate the profile if it exists
    UPDATE public.profiles
    SET 
      deleted_at = NULL,
      deletion_requested_at = NULL,
      deletion_scheduled_for = NULL,
      full_name = COALESCE(
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'full_name', 
        split_part(NEW.email, '@', 1)
      ),
      updated_at = now()
    WHERE user_id = NEW.id;
    
    RETURN NEW;
  END IF;
  
  -- If not a reactivation, let the normal signup trigger handle it
  RETURN NEW;
END;
$$;

-- Update the existing signup trigger to handle reactivations first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create new comprehensive trigger that handles both new users and reactivations
CREATE TRIGGER on_auth_user_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_user_reactivation();

-- Also update the existing handle_sats_user_signup to skip if already reactivated
CREATE OR REPLACE FUNCTION public.handle_sats_user_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only create new record if it doesn't exist (not reactivated)
  INSERT INTO public.sats_users_public (
    auth_user_id,
    name,
    role
  ) VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name', 
      split_part(NEW.email, '@', 1)
    ),
    'user'
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Add trigger for sats_users after reactivation trigger
CREATE TRIGGER on_auth_sats_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_sats_user_signup();