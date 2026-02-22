# LLM Runtime Quality Runbook

## Purpose

Standard operating procedure for ATS/enrichment prompt or model changes under Phase P10 controls.

## Scope

- `supabase/functions/ats-analysis-direct/index.ts`
- `supabase/functions/enrich-experiences/index.ts`
- `ops/llm-evals/*`

## Change Checklist

1. Update runtime parameters (model, fallback model, temperature, max tokens, retry attempts) via environment config.
2. Confirm structured output schema changes remain backward-compatible with parsing/storage consumers.
3. Run eval report against captured outputs:

```bash
node ops/llm-evals/run-evals.mjs --input ops/llm-evals/reports/latest.responses.json
```

4. Enforce quality gate:

```bash
bash ops/check-llm-evals.sh ops/llm-evals/reports/latest.responses.json
```

5. Record report artifact path in release notes.

## Rollback Triggers

- LLM eval gate failure (`schema_valid_rate` or evidence/risk metrics below threshold).
- Production increase in malformed responses.
- Production increase in ATS/enrichment failure rates after runtime change.

## Rollback Procedure

1. Revert env vars to previous approved model/runtime values.
2. Redeploy edge functions.
3. Re-run eval gate with prior approved responses.
4. Verify runtime metadata (`model_used`, `schema_retry_attempts_used`) in recent ATS/enrichment records.

## Verification Queries (Supabase)

```sql
-- ATS checks: model + retry metadata present
select
  id,
  analysis_data->>'model_used' as model_used,
  analysis_data->>'schema_retry_attempts_used' as schema_retries
from sats_analyses
order by created_at desc
limit 20;
```

```sql
-- Enrichment checks: suggestion contract fields present
select
  id,
  jsonb_array_length(suggestions) as suggestion_count
from enriched_experiences
order by created_at desc
limit 20;
```

## Ownership

- Engineering: implement/change prompts and runtime config.
- Product/QA: approve eval outputs and release decision.
