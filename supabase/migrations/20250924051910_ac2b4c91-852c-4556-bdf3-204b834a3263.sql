-- Phase 1: Database Trigger Cleanup (Fixed)
-- Drop ALL existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS sats_on_auth_user_signup ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_signup ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_reactivation ON auth.users;

-- Update the user reactivation function to handle both creation and reactivation
CREATE OR REPLACE FUNCTION public.handle_user_reactivation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if this is a reactivation of a soft-deleted user in sats_users_public
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
    
    -- Skip email confirmation for reactivated users by confirming them immediately
    -- This helps avoid the "email already exists" confirmation issue
    UPDATE auth.users 
    SET email_confirmed_at = COALESCE(email_confirmed_at, now())
    WHERE id = NEW.id;
    
    RETURN NEW;
  END IF;
  
  -- If not a reactivation, this is a new user - let normal signup trigger handle it
  RETURN NEW;
END;
$function$;

-- Update the regular signup function to work alongside reactivation
CREATE OR REPLACE FUNCTION public.handle_sats_user_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- Create reactivation trigger (runs first)
CREATE TRIGGER on_auth_user_reactivation
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_reactivation();

-- Create signup trigger (runs second, but will skip if already handled by reactivation)
CREATE TRIGGER on_auth_user_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_sats_user_signup();