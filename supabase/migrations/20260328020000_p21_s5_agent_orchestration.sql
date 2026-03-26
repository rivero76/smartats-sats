-- UPDATE LOG
-- 2026-03-28 02:00:00 | P21 Stage 5 — Multi-agent orchestration tables.
--                       Creates sats_agent_tasks (subtask hierarchy), sats_agent_handoffs
--                       (inter-agent handoff log), sats_agent_memory (persistent context +
--                       semantic vector retrieval via value_embedding VECTOR(1536)).
--                       Depends on: 20260328010000_p21_s5_ai_agent_infrastructure.sql

-- -----------------------------------------------------------------------
-- sats_agent_tasks — DB-layer work coordination
-- -----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sats_agent_tasks (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID        REFERENCES public.sats_tenants(id),
  session_id            UUID        REFERENCES public.sats_ai_sessions(id),
  parent_task_id        UUID        REFERENCES public.sats_agent_tasks(id),  -- subtask hierarchy
  assigned_agent_id     UUID        NOT NULL REFERENCES public.sats_ai_agents(id),
  objective             TEXT        NOT NULL,
  status                TEXT        NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','running','completed','failed','cancelled','awaiting_review')),
  priority              SMALLINT    NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  input_payload         JSONB       NOT NULL DEFAULT '{}',
  output_payload        JSONB,
  retry_count           INT         NOT NULL DEFAULT 0,
  max_retries           INT         NOT NULL DEFAULT 2,
  requires_human_review BOOL        NOT NULL DEFAULT false,
  reviewed_by           UUID        REFERENCES auth.users(id),
  reviewed_at           TIMESTAMPTZ,
  review_notes          TEXT,
  started_at            TIMESTAMPTZ,
  ended_at              TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID        REFERENCES auth.users(id)
);

-- -----------------------------------------------------------------------
-- sats_agent_handoffs — inter-agent handoff event log
-- The most critical table for debugging multi-agent pipelines.
-- -----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sats_agent_handoffs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        REFERENCES public.sats_tenants(id),
  task_id         UUID        NOT NULL REFERENCES public.sats_agent_tasks(id),
  from_agent_id   UUID        NOT NULL REFERENCES public.sats_ai_agents(id),
  to_agent_id     UUID        NOT NULL REFERENCES public.sats_ai_agents(id),
  reason          TEXT        NOT NULL,
  context_passed  JSONB       NOT NULL DEFAULT '{}',
  protocol        TEXT        NOT NULL DEFAULT 'internal'
                  CHECK (protocol IN ('mcp','a2a','api','queue','internal')),
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------
-- sats_agent_memory — persistent context across sessions
-- value_embedding enables semantic memory retrieval via pgvector.
-- -----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sats_agent_memory (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        REFERENCES public.sats_tenants(id),
  agent_id        UUID        NOT NULL REFERENCES public.sats_ai_agents(id),
  user_id         UUID        REFERENCES auth.users(id),  -- NULL = global agent memory
  scope           TEXT        NOT NULL DEFAULT 'user'
                  CHECK (scope IN ('ephemeral','session','user','global')),
  key             TEXT        NOT NULL,
  value           JSONB       NOT NULL DEFAULT '{}',
  value_embedding VECTOR(1536),    -- for semantic memory retrieval via HNSW
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Expression-based unique: one memory entry per (agent, user-or-null, key, scope)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sats_agent_memory_unique
  ON public.sats_agent_memory (
    agent_id,
    COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::UUID),
    key,
    scope
  );

-- HNSW index for semantic memory retrieval
CREATE INDEX IF NOT EXISTS idx_sats_agent_memory_embedding
  ON public.sats_agent_memory
  USING hnsw (value_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- -----------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_sats_agent_tasks_session
  ON public.sats_agent_tasks (session_id, status);

CREATE INDEX IF NOT EXISTS idx_sats_agent_tasks_agent
  ON public.sats_agent_tasks (assigned_agent_id, status);

CREATE INDEX IF NOT EXISTS idx_sats_agent_handoffs_task
  ON public.sats_agent_handoffs (task_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_sats_agent_memory_user
  ON public.sats_agent_memory (agent_id, user_id, scope);

-- -----------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------

ALTER TABLE public.sats_agent_tasks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sats_agent_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sats_agent_memory   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access their own agent tasks"
  ON public.sats_agent_tasks FOR ALL
  USING (
    session_id IN (SELECT id FROM public.sats_ai_sessions WHERE user_id = auth.uid())
    OR created_by = auth.uid()
  );

CREATE POLICY "Users access handoffs in their tasks"
  ON public.sats_agent_handoffs FOR SELECT
  USING (
    task_id IN (
      SELECT id FROM public.sats_agent_tasks WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users access their agent memory"
  ON public.sats_agent_memory FOR ALL
  USING (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------
-- Verification
-- -----------------------------------------------------------------------
-- SELECT tablename FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN ('sats_agent_tasks','sats_agent_handoffs','sats_agent_memory')
-- ORDER BY tablename;
-- Expected: 3 rows

-- NOTE: Run scripts/ops/gen-types.sh after applying all Stage 5 migrations.
