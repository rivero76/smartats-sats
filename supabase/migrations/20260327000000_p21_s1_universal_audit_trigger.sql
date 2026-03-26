-- UPDATE LOG
-- 2026-03-27 00:00:00 | P21 Stage 1 — Universal audit trigger function (set_audit_fields).
--                       Auto-stamps created_by on INSERT and updated_at/updated_by/version on UPDATE.
--                       Bug fix vs source plan: replaced incorrect TG_TABLE_NAME IN (SELECT column_name ...)
--                       with EXISTS (SELECT 1 FROM information_schema.columns ...) for correct column presence check.

-- Function: auto-stamps audit fields on INSERT and UPDATE.
-- Attach to any table that has created_by, updated_by, or version columns.
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
        NEW.created_by := (
          SELECT id FROM public.sats_users_public
          WHERE auth_user_id = auth.uid()
          LIMIT 1
        );
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
      NEW.updated_by := (
        SELECT id FROM public.sats_users_public
        WHERE auth_user_id = auth.uid()
        LIMIT 1
      );
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
-- Expected: 1 row
