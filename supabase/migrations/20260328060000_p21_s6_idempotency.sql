-- UPDATE LOG
-- 2026-03-28 06:00:00 | P21 Stage 6 — sats_idempotency_keys: prevents duplicate POST side-effects.
--                       Client supplies an Idempotency-Key header; edge functions check this table
--                       before processing and return the cached response on replay.
--                       Note: partial index on expires_at omits NOW() (volatile function not
--                       allowed in index predicate) — expiry enforced at query time instead.

CREATE TABLE IF NOT EXISTS public.sats_idempotency_keys (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        REFERENCES public.sats_tenants(id),
  user_id         UUID        NOT NULL REFERENCES auth.users(id),
  key             TEXT        NOT NULL,     -- client-supplied Idempotency-Key header value
  endpoint        TEXT        NOT NULL,     -- e.g. 'POST /api/v1/analyses'
  response_status INT         NOT NULL,
  response_body   JSONB       NOT NULL DEFAULT '{}',
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, key, endpoint)
);

-- Index covers the primary lookup pattern (user + key + endpoint).
-- Expiry filter (expires_at > NOW()) is volatile and cannot be in the predicate;
-- it must be applied at query time by callers.
CREATE INDEX IF NOT EXISTS idx_sats_idempotency_lookup
  ON public.sats_idempotency_keys (user_id, key, endpoint);

CREATE INDEX IF NOT EXISTS idx_sats_idempotency_expires
  ON public.sats_idempotency_keys (expires_at);

ALTER TABLE public.sats_idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access their own idempotency keys"
  ON public.sats_idempotency_keys FOR ALL
  USING (user_id = auth.uid());

-- -----------------------------------------------------------------------
-- Verification
-- -----------------------------------------------------------------------
-- SELECT tablename FROM pg_tables
-- WHERE schemaname = 'public' AND tablename = 'sats_idempotency_keys';
-- Expected: 1 row

-- NOTE: Run scripts/ops/gen-types.sh after applying this migration.
