-- UPDATE LOG
-- 2026-03-28 08:00:00 | P21 Stage 6 — sats_rate_limit_counters: sliding-window rate limiting.
--                       Tracks per-user/per-tenant counters for api_calls, ai_tokens,
--                       analyses, and storage_writes across 60s/1h/24h windows.
--                       Note: plan UNIQUE(COALESCE(...)) uses expression syntax not supported
--                       in inline constraints — replaced with CREATE UNIQUE INDEX.

CREATE TABLE IF NOT EXISTS public.sats_rate_limit_counters (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        REFERENCES public.sats_tenants(id),
  user_id         UUID        REFERENCES auth.users(id),
  resource        TEXT        NOT NULL,
  -- 'api_calls' | 'ai_tokens' | 'analyses' | 'storage_writes'
  window_start    TIMESTAMPTZ NOT NULL,
  window_seconds  INT         NOT NULL,   -- 60 | 3600 | 86400
  count           INT         NOT NULL DEFAULT 0,
  limit_value     INT         NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Expression-based unique: one counter row per (user-or-tenant, resource, window)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sats_rate_limit_unique
  ON public.sats_rate_limit_counters (
    COALESCE(user_id::text, tenant_id::text),
    resource,
    window_start,
    window_seconds
  );

-- Fast lookup for per-user counters (the common hot path)
CREATE INDEX IF NOT EXISTS idx_sats_rate_limits_user_resource
  ON public.sats_rate_limit_counters (user_id, resource, window_start DESC)
  WHERE user_id IS NOT NULL;

ALTER TABLE public.sats_rate_limit_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own rate limit state"
  ON public.sats_rate_limit_counters FOR SELECT
  USING (user_id = auth.uid());

-- Service role reads and writes counters on every API request
CREATE POLICY "Service role manages rate limits"
  ON public.sats_rate_limit_counters FOR ALL
  USING (true);

-- -----------------------------------------------------------------------
-- Verification
-- -----------------------------------------------------------------------
-- SELECT tablename FROM pg_tables
-- WHERE schemaname = 'public' AND tablename = 'sats_rate_limit_counters';
-- Expected: 1 row
--
-- SELECT indexname FROM pg_indexes
-- WHERE tablename = 'sats_rate_limit_counters'
-- ORDER BY indexname;
-- Expected: 3 indexes (pkey + unique + user_resource)

-- NOTE: Run scripts/ops/gen-types.sh after applying this migration.
