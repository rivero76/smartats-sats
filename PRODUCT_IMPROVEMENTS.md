# Product Improvements Plan

## Update Log
- 2026-02-20 22:43:03 | Added concrete implementation plan for logging and debugging modernization for authorization review.
- 2026-02-21 00:34:53 | Added Phase P5 priorities for enrichment record management and a full account data deletion analysis.
- 2026-02-21 00:54:21 | Added Phase P6 priorities for modern SDLC operations, automation, documentation gates, and security/compliance controls.

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

### Phase P5: Enrichment Lifecycle + User Data Erasure (Next Priority)
1. Add enriched experience record identity and time metadata in UI:
- Show short record id.
- Show `created_at` and `updated_at`.
2. Add enriched experience update capability:
- Edit existing suggestion text and metadata.
- Keep audit metadata (`updated_at`, `edited_by_user` flag).
3. Add enriched experience delete capability:
- Soft-delete first (`deleted_at`, `deleted_reason`) with optional restore window.
- Hard-delete via scheduled purge after retention window.
4. Add self-serve full account data deletion:
- One-click user request to delete all personal records.
- Async job that deletes user-linked rows across all owned tables and storage objects.
- Confirmation step with irreversible warning.
5. Add compliance-grade deletion trail:
- Track request timestamp, completion timestamp, status, and deletion scope summary.
- Preserve minimal legal/audit artifact without storing recoverable personal data.

**Acceptance criteria**
1. Users can view id and timestamps for each enriched experience.
2. Users can edit and delete enriched experiences without admin support.
3. Users can trigger complete data deletion and receive status feedback.
4. Deletion removes user-owned rows and files from storage.
5. Deletion logs are auditable and privacy-safe.

**Estimated effort**
1. 5-8 days

### Phase P6: Modern SDLC Operations and Product Governance
1. Create repository automation layer (`ops/`):
- Start/stop/restart dev and prod services.
- Verification commands (`lint`, `build`, `test`, smoke checks).
- Log tail/filter/export commands.
- Safe git helper commands (`status`, branch checks, guarded push helpers).
2. Add CI/CD quality gates:
- Require passing verification pipeline before merge.
- Require documentation updates for user-facing changes.
- Add link checks and doc completeness checks.
3. Enforce docs-as-release-artifact:
- Product spec, release notes, help updates, and runbook updates included in Definition of Done.
4. Strengthen observability and alerting operations:
- Standard alert thresholds and incident runbook linkage.
- Post-release monitoring checklist.
5. Strengthen security/compliance workflow:
- Secrets scanning and no-secrets-in-code policy checks.
- Data retention/deletion policy enforcement checks.
- Access/audit review cadence.

**Acceptance criteria**
1. Team can run common lifecycle tasks from a single `ops` entrypoint.
2. PRs are blocked when required checks/docs are missing.
3. Every release includes spec/help/release-note artifacts.
4. Incident response and rollback steps are documented and tested.
5. Security/compliance checks run consistently in pipeline.

**Estimated effort**
1. 4-7 days

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
4. Approve **P5** (enrichment record lifecycle + full account data erasure).
5. Approve **P6** (modern SDLC automation, docs quality gates, and governance controls).

## 6. Full Data Deletion Analysis (Subscription Stop / Right to Erasure)

### Why this feature is important
1. Reduces churn friction by giving users control at subscription end.
2. Supports privacy expectations and legal obligations.
3. Builds trust by proving data ownership and portability/deletion rights.

### Recommended product flow
1. User clicks `Delete all my data` in settings.
2. User confirms with strong warning and re-authentication.
3. System creates deletion request with status `queued`.
4. Background worker executes deletion plan:
- Revoke sessions/tokens.
- Delete storage files.
- Delete user-owned rows from product tables.
- Optionally anonymize immutable audit rows if required.
5. System marks request `completed` or `failed` and stores a minimal audit result.

### Deletion scope checklist
1. Authentication profile and sessions.
2. Resumes and extracted documents.
3. Job descriptions, analyses, and enrichment records.
4. Logging data tied to user id (subject to security retention policy).
5. Files/blobs in storage buckets.

### Risks and controls
1. Partial deletion risk:
- Control: idempotent job + retryable step runner + final verification query.
2. Irreversible action risk:
- Control: explicit consent + re-auth + cooling-off option (optional).
3. Compliance conflict (audit/security retention):
- Control: define minimal retention policy and anonymize where deletion is not legally allowed.
4. Support burden:
- Control: expose deletion status and reason codes in UI.

### Suggested rollout
1. V1: user request + async execution + completion status.
2. V2: soft-delete grace window and restore before hard purge.
3. V3: downloadable deletion report and SLA timers.
