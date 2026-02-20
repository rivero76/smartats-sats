-- P4: Immutable audit trail for log_settings changes
-- Captures INSERT/UPDATE/DELETE operations with old/new values and actor context.

CREATE TABLE IF NOT EXISTS public.log_settings_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_setting_id uuid NOT NULL,
  script_name text NOT NULL,
  operation text NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  changed_by uuid,
  old_row jsonb,
  new_row jsonb
);

ALTER TABLE public.log_settings_audit ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'log_settings_audit'
      AND policyname = 'Admins can view log settings audit'
  ) THEN
    CREATE POLICY "Admins can view log settings audit"
    ON public.log_settings_audit
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.sats_users_public sup
        WHERE sup.auth_user_id = auth.uid()
          AND sup.role = 'admin'
      )
    );
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_log_settings_audit_changed_at
  ON public.log_settings_audit(changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_log_settings_audit_script_name
  ON public.log_settings_audit(script_name, changed_at DESC);

CREATE OR REPLACE FUNCTION public.audit_log_settings_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.log_settings_audit (
      log_setting_id,
      script_name,
      operation,
      changed_by,
      old_row,
      new_row
    ) VALUES (
      NEW.id,
      NEW.script_name,
      'INSERT',
      auth.uid(),
      NULL,
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.log_settings_audit (
      log_setting_id,
      script_name,
      operation,
      changed_by,
      old_row,
      new_row
    ) VALUES (
      NEW.id,
      NEW.script_name,
      'UPDATE',
      auth.uid(),
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.log_settings_audit (
      log_setting_id,
      script_name,
      operation,
      changed_by,
      old_row,
      new_row
    ) VALUES (
      OLD.id,
      OLD.script_name,
      'DELETE',
      auth.uid(),
      to_jsonb(OLD),
      NULL
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_log_settings_changes ON public.log_settings;
CREATE TRIGGER trg_audit_log_settings_changes
AFTER INSERT OR UPDATE OR DELETE ON public.log_settings
FOR EACH ROW
EXECUTE FUNCTION public.audit_log_settings_changes();
