-- Create the missing trigger function for SATS user signup
CREATE OR REPLACE FUNCTION public.handle_sats_user_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
  );
  RETURN NEW;
END;
$function$;

-- Create the trigger on auth.users for new signups
DROP TRIGGER IF EXISTS on_auth_user_sats_signup ON auth.users;
CREATE TRIGGER on_auth_user_sats_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_sats_user_signup();

-- Backfill missing SATS user record for existing users
INSERT INTO public.sats_users_public (auth_user_id, name, role)
SELECT 
  au.id,
  COALESCE(
    au.raw_user_meta_data->>'name',
    au.raw_user_meta_data->>'full_name',
    split_part(au.email, '@', 1)
  ) as name,
  'user' as role
FROM auth.users au
LEFT JOIN public.sats_users_public sup ON au.id = sup.auth_user_id
WHERE sup.auth_user_id IS NULL;
