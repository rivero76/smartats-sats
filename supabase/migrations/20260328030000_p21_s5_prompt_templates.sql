-- UPDATE LOG
-- 2026-03-28 03:00:00 | P21 Stage 5 — Prompt template versioning + AI evaluation scores.
--                       Creates sats_prompt_templates (versioned, agent-linked) and
--                       sats_ai_evaluations (LLM-as-judge + human eval scores).
--                       Adds prompt_template_id + prompt_version to sats_llm_call_logs.
--                       Admin policy uses sats_has_permission() from Stage 2.
--                       Depends on: 20260328010000_p21_s5_ai_agent_infrastructure.sql

-- -----------------------------------------------------------------------
-- sats_prompt_templates — versioned prompt store
-- Moves inline prompts (currently hardcoded in edge functions) into the DB.
-- Enables A/B testing, regression detection, and audit history.
-- -----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sats_prompt_templates (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        REFERENCES public.sats_tenants(id),
  agent_id        UUID        REFERENCES public.sats_ai_agents(id),
  name            TEXT        NOT NULL,   -- e.g. 'ats-analysis-system-prompt'
  role            TEXT        NOT NULL DEFAULT 'system'
                  CHECK (role IN ('system','user','assistant')),
  template        TEXT        NOT NULL,   -- body with {{variable}} slots
  variables       JSONB       NOT NULL DEFAULT '{}',   -- expected variable schema
  version         INT         NOT NULL DEFAULT 1,
  is_active       BOOL        NOT NULL DEFAULT true,
  -- Audit
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID        REFERENCES auth.users(id),
  updated_by      UUID        REFERENCES auth.users(id),
  deleted_at      TIMESTAMPTZ
);

-- Expression-based unique: one version per (name, tenant)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sats_prompt_templates_name_version_tenant
  ON public.sats_prompt_templates (
    name,
    version,
    COALESCE(tenant_id, '00000000-0000-0000-0000-000000000001'::UUID)
  );

-- Attach audit trigger
CREATE TRIGGER trg_audit_sats_prompt_templates
  BEFORE INSERT OR UPDATE ON public.sats_prompt_templates
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

-- -----------------------------------------------------------------------
-- Wire prompt linkage onto sats_llm_call_logs
-- -----------------------------------------------------------------------

ALTER TABLE public.sats_llm_call_logs
  ADD COLUMN IF NOT EXISTS prompt_template_id UUID
    REFERENCES public.sats_prompt_templates(id),
  ADD COLUMN IF NOT EXISTS prompt_version INT;

-- -----------------------------------------------------------------------
-- sats_ai_evaluations — LLM-as-judge + human eval scores
-- -----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sats_ai_evaluations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        REFERENCES public.sats_tenants(id),
  message_id      UUID        NOT NULL REFERENCES public.sats_ai_messages(id),
  evaluator_type  TEXT        NOT NULL DEFAULT 'automated'
                  CHECK (evaluator_type IN ('human','llm-judge','automated','rule-based')),
  evaluator_id    UUID,       -- FK to auth.users or sats_ai_agents depending on evaluator_type
  metric          TEXT        NOT NULL,
  -- e.g. 'faithfulness' | 'relevance' | 'hallucination_rate' | 'safety' | 'ats_accuracy'
  score           FLOAT       NOT NULL CHECK (score BETWEEN 0 AND 1),
  reasoning       TEXT,
  expected_output TEXT,
  evaluated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sats_ai_evals_message
  ON public.sats_ai_evaluations (message_id, metric);

CREATE INDEX IF NOT EXISTS idx_sats_ai_evals_metric
  ON public.sats_ai_evaluations (metric, evaluated_at DESC);

-- -----------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------

ALTER TABLE public.sats_prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sats_ai_evaluations   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their tenant prompt templates"
  ON public.sats_prompt_templates FOR SELECT
  USING (tenant_id IS NULL OR created_by = auth.uid());

CREATE POLICY "Admins manage prompt templates"
  ON public.sats_prompt_templates FOR ALL
  USING (sats_has_permission('prompts', 'admin', 'global'));

CREATE POLICY "Users read evaluations for their messages"
  ON public.sats_ai_evaluations FOR SELECT
  USING (
    message_id IN (
      SELECT m.id FROM public.sats_ai_messages m
      JOIN public.sats_ai_sessions s ON m.session_id = s.id
      WHERE s.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role inserts evaluations"
  ON public.sats_ai_evaluations FOR INSERT
  WITH CHECK (true);

-- -----------------------------------------------------------------------
-- Verification
-- -----------------------------------------------------------------------
-- SELECT tablename FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN ('sats_prompt_templates','sats_ai_evaluations')
-- ORDER BY tablename;
-- Expected: 2 rows
--
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'sats_llm_call_logs'
--   AND column_name IN ('prompt_template_id','prompt_version');
-- Expected: 2 rows

-- NOTE: Run scripts/ops/gen-types.sh after applying this migration.
