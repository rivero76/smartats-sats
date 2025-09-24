-- Step 1: Remove ALL auth triggers to clean up duplicates and conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_sats_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_sats_signup ON auth.users;
DROP TRIGGER IF EXISTS sats_on_auth_user_signup ON auth.users;

-- Step 2: Create new SATS-prefixed functions (only if they don't exist)
CREATE OR REPLACE FUNCTION public.sats_update_document_extractions_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sats_update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Step 3: Create single auth trigger with SATS prefix
CREATE TRIGGER sats_on_auth_user_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_sats_user_signup();

-- Step 4: Update handle_sats_user_signup to handle conflicts gracefully
CREATE OR REPLACE FUNCTION public.handle_sats_user_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
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