-- UPDATE LOG
-- 2026-04-01 00:00:00 | Fix set_audit_fields trigger — use auth.uid() directly for created_by/updated_by
--                       instead of sats_users_public.id (which is a gen_random_uuid() PK, not an auth.users UUID).
--                       This caused FK violation on sats_job_descriptions_created_by_fkey and all
--                       other tables with REFERENCES auth.users(id) on created_by/updated_by.

CREATE OR REPLACE FUNCTION set_audit_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Set created_by if column exists and value is null
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = TG_TABLE_NAME
        AND column_name  = 'created_by'
    ) THEN
      IF NEW.created_by IS NULL THEN
        NEW.created_by := auth.uid();
      END IF;
    END IF;
    NEW.created_at := COALESCE(NEW.created_at, NOW());
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at := NOW();

    -- Set updated_by if column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = TG_TABLE_NAME
        AND column_name  = 'updated_by'
    ) THEN
      NEW.updated_by := auth.uid();
    END IF;

    -- Bump optimistic lock version if column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = TG_TABLE_NAME
        AND column_name  = 'version'
    ) THEN
      NEW.version := OLD.version + 1;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Verification
-- SELECT routine_name FROM information_schema.routines
-- WHERE routine_schema = 'public' AND routine_name = 'set_audit_fields';
-- Expected: 1 row (updated definition)
