-- UPDATE LOG
-- 2026-03-28 01:00:00 | P21 Stage 5 — (fixed: expression UNIQUE → CREATE UNIQUE INDEX for slug+tenant_id)
-- 2026-03-28 01:00:00 | P21 Stage 5 — AI agent registry + session state.
--                       Creates sats_ai_agents (seeded with 17 Claude Code agents),
--                       sats_ai_sessions, sats_ai_messages.
--                       Also adds FK from sats_rag_queries.session_id → sats_ai_sessions
--                       (deferred from 20260328000000 since sats_ai_sessions didn't exist yet).
--                       Depends on: 20260328000000_p21_s5_pgvector_knowledge_base.sql

-- -----------------------------------------------------------------------
-- sats_ai_agents — agent registry
-- -----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sats_ai_agents (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID        REFERENCES public.sats_tenants(id),
  slug                  TEXT        NOT NULL,
  name                  TEXT        NOT NULL,
  type                  TEXT        NOT NULL DEFAULT 'worker'
                        CHECK (type IN ('orchestrator','worker','retriever','evaluator','scaffolder')),
  model_provider        TEXT        NOT NULL DEFAULT 'anthropic',
  model_id              TEXT        NOT NULL,
  system_prompt         TEXT,
  tools                 JSONB       NOT NULL DEFAULT '{}',
  knowledge_source_ids  UUID[]      NOT NULL DEFAULT '{}',
  max_tokens            INT,
  temperature           FLOAT       NOT NULL DEFAULT 0.0,
  status                TEXT        NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','paused','deprecated')),
  version               INT         NOT NULL DEFAULT 1,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID        REFERENCES auth.users(id),
  updated_by            UUID        REFERENCES auth.users(id)
);

-- Expression-based unique: slug is unique per tenant (NULL tenant treated as personal)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sats_ai_agents_slug_tenant
  ON public.sats_ai_agents (slug, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000001'::UUID));

-- Seed the 17 existing Claude Code agents from .claude/agents/
INSERT INTO public.sats_ai_agents (slug, name, type, model_provider, model_id, status) VALUES
  ('adr-author',           'ADR Author',               'worker',       'anthropic', 'claude-sonnet-4-6', 'active'),
  ('arch-reviewer',        'Architecture Reviewer',    'evaluator',    'anthropic', 'claude-sonnet-4-6', 'active'),
  ('component-scaffolder', 'Component Scaffolder',     'scaffolder',   'anthropic', 'claude-sonnet-4-6', 'active'),
  ('convention-auditor',   'Convention Auditor',       'evaluator',    'anthropic', 'claude-sonnet-4-6', 'active'),
  ('e2e-validator',        'E2E Validator',            'evaluator',    'anthropic', 'claude-sonnet-4-6', 'active'),
  ('edge-fn-scaffolder',   'Edge Function Scaffolder', 'scaffolder',   'anthropic', 'claude-sonnet-4-6', 'active'),
  ('incident-responder',   'Incident Responder',       'worker',       'anthropic', 'claude-sonnet-4-6', 'active'),
  ('llm-eval-runner',      'LLM Eval Runner',          'evaluator',    'anthropic', 'claude-sonnet-4-6', 'active'),
  ('migration-writer',     'Migration Writer',         'worker',       'anthropic', 'claude-sonnet-4-6', 'active'),
  ('plan-decomposer',      'Plan Decomposer',          'orchestrator', 'anthropic', 'claude-sonnet-4-6', 'active'),
  ('railway-deployer',     'Railway Deployer',         'worker',       'anthropic', 'claude-sonnet-4-6', 'active'),
  ('release-gatekeeper',   'Release Gatekeeper',       'evaluator',    'anthropic', 'claude-sonnet-4-6', 'active'),
  ('security-auditor',     'Security Auditor',         'evaluator',    'anthropic', 'claude-sonnet-4-6', 'active'),
  ('test-runner',          'Test Runner',              'worker',       'anthropic', 'claude-sonnet-4-6', 'active'),
  ('test-writer',          'Test Writer',              'worker',       'anthropic', 'claude-sonnet-4-6', 'active'),
  ('product-analyst',      'Product Analyst',          'worker',       'anthropic', 'claude-sonnet-4-6', 'active'),
  ('changelog-keeper',     'Changelog Keeper',         'worker',       'anthropic', 'claude-sonnet-4-6', 'active')
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------
-- sats_ai_sessions — persistent conversation sessions per agent
-- -----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sats_ai_sessions (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID          REFERENCES public.sats_tenants(id),
  user_id             UUID          REFERENCES auth.users(id),
  agent_id            UUID          NOT NULL REFERENCES public.sats_ai_agents(id),
  channel             TEXT          NOT NULL DEFAULT 'web'
                      CHECK (channel IN ('web','api','slack','email','cron','claude-code')),
  status              TEXT          NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','completed','error','timeout','cancelled')),
  context             JSONB         NOT NULL DEFAULT '{}',
  memory_summary      TEXT,
  -- Cost rollups (updated per turn)
  total_input_tokens  INT           NOT NULL DEFAULT 0,
  total_output_tokens INT           NOT NULL DEFAULT 0,
  total_cost_usd      NUMERIC(12,6) NOT NULL DEFAULT 0,
  started_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  ended_at            TIMESTAMPTZ
);

-- -----------------------------------------------------------------------
-- sats_ai_messages — individual turns within a session
-- -----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sats_ai_messages (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID          REFERENCES public.sats_tenants(id),
  session_id          UUID          NOT NULL
                      REFERENCES public.sats_ai_sessions(id) ON DELETE CASCADE,
  role                TEXT          NOT NULL
                      CHECK (role IN ('user','assistant','system','tool')),
  content             TEXT          NOT NULL,
  turn_index          INT           NOT NULL,
  -- Tool use (MCP / function calling)
  tool_calls          JSONB         NOT NULL DEFAULT '[]',
  tool_results        JSONB         NOT NULL DEFAULT '[]',
  -- RAG linkage
  retrieved_chunks    UUID[]        NOT NULL DEFAULT '{}',
  -- Observability
  input_tokens        INT           NOT NULL DEFAULT 0,
  output_tokens       INT           NOT NULL DEFAULT 0,
  cache_read_tokens   INT           NOT NULL DEFAULT 0,   -- Anthropic prompt cache hits
  latency_ms          INT,
  cost_usd            NUMERIC(12,6) NOT NULL DEFAULT 0,
  feedback_score      SMALLINT      CHECK (feedback_score BETWEEN 1 AND 5),
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, turn_index)
);

-- -----------------------------------------------------------------------
-- Wire deferred FK: sats_rag_queries.session_id → sats_ai_sessions
-- -----------------------------------------------------------------------

ALTER TABLE public.sats_rag_queries
  ADD CONSTRAINT fk_sats_rag_queries_session
  FOREIGN KEY (session_id) REFERENCES public.sats_ai_sessions(id)
  NOT VALID;  -- NOT VALID skips lock on existing rows (all NULL); validated online

ALTER TABLE public.sats_rag_queries
  VALIDATE CONSTRAINT fk_sats_rag_queries_session;

-- -----------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_sats_ai_sessions_user
  ON public.sats_ai_sessions (user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_sats_ai_sessions_agent
  ON public.sats_ai_sessions (agent_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_sats_ai_messages_session
  ON public.sats_ai_messages (session_id, turn_index);

-- -----------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------

ALTER TABLE public.sats_ai_agents   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sats_ai_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sats_ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read agent definitions"
  ON public.sats_ai_agents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users access their own sessions"
  ON public.sats_ai_sessions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users access messages in their sessions"
  ON public.sats_ai_messages FOR ALL
  USING (
    session_id IN (
      SELECT id FROM public.sats_ai_sessions WHERE user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------
-- Audit trigger
-- -----------------------------------------------------------------------

CREATE TRIGGER trg_audit_sats_ai_agents
  BEFORE INSERT OR UPDATE ON public.sats_ai_agents
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

-- -----------------------------------------------------------------------
-- Verification
-- -----------------------------------------------------------------------
-- SELECT COUNT(*) FROM public.sats_ai_agents;
-- Expected: 17
--
-- SELECT conname FROM pg_constraint
-- WHERE conname = 'fk_sats_rag_queries_session';
-- Expected: 1 row

-- NOTE: Run scripts/ops/gen-types.sh after applying all Stage 5 migrations.
