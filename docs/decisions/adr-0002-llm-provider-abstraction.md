# ADR-0002: LLM Provider Abstraction Layer

**Status:** Implemented
**Date:** 2026-03-01
**Implemented:** 2026-03-01
**Author:** Architecture Review (Claude Code)
**Linked Feature:** P16 Career Fit & Live Job Discovery (Story 0)

---

## Context

### Current State

SmartATS uses **OpenAI exclusively** as its LLM provider across four edge functions:

| Edge Function | Primary Model | Fallback Model |
|---|---|---|
| `ats-analysis-direct` | `gpt-4.1` | `gpt-4o-mini` |
| `async-ats-scorer` | `gpt-4.1` | `gpt-4o-mini` |
| `enrich-experiences` | `gpt-4.1-mini` | `gpt-4o-mini` |
| `generate-upskill-roadmap` | `gpt-4.1-mini` | `gpt-4o-mini` |

All calls are **direct raw HTTP `fetch()`** to the OpenAI REST API with no abstraction, no SDK, and no shared utility. Each function independently implements:

- Bearer token injection
- JSON schema construction and structured output enforcement
- Error mapping (`mapProviderError()`)
- Schema unsupported detection (`isSchemaUnsupportedError()`)
- Retry logic with model candidate fallback
- JSON parsing with fallback
- Cost estimation

This means the same logic is duplicated in four places. A provider switch or a bug fix to error handling requires changes in four files.

### Business Drivers for Abstraction

1. **Cost optimisation**: OpenAI pricing may be outperformed by Anthropic (Claude), Google (Gemini), Groq (Llama), or Mistral for specific task types.
2. **Regional compliance**: Future enterprise customers in BR, AU, NZ, or EU may require data residency or specific approved providers.
3. **Model quality**: Different models may outperform GPT-4.1 on specific tasks (e.g., Claude Opus on long-context resume analysis).
4. **Risk mitigation**: Provider outage should not require a code deployment to switch to a backup.
5. **Cost tracking accuracy**: Pricing per model per provider varies; centralised tracking is cleaner.

---

## Decision

Create a **shared LLM provider utility** at `supabase/functions/_shared/llmProvider.ts` that:

1. Reads the active provider from environment variable `SATS_LLM_PROVIDER` (default: `openai`).
2. Exposes a single `callLLM(request: LLMRequest): Promise<LLMResponse>` function.
3. Handles all provider-specific HTTP call construction, error mapping, retry, and schema adaptation internally.
4. Supports structured JSON output (schema-locked) for all providers that support it; falls back to prompt-embedded schema instruction for those that do not.

All four existing edge functions and all new edge functions in P16 must import and use this utility rather than calling provider APIs directly.

---

## Provider Support Matrix

| Provider | Env Value | Structured JSON Output | Notes |
|---|---|---|---|
| OpenAI | `openai` | Native (`response_format.json_schema`) | Current provider |
| Anthropic (Claude) | `anthropic` | Prompt-embedded schema | Tool use or system prompt approach |
| Google Gemini | `gemini` | Native (`response_mime_type: application/json`) | Requires Gemini 1.5+ |
| Groq | `groq` | Native (OpenAI-compatible API) | Fastest inference, lower cost |
| Mistral | `mistral` | Native (JSON mode) | European provider, GDPR advantage |

---

## Interface Contract

```typescript
// supabase/functions/_shared/llmProvider.ts

export interface LLMRequest {
  systemPrompt: string
  userPrompt: string
  jsonSchema?: object          // If provided, enforce structured output
  temperature?: number         // Default: 0.1
  maxTokens?: number           // Default: 1800
  taskLabel: string            // For logging/cost attribution, e.g. 'ats-scoring'
}

export interface LLMResponse {
  content: string              // Raw LLM output (always a string)
  parsed: unknown              // Parsed JSON if jsonSchema was provided
  model: string                // Actual model used (primary or fallback)
  provider: string             // Active provider name
  promptTokens: number
  completionTokens: number
  costEstimateUsd: number
  durationMs: number
}

export async function callLLM(request: LLMRequest): Promise<LLMResponse>
```

---

## Environment Variables (New)

| Variable | Description | Default |
|---|---|---|
| `SATS_LLM_PROVIDER` | Active provider: `openai`, `anthropic`, `gemini`, `groq`, `mistral` | `openai` |
| `OPENAI_API_KEY` | OpenAI key (existing) | Required if provider=openai |
| `ANTHROPIC_API_KEY` | Anthropic key | Required if provider=anthropic |
| `GEMINI_API_KEY` | Google Gemini key | Required if provider=gemini |
| `GROQ_API_KEY` | Groq key | Required if provider=groq |
| `MISTRAL_API_KEY` | Mistral key | Required if provider=mistral |
| `SATS_LLM_MODEL_PRIMARY` | Override primary model name | Provider default |
| `SATS_LLM_MODEL_FALLBACK` | Override fallback model name | Provider default |
| `OPENAI_API_BASE_URL` | OpenAI base URL override (existing) | `https://api.openai.com/v1` |

---

## Migration Path

### Phase 1 — Create the utility (P16 Story 0)
- Implement `supabase/functions/_shared/llmProvider.ts`
- Implement OpenAI adapter only (move existing logic in)
- All new P16 edge functions use the utility from day one

### Phase 2 — Migrate existing functions (P16 Story 0 extension)
- Refactor `ats-analysis-direct`, `async-ats-scorer`, `enrich-experiences`, `generate-upskill-roadmap` to import `callLLM`
- Existing behaviour and schemas unchanged
- Run full test suite to confirm no regression

### Phase 3 — Add additional provider adapters (on demand)
- Add `anthropic`, `gemini`, `groq`, or `mistral` adapter when business need arises
- No edge function code changes required — provider switch via env var only

---

## Alternatives Considered

| Option | Rejected Reason |
|---|---|
| Continue with direct OpenAI calls | Provider lock-in; maintenance debt grows with each new edge function |
| Use the OpenAI Node.js SDK | Supabase Edge Functions run Deno; SDK compatibility is inconsistent and adds bundle weight |
| Use a third-party LLM gateway (LiteLLM, PortKey) | External dependency, additional cost, latency hop, reduced control |
| Per-function provider config | Still duplicates routing logic; no single switch point |

---

## Consequences

**Positive:**
- Single environment variable to switch LLM provider across all functions
- Bug fixes to error handling, retry logic, and cost tracking in one place
- New edge functions require zero provider boilerplate
- Cost tracking centralised and consistent

**Negative:**
- One-time migration effort for four existing functions
- Abstract interface must be kept provider-accurate (schema conversion per provider)
- New provider adapters must be validated with full schema-lock regression tests

---

## Documentation Impact

- `docs/architecture.md` — Add LLM provider section and note current provider + abstraction status
- `docs/runbooks/llm-runtime-quality.md` — Update with provider switching runbook
- `.env.example` — Add `SATS_LLM_PROVIDER` and all provider key stubs
- `scripts/ops/check-secrets.sh` — Add provider key scanning per active provider
