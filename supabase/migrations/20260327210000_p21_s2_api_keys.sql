-- UPDATE LOG
-- 2026-03-27 21:00:00 | P21 Stage 2 — sats_api_keys table for machine-to-machine auth.
--                       Required for P17 (BYOK) and programmatic access.
--                       Raw key is NEVER stored — only SHA-256 hash + first 8 chars for display.
--                       Full audit columns (created_by/updated_by/deleted_by) included.
--                       Depends on: 20260327200000_p21_s2_rbac_tables.sql

CREATE TABLE IF NOT EXISTS public.sats_api_keys (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  key_hash      TEXT        NOT NULL UNIQUE,    -- SHA-256 of raw key; raw key is never stored
  key_prefix    TEXT        NOT NULL,           -- first 8 chars, safe to display in UI
  scopes        TEXT[]      NOT NULL DEFAULT '{}',  -- e.g. {read:analyses, write:resumes}
  expires_at    TIMESTAMPTZ,                    -- NULL = no expiry
  last_used_at  TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ,
  -- Audit
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID        REFERENCES auth.users(id),
  updated_by    UUID        REFERENCES auth.users(id),
  deleted_at    TIMESTAMPTZ,
  deleted_by    UUID        REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_sats_api_keys_user_active
  ON public.sats_api_keys (user_id)
  WHERE deleted_at IS NULL AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sats_api_keys_hash
  ON public.sats_api_keys (key_hash)
  WHERE deleted_at IS NULL;

ALTER TABLE public.sats_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own API keys"
  ON public.sats_api_keys FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Attach audit trigger from Stage 1
CREATE TRIGGER trg_audit_sats_api_keys
  BEFORE INSERT OR UPDATE ON public.sats_api_keys
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

-- -----------------------------------------------------------------------
-- Verification
-- -----------------------------------------------------------------------
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'sats_api_keys'
-- ORDER BY ordinal_position;

-- NOTE: Run scripts/ops/gen-types.sh after applying this migration.
