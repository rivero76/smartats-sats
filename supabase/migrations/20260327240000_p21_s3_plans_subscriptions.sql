-- UPDATE LOG
-- 2026-03-27 24:00:00 | P21 Stage 3 — sats_plans, sats_features, sats_tenant_features.
--                       Seeds 4 default plans (free/pro/teams/enterprise).
--                       Adds plan_id FK to sats_tenants and defaults all tenants to free.
--                       Depends on: 20260327230000_p21_s3_tenants_table.sql

-- -----------------------------------------------------------------------
-- sats_plans — product plan catalogue
-- -----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sats_plans (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT        NOT NULL UNIQUE,   -- 'free' | 'pro' | 'teams' | 'enterprise'
  display_name   TEXT        NOT NULL,
  price_cents    INT         NOT NULL DEFAULT 0, -- in base currency (USD cents)
  currency       CHAR(3)     NOT NULL DEFAULT 'USD',
  billing_period TEXT        NOT NULL DEFAULT 'monthly'
                 CHECK (billing_period IN ('monthly','annual','lifetime')),
  limits         JSONB       NOT NULL DEFAULT '{}',
  -- e.g. {"seats": 1, "analyses_per_month": 10, "storage_bytes": 5368709120}
  is_active      BOOL        NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.sats_plans (name, display_name, price_cents, limits) VALUES
  ('free',       'Free',       0,    '{"seats":1,"analyses_per_month":5,"storage_bytes":1073741824}'),
  ('pro',        'Pro',        1999, '{"seats":1,"analyses_per_month":100,"storage_bytes":10737418240}'),
  ('teams',      'Teams',      4999, '{"seats":5,"analyses_per_month":500,"storage_bytes":53687091200}'),
  ('enterprise', 'Enterprise', 0,    '{"seats":-1,"analyses_per_month":-1,"storage_bytes":-1}')
ON CONFLICT (name) DO NOTHING;

-- -----------------------------------------------------------------------
-- Wire plan_id FK onto sats_tenants (deferred from 3.1 to avoid circular dep)
-- -----------------------------------------------------------------------

ALTER TABLE public.sats_tenants
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.sats_plans(id);

-- Default all tenants to free plan
UPDATE public.sats_tenants t
SET plan_id = (SELECT id FROM public.sats_plans WHERE name = 'free')
WHERE plan_id IS NULL;

-- -----------------------------------------------------------------------
-- sats_features — global feature flag dictionary
-- -----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sats_features (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT    NOT NULL UNIQUE,  -- 'ai_roadmap' | 'byok' | 'export_pdf' etc.
  name        TEXT    NOT NULL,
  description TEXT,
  category    TEXT    NOT NULL DEFAULT 'core'
              CHECK (category IN ('core','add-on','beta','deprecated')),
  is_enabled  BOOL    NOT NULL DEFAULT true,  -- global kill-switch
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed known features
INSERT INTO public.sats_features (key, name, description, category) VALUES
  ('ats_analysis',      'ATS Analysis',         'Core ATS scoring and gap analysis',            'core'),
  ('ai_roadmap',        'AI Upskill Roadmap',   'AI-generated learning roadmap',                'core'),
  ('cv_optimisation',   'CV Optimisation Score','Isolated CV optimisation scoring',             'core'),
  ('linkedin_ingest',   'LinkedIn Ingest',      'Import profile from LinkedIn',                 'core'),
  ('byok',              'Bring Your Own Key',   'Use your own OpenAI API key',                  'add-on'),
  ('export_pdf',        'PDF Export',           'Export analyses and roadmaps as PDF',          'add-on'),
  ('multi_seat',        'Multi-seat',           'Team accounts with multiple users',            'add-on'),
  ('rag_search',        'Semantic Search',      'pgvector-powered semantic CV/job matching',    'beta')
ON CONFLICT (key) DO NOTHING;

-- -----------------------------------------------------------------------
-- sats_tenant_features — per-tenant feature overrides
-- -----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sats_tenant_features (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID    NOT NULL REFERENCES public.sats_tenants(id) ON DELETE CASCADE,
  feature_id  UUID    NOT NULL REFERENCES public.sats_features(id) ON DELETE CASCADE,
  is_enabled  BOOL    NOT NULL DEFAULT true,
  config      JSONB   NOT NULL DEFAULT '{}',
  enabled_by  UUID    REFERENCES auth.users(id),
  enabled_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, feature_id)
);

-- -----------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------

ALTER TABLE public.sats_plans           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sats_features        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sats_tenant_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read plans"
  ON public.sats_plans FOR SELECT TO authenticated USING (true);

CREATE POLICY "All authenticated users can read features"
  ON public.sats_features FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can read features for their tenant"
  ON public.sats_tenant_features FOR SELECT
  USING (
    tenant_id = '00000000-0000-0000-0000-000000000001'
    OR EXISTS (
      SELECT 1 FROM public.sats_user_role_assignments ura
      JOIN public.sats_roles r ON ura.role_id = r.id
      WHERE ura.user_id = auth.uid()
        AND r.slug IN ('owner', 'admin')
        AND (ura.expires_at IS NULL OR ura.expires_at > NOW())
    )
  );

-- -----------------------------------------------------------------------
-- Verification
-- -----------------------------------------------------------------------
-- SELECT name, display_name, price_cents FROM public.sats_plans ORDER BY price_cents;
-- Expected: 4 rows (free=0, pro=1999, teams=4999, enterprise=0)
--
-- SELECT key, category FROM public.sats_features ORDER BY category, key;
-- Expected: 8 rows

-- NOTE: Run scripts/ops/gen-types.sh after applying this migration.
