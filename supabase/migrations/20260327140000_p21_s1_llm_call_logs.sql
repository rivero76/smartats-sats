-- UPDATE LOG
-- 2026-03-27 14:00:00 | P21 Stage 1 — Create sats_llm_call_logs table.
--                       All 4 LLM edge functions track tokens/cost/latency in-flight via llmProvider.ts
--                       but write nothing to the DB. This table persists every LLM call for billing
--                       audit, cost governance, and model performance analysis.
--                       RLS: users see their own logs; admins see all; service_role inserts.
-- 2026-03-27 14:30:00 | Renamed from llm_call_logs → sats_llm_call_logs to comply with sats_ prefix
--                       convention (naming convention audit 2026-03-27).

CREATE TABLE IF NOT EXISTS public.sats_llm_call_logs (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Actor
  user_id           UUID          REFERENCES auth.users(id),
  function_name     TEXT          NOT NULL,        -- edge function name e.g. 'ats-analysis-direct'
  -- Model
  model_provider    TEXT          NOT NULL DEFAULT 'openai',
  model_id          TEXT          NOT NULL,        -- exact model string e.g. 'gpt-4.1-mini'
  -- Tokens & cost (mirrors LLMResponse fields in supabase/functions/_shared/llmProvider.ts)
  prompt_tokens     INT           NOT NULL DEFAULT 0,
  completion_tokens INT           NOT NULL DEFAULT 0,
  total_tokens      INT           GENERATED ALWAYS AS (prompt_tokens + completion_tokens) STORED,
  cost_usd          NUMERIC(12,6) NOT NULL DEFAULT 0,
  duration_ms       INT,
  -- Outcome
  finish_reason     TEXT,         -- 'stop' | 'max_tokens' | 'error' | 'filtered'
  error_code        TEXT,         -- provider HTTP status if failure
  -- Context linkage
  run_id            UUID          REFERENCES public.ats_runs(id),
  analysis_id       UUID          REFERENCES public.sats_analyses(id),
  -- Tracing (future OpenTelemetry integration)
  trace_id          TEXT,
  span_id           TEXT,
  -- Timestamp
  called_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Indexes for the primary query patterns
CREATE INDEX IF NOT EXISTS idx_sats_llm_logs_called_at
  ON public.sats_llm_call_logs (called_at DESC);

CREATE INDEX IF NOT EXISTS idx_sats_llm_logs_user_id
  ON public.sats_llm_call_logs (user_id, called_at DESC);

CREATE INDEX IF NOT EXISTS idx_sats_llm_logs_function
  ON public.sats_llm_call_logs (function_name, called_at DESC);

-- -----------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------

ALTER TABLE public.sats_llm_call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own LLM logs"
  ON public.sats_llm_call_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all LLM logs"
  ON public.sats_llm_call_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Service role bypasses RLS; edge functions use the service_role key to insert
CREATE POLICY "Service role inserts LLM logs"
  ON public.sats_llm_call_logs FOR INSERT
  WITH CHECK (true);

-- -----------------------------------------------------------------------
-- Next step: wire llmProvider.ts to insert a row after each successful call.
-- Add to LLMResponse handler in supabase/functions/_shared/llmProvider.ts:
--
-- await supabaseAdmin.from('sats_llm_call_logs').insert({
--   user_id:           userId,
--   function_name:     functionName,
--   model_provider:    'openai',
--   model_id:          response.modelUsed,
--   prompt_tokens:     response.promptTokens,
--   completion_tokens: response.completionTokens,
--   cost_usd:          response.costEstimateUsd,
--   duration_ms:       response.durationMs,
--   finish_reason:     response.finishReason ?? 'stop',
--   run_id:            context.runId ?? null,
--   analysis_id:       context.analysisId ?? null,
-- });
-- -----------------------------------------------------------------------

-- -----------------------------------------------------------------------
-- Verification
-- -----------------------------------------------------------------------
-- SELECT COUNT(*) FROM public.sats_llm_call_logs;
-- Run one ATS analysis, then check count > 0 (after wiring llmProvider.ts)

-- NOTE: Run scripts/ops/gen-types.sh after applying this migration.
