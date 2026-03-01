# SmartATS Coding Conventions

**Effective from:** 2026-03-01
**Owner:** Architecture (Claude Code) + Implementation (Codex)
**Applies to:** All code in `src/`, `supabase/`, `scripts/`, `tests/`

---

## 1. Database Table Naming

### Rule: `sats_` lowercase prefix + `snake_case`

All **new** tables must follow this convention:

```
sats_<noun_plural>
```

Examples:
- `sats_resumes` ✓
- `sats_analyses` ✓
- `sats_job_descriptions` ✓
- `sats_user_skills` ✓
- `sats_career_profiles` ✓ (new P16 tables)
- `sats_job_listings` ✓ (new P16 tables)

### Legacy Table Exceptions

The following tables **predate this convention** and will **NOT be renamed** due to high-risk migration impact (cascading RLS policies, hooks, generated types, foreign keys):

| Table | Legacy Reason |
|---|---|
| `SATS_resumes` | Original uppercase naming |
| `document_extractions` | No-prefix era |
| `error_logs` | No-prefix era |
| `profiles` | Supabase convention, no prefix |

These are documented as legacy exceptions. Any new FK references to these tables must use the existing name as-is.

---

## 2. Migration File Naming

Pattern: `YYYYMMDDHHMMSS_<short_description>.sql`

Examples:
- `20260301000000_p13_allow_skill_insert.sql` ✓
- `20260301120000_p16_create_career_profiles.sql` ✓
- `add_column.sql` ✗ (missing timestamp)
- `20260301_career.sql` ✗ (incomplete timestamp)

The timestamp must be 14 digits (ISO-like, no separators). Use the actual creation time in UTC.

---

## 3. Edge Function Structure

### One function per directory

```
supabase/functions/
  _shared/            ← shared utilities (no entry point)
  ats-analysis-direct/
    index.ts          ← entry point
  enrich-experiences/
    index.ts
```

### Import shared utilities from `../_shared/`

All edge functions must import from the `_shared/` layer:

```typescript
import { isOriginAllowed, buildCorsHeaders } from '../_shared/cors.ts'
import { getEnvNumber, getEnvBoolean } from '../_shared/env.ts'
import { callLLM, type LLMRequest } from '../_shared/llmProvider.ts'
```

**No direct OpenAI HTTP calls** are allowed in edge functions. All LLM calls must go through `callLLM()` in `_shared/llmProvider.ts`.

---

## 4. TypeScript / Frontend Conventions

| Construct | Convention | Example |
|---|---|---|
| React components | `PascalCase` | `ResumeCard.tsx`, `JobMatchPanel.tsx` |
| Hooks | `camelCase`, `use` prefix | `useResumeAnalysis.ts` |
| Utilities / helpers | `camelCase` | `formatScore.ts`, `buildPrompt.ts` |
| File names in `src/` | `kebab-case` | `resume-upload.tsx`, `job-match-panel.tsx` |
| Interfaces / types | `PascalCase` | `ATSAnalysisResult`, `LLMRequest` |
| Enum-like string unions | `camelCase` values | `'low' \| 'medium' \| 'high'` |

---

## 5. File Header UPDATE LOG

**Every modified TypeScript, JavaScript, or SQL file must have an UPDATE LOG block at the top.** This applies to all files created or modified during development.

### Format (TypeScript/JavaScript):

```typescript
/**
 * UPDATE LOG
 * YYYY-MM-DD HH:MM:SS | <description of change>
 * YYYY-MM-DD HH:MM:SS | <description of next change>
 */
```

### Format (SQL):

```sql
-- UPDATE LOG
-- YYYY-MM-DD HH:MM:SS | <description of change>
```

### Format (HTML/SVG):

```html
<!-- UPDATE LOG -->
<!-- YYYY-MM-DD HH:MM:SS | description -->
```

Rules:
- If a header block already exists, **append** a new line; do not replace existing entries.
- Use the current date and UTC time at the moment of the change.
- Keep descriptions concise but meaningful (reference plan ID and story where applicable).

---

## 6. Shared Module Imports — LLM Calls

> **All LLM calls must go through `_shared/llmProvider.ts`.**

This is a hard rule, not a guideline:

```typescript
// ✓ Correct
import { callLLM } from '../_shared/llmProvider.ts'
const result = await callLLM({ ... })

// ✗ Forbidden
const response = await fetch('https://api.openai.com/v1/chat/completions', { ... })
```

The `callLLM` function:
- Reads `SATS_LLM_PROVIDER` from env (default: `openai`)
- Routes to the correct provider adapter
- Handles retry logic, schema fallback, error mapping, and cost estimation
- Returns a typed `LLMResponse` with `rawContent`, `modelUsed`, `costEstimateUsd`, etc.

See `supabase/functions/_shared/llmProvider.ts` and `docs/decisions/adr-0002-llm-provider-abstraction.md` for full details.

---

## 7. Environment Variable Naming

| Scope | Pattern | Example |
|---|---|---|
| Global SATS config | `SATS_<NOUN>` | `SATS_LLM_PROVIDER` |
| OpenAI config | `OPENAI_<NOUN>` | `OPENAI_API_KEY`, `OPENAI_MODEL_ATS` |
| Task-specific model | `OPENAI_MODEL_<TASK>` | `OPENAI_MODEL_ATS`, `OPENAI_MODEL_ENRICH` |
| Task-specific params | `OPENAI_<PARAM>_<TASK>` | `OPENAI_TEMPERATURE_ATS`, `OPENAI_MAX_TOKENS_ENRICH` |
| Feature flags | `SATS_<FEATURE>_ENABLED` | `SATS_PROACTIVE_MATCH_ENABLED` |
| Storage flags | `STORE_LLM_<NOUN>` | `STORE_LLM_PROMPTS`, `STORE_LLM_RAW_RESPONSE` |

---

## 8. Error Handling Principles

1. **Fail fast on config errors** — validate env vars at the top of edge functions; return 503 (not 500) for misconfiguration.
2. **Never log raw provider payloads** — use `mapProviderError()` to produce safe messages; do not forward provider error bodies to clients.
3. **Use structured error types** — prefer typed error classes (e.g., `EnrichmentConfigError`) over bare `Error` for distinguishable error codes.
4. **Telemetry must not block** — wrap all `logEvent()` / centralized-logging calls in `try/catch`; never let logging failures surface to callers.

---

## 9. Compliance with This Document

- New edge functions **must** import from `_shared/` and use `callLLM`.
- New DB tables **must** use the `sats_` prefix.
- PRs that violate the naming conventions will be flagged in architecture review.
- Legacy exceptions are only added via explicit ADR or architecture decision; they do not accumulate silently.
