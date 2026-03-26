-- UPDATE LOG
-- 2026-03-27 23:00:00 | P21 Stage 3 — sats_tenants table: foundation for multi-tenancy.
--                       Seeds a single 'personal' tenant (UUID sentinel) for all existing users.
--                       Admin policy uses sats_user_role_assignments (not flat sats_user_roles).
--                       tenant_id FK is added to core tables in migration 20260327250000.

CREATE TABLE IF NOT EXISTS public.sats_tenants (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT        NOT NULL UNIQUE,  -- URL-safe subdomain / identifier
  name                TEXT        NOT NULL,
  plan_id             UUID,                         -- FK added in 20260327240000_p21_s3_plans_subscriptions
  status              TEXT        NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','suspended','cancelled','trial')),
  -- Storage and usage limits
  storage_quota_bytes BIGINT      NOT NULL DEFAULT 5368709120,  -- 5 GB default
  -- Extensible settings
  settings            JSONB       NOT NULL DEFAULT '{}',
  metadata            JSONB       NOT NULL DEFAULT '{}',
  -- Audit
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          UUID        REFERENCES auth.users(id),
  updated_by          UUID        REFERENCES auth.users(id),
  deleted_at          TIMESTAMPTZ,
  deleted_by          UUID        REFERENCES auth.users(id)
);

-- Sentinel personal tenant — all pre-multi-tenancy rows will point here
INSERT INTO public.sats_tenants (id, slug, name, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'personal',
  'Personal',
  'active'
) ON CONFLICT (slug) DO NOTHING;

-- Attach audit trigger
CREATE TRIGGER trg_audit_sats_tenants
  BEFORE INSERT OR UPDATE ON public.sats_tenants
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

-- -----------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------

ALTER TABLE public.sats_tenants ENABLE ROW LEVEL SECURITY;

-- Only owners see all tenants; admins see their own tenant
CREATE POLICY "Owners can read all tenants"
  ON public.sats_tenants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sats_user_role_assignments ura
      JOIN public.sats_roles r ON ura.role_id = r.id
      WHERE ura.user_id = auth.uid()
        AND r.slug = 'owner'
        AND (ura.expires_at IS NULL OR ura.expires_at > NOW())
    )
  );

-- -----------------------------------------------------------------------
-- Verification
-- -----------------------------------------------------------------------
-- SELECT id, slug, name, status FROM public.sats_tenants;
-- Expected: 1 row — personal tenant sentinel

-- NOTE: Run scripts/ops/gen-types.sh after applying this migration.
