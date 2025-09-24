-- Step 1: Remove ALL existing auth triggers to start clean
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_sats_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_sats_signup ON auth.users;
DROP TRIGGER IF EXISTS sats_on_auth_user_signup ON auth.users;

-- Step 2: Create SATS-specific functions if they don't exist
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

-- Step 3: Create ONE clean auth trigger with SATS prefix
CREATE TRIGGER sats_on_auth_user_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_sats_user_signup();

-- Step 4: Update document_extractions trigger
DROP TRIGGER IF EXISTS update_document_extractions_updated_at ON public.document_extractions;
DROP TRIGGER IF EXISTS sats_update_document_extractions_updated_at ON public.document_extractions;

CREATE TRIGGER sats_update_document_extractions_updated_at
  BEFORE UPDATE ON public.document_extractions
  FOR EACH ROW EXECUTE FUNCTION public.sats_update_document_extractions_updated_at();

-- Step 5: Make handle_sats_user_signup robust against duplicates with ON CONFLICT
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