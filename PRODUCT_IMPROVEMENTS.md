# Product Improvements Plan

## Update Log
- 2026-02-20 22:43:03 | Added concrete implementation plan for logging and debugging modernization for authorization review.

## 1. Scope and Goals
1. Remove security and observability risks in current logging pipeline.
2. Standardize logs across frontend and all edge functions.
3. Add reliable tracing, retention automation, and operational dashboards.
4. Preserve current Admin Logging UI while upgrading backend behavior.

## 2. Delivery Phases

### Phase P0: Security + Guardrails (Must-do first)
1. Remove hardcoded fallback token in `src/lib/centralizedLogger.ts`.
2. Add metadata redaction utility for secrets/PII before sending logs.
3. Add route-level admin guard for `/admin` access.
4. Define allowed log metadata keys per script.

**Acceptance criteria**
1. No token literals in frontend logging code.
2. Sensitive fields are masked in stored `log_entries`.
3. Non-admin authenticated users cannot access `/admin`.
4. Existing logging UI still works.

**Estimated effort**
1. 1-2 days

### Phase P1: Unified Structured Logging
1. Introduce a shared log event schema:
`event_name`, `component`, `operation`, `outcome`, `duration_ms`, `request_id`, `session_id`, `user_id`, `metadata`.
2. Update frontend loggers (`authLogger`, `documentLogger`, `jobDescriptionLogger`, enrichment hooks) to emit schema-compliant events.
3. Update edge functions (`ats-analysis-direct`, `delete-account`, `cancel-account-deletion`) to use centralized logger endpoint instead of only `console.*`.
4. Add validation in `supabase/functions/centralized-logging/index.ts` for schema shape and payload size.

**Acceptance criteria**
1. 90%+ of new logs conform to schema fields.
2. All core edge functions write to `log_entries`.
3. Logs remain queryable in existing `LogViewer`.

**Estimated effort**
1. 3-5 days

### Phase P2: Correlation + Tracing
1. Generate `request_id` per user action in frontend hooks.
2. Propagate `request_id` through edge function invocation payloads.
3. Persist and display `request_id` in `LogViewer` and `ATSDebugModal`.
4. Add operation timers for key flows:
ATS analysis trigger, retry, enrichment generation, document extraction.

**Acceptance criteria**
1. Single `request_id` can trace a full flow end-to-end.
2. `duration_ms` present on key operations.
3. Debug modal can link to related logs by `request_id`.

**Estimated effort**
1. 2-3 days

### Phase P3: Retention Automation + Reliability
1. Implement scheduled cleanup job based on `log_cleanup_policies`.
2. Add write throttling/sampling for TRACE and DEBUG levels.
3. Add retries with exponential backoff for transient logging failures.
4. Add max size controls and truncation for oversized metadata.

**Acceptance criteria**
1. Old logs are cleaned automatically per policy.
2. Logging failures do not break business flows.
3. Storage growth is bounded and predictable.

**Estimated effort**
1. 2-4 days

### Phase P4: Operational Features (Future-ready)
1. Add admin dashboards for:
error rate, per-script volume, p95 latency, ATS/enrichment failure trends, model cost trends.
2. Add alert rules:
error spikes, repeated failures, abnormal token/cost usage.
3. Add immutable audit trail for log settings changes.

**Acceptance criteria**
1. Admin can detect and triage incidents without raw SQL.
2. Alerts trigger on defined thresholds.
3. Setting changes are fully auditable.

**Estimated effort**
1. 4-6 days

## 3. Technical Work Packages (Concrete)

1. Frontend core
- `src/lib/centralizedLogger.ts`
- `src/lib/authLogger.ts`
- `src/lib/documentLogger.ts`
- `src/lib/jobDescriptionLogger.ts`
- `src/hooks/useDirectATSAnalysis.ts`
- `src/hooks/useRetryATSAnalysis.ts`
- `src/hooks/useEnrichedExperiences.ts`
- `src/components/ATSDebugModal.tsx`
- `src/App.tsx` and route guard components

2. Edge functions
- `supabase/functions/centralized-logging/index.ts`
- `supabase/functions/ats-analysis-direct/index.ts`
- `supabase/functions/enrich-experiences/index.ts`
- `supabase/functions/delete-account/index.ts`
- `supabase/functions/cancel-account-deletion/index.ts`

3. Database / migrations
- Add schema fields/indexes if needed for correlation and retention.
- Add scheduled cleanup mechanism.
- Add audit table/policies for log setting updates.

4. Admin UI
- `src/components/admin/LogViewer.tsx`
- `src/components/admin/LoggingControlPanel.tsx`
- `src/components/admin/LogCleanupManager.tsx`
- New observability cards in `src/pages/AdminDashboard.tsx` (or dedicated page)

## 4. Risk Controls
1. Feature-flag new logger behavior to allow rollback.
2. Keep current logging tables and UI contracts backward compatible.
3. Deploy in sequence: DB migration -> edge functions -> frontend.
4. Add smoke tests for auth, ATS analysis, enrichment, and admin logging screens.

## 5. Authorization Options
1. Approve **P0 only** (fast risk reduction).
2. Approve **P0 + P1 + P2** (production-ready observability baseline).
3. Approve **Full P0-P4** (complete modernization roadmap).
