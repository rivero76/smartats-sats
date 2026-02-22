# Product Improvements Plan

## Update Log

- 2026-02-20 22:43:03 | Added concrete implementation plan for logging and debugging modernization for authorization review.
- 2026-02-21 00:34:53 | Added Phase P5 priorities for enrichment record management and a full account data deletion analysis.
- 2026-02-21 00:54:21 | Added Phase P6 priorities for modern SDLC operations, automation, documentation gates, and security/compliance controls.
- 2026-02-21 02:18:11 | Implemented Phase P6 baseline: `ops` automation commands, CI quality gates, docs-required checks, and diff-based secret scanning.
- 2026-02-21 02:32:24 | Added Phase P7 future priority for release-version synchronization across app artifacts, OS/runtime baselines, and database schema versions.
- 2026-02-21 02:36:51 | Added Phase P8 future priority for global readiness (multi-user hardening, i18n/l10n, multi-country compliance, and regional deployment controls).
- 2026-02-21 03:24:42 | Added Phase P9 future priority for AI runtime governance and LLM operation analytics (config editing, telemetry capture, and cost/performance/product dashboards).
- 2026-02-22 10:00:00 | Added Phase P10 prompt reliability and model quality program; started implementation with schema-locked ATS/enrichment outputs and retry validation.
- 2026-02-22 11:00:00 | Completed Phase P10 implementation: schema-locked ATS/enrichment contracts, model fallback escalation, section-aware prompt context compression, and ops eval gate tooling.
- 2026-02-22 22:10:00 | Added Phase P11 for Job Description ETL and market intelligence analytics with text + URL ingestion (no external APIs required in initial release).

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

1. 5-9 days

### Phase P9: AI Runtime Governance + LLM Operations Analytics (Future)

1. Add AI runtime parameter management:

- Create `llm_runtime_config` table to manage provider/model/temperature/max_tokens/retries/timeouts per workflow.
- Add pricing parameters (`pricing_input_per_million`, `pricing_output_per_million`) per workflow and model.
- Add admin-only UI to edit active runtime settings with validation and rollback support.

2. Add immutable config governance and auditability:

- Create `llm_runtime_config_audit` table with before/after snapshots, actor, timestamp, and reason.
- Require admin role for edits and capture full change history.
- Add "effective from" versioning for safe staged rollout.

3. Add unified LLM operations telemetry:

- Create `llm_operation_events` table with `request_id`, workflow, model, status, duration, token usage, and cost estimate.
- Standardize ingestion from ATS and enrichment edge functions with a shared telemetry helper.
- Persist structured error taxonomy (`error_type`, `http_status`, `safe_error_message`) for product and reliability analysis.

4. Add privacy-safe prompt observability controls:

- Default to storing prompt/response hashes and character counts, not raw payloads.
- Add optional time-limited secure prompt snapshot mode for debugging.
- Restrict raw prompt access with explicit admin scope and retention TTL.

5. Add AI analytics dashboards and KPI views:

- Build admin dashboard views for cost trend, token trend, latency p50/p95, and failure rate by workflow/model.
- Add product KPIs (cost per successful ATS analysis, cost per accepted enrichment, acceptance/edit/rejection correlation).
- Add anomaly alerts for cost spikes, error spikes, and latency degradation.

6. Add operational and release controls:

- Add migration-backed SQL views/materialized views for daily KPIs and model comparison.
- Add release gate checks for AI runtime config completeness and pricing validity.
- Add runbook steps for model switch, rollback, and post-change verification.

**Acceptance criteria**

1. Admin can edit AI runtime parameters safely with full immutable audit trail.
2. Every ATS and enrichment LLM call is captured in a unified telemetry table with request correlation.
3. Cost, latency, and error metrics are queryable without manual log parsing.
4. Prompt storage remains privacy-safe by default, with controlled temporary override.
5. Product, performance, and cost dashboards provide actionable trends per workflow/model.

**Estimated effort**

1. 6-10 days

### Phase P10: Prompt Reliability + Model Quality Execution (Completed)

1. Upgrade prompt execution contracts with strict structured outputs:

- Enforce `response_format.json_schema` for ATS and enrichment workflows.
- Add strict server-side schema validation and reject malformed model output.
- Add one retry path for schema/contract failures before marking request failed.

2. Strengthen ATS scoring quality and auditability:

- Replace ATS prompts with deterministic rubric-driven instructions.
- Require evidence-linked output for skill decisions and missing-skill rationale.
- Add score breakdown (`skills_alignment`, `experience_relevance`, `domain_fit`, `format_quality`) and preserve normalized `match_score`.

3. Strengthen enrichment grounding and safety:

- Require each enrichment suggestion to include `source_resume_evidence`.
- Add `risk_flag` (`low|medium|high`) for inferred skill confidence control.
- Reject unsupported suggestions without resume evidence.

4. Improve runtime controls for quality/cost balance:

- Add environment-driven runtime controls per workflow: model, temperature, `max_tokens`, schema retry attempts.
- Use low-temperature defaults for ATS and moderate defaults for enrichment.
- Add fallback escalation path hooks (future step) for high-reliability reruns.

5. Improve prompt context quality:

- Replace naive truncation-only behavior with section-aware extraction/compression (planned next increment).
- Keep stable instruction prefix and dynamic context suffix to improve cache efficiency.

6. Add evaluation harness and release gates:

- Build baseline evaluation set for ATS and enrichment quality regressions.
- Track schema-valid rate, hallucination rate, relevance score, and latency/cost metrics.
- Block runtime prompt/model changes without baseline comparison results.

**Acceptance criteria**

1. ATS and enrichment outputs are schema-valid without free-form parser dependence.
2. ATS output includes score breakdown and evidence lists with stable JSON shape.
3. Enrichment output includes source evidence and risk flags for all suggestions.
4. Runtime controls support model/temperature/max token/retry tuning via environment configuration.
5. Eval metrics are produced for model/prompt revisions before production rollout.

**Estimated effort**

1. 5-9 days

### Phase P11: Job Description ETL + Market Intelligence Analytics (Next Priority)

**P11 Ingestion Rollout Sequence**

1. `P11.1` CSV/XLS bulk import ingestion.
2. `P11.2` PDF/DOC job description file upload ingestion.
3. `P11.3` Browser extension clipper ingestion.
4. `P11.4` Email forwarding ingestion.
5. `P11.5` ATS export template ingestion (CSV/XML/JSON files, no direct API dependency).
6. `P11.6` Feed/webhook-style secure dropbox ingestion (object storage or secure upload endpoint).

1. Add JD ingestion channels for initial non-API release:

- Support direct text ingestion (copy/paste job descriptions).
- Support single-URL ingestion for user-provided job pages (no crawler behavior).
- Record ingestion metadata (`source_type`, `source_url`, `ingested_at`, `ingested_by`, consent flag).

2. Build safe ingestion and normalization pipeline:

- Convert HTML pages to normalized plain text.
- Deduplicate by normalized content hash and canonical URL.
- Preserve raw payload and normalized text versions with immutable timestamps.

3. Build structured extraction and enrichment:

- Extract role, seniority, region, company size, estimated salary, required skills, and required experience.
- Use hybrid extraction: deterministic rules first, LLM second, schema validation last.
- Store confidence per extracted field and route low-confidence records to review queue.

4. Add taxonomy mapping and analytics model:

- Canonicalize role families, seniority ladders, and skill names.
- Add warehouse-style tables/views for trend analysis by role, region, company size, and seniority.
- Add daily materialized aggregates for dashboard performance.

5. Add SaaS role model and subscription controls:

- Admin scope controls ingestion policy, taxonomy curation, QA review, and system dashboards.
- User scope consumes benchmark/report outputs based on plan entitlements.
- Keep raw source content restricted; expose only approved analytics outputs to end users.

6. Add reports and dashboards:

- Role demand and skills heatmap reports.
- Compensation benchmark reports by role/seniority/region/company size.
- Experience requirement benchmarks and trend analysis views.
- Export-ready report endpoints/CSV downloads by plan.

7. Add compliance and anti-blocking safeguards:

- Enforce terms-aware URL ingestion (single-page fetch, no recursive scraping).
- Add rate limits, request throttling, and fallback to manual text ingestion.
- Log ingestion provenance and data retention policy controls.

**Acceptance criteria**

1. Users can ingest JD data via text or URL without third-party API dependency.
2. ETL produces schema-valid structured records with confidence scores.
3. Dashboards report role, seniority, region, salary, skill, and experience metrics.
4. Admin and user capabilities are separated and subscription-aware.
5. URL ingestion follows non-crawler behavior and has auditable provenance metadata.

**Estimated effort**

1. 7-12 days

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

**Implementation status (2026-02-21 02:18:11)**

1. Completed: repository automation layer via `ops/smartats.sh` and `ops/README.md`.
2. Completed: CI quality gates via `.github/workflows/quality-gates.yml`.
3. Completed: docs gate via `ops/check-docs.sh`.
4. Completed: diff-based secret scan via `ops/check-secrets.sh`.
5. Pending hardening: make lint fully blocking after legacy lint debt remediation.

### Phase P7: Release Version Synchronization and Deployment Control (Future)

1. Create a release manifest per version (tag, commit SHA, image digest, migration set, config version).
2. Pin runtime baselines (OS/base image digests and critical toolchain versions).
3. Enforce migration-state parity gate before deploy (`supabase migration list --linked` + `db push --dry-run` clean result).
4. Enforce artifact-to-release linkage (deploy only immutable image digest built from tagged commit).
5. Add post-deploy reconciliation report (running app version, deployed image digest, DB migration head, env/config checksum).

**Acceptance criteria**

1. Every deployment has a single traceable release manifest.
2. App image digest and Git tag match for all deployed environments.
3. Database remote migration head matches repo release migration set.
4. Drift detection blocks deployment when mismatches exist.
5. Post-deploy report confirms app/runtime/database/config version alignment.

**Estimated effort**

1. 3-5 days

### Phase P8: Global MVP/1.0 Readiness for Multi-User and Multi-Country Distribution (Future)

1. Security and tenant isolation hardening:

- Independent application security assessment and threat model review.
- End-to-end RLS/policy regression tests across all user-owned tables, storage, and edge functions.
- Secrets governance hardening (rotation policy, environment scoping, and incident playbook).

2. Robustness and operations readiness:

- Define SLIs/SLOs and error budgets for auth, analysis, enrichment, and admin paths.
- Load and concurrency testing for multi-user behavior.
- Backup/restore validation drills and disaster-recovery runbook testing.

3. Multi-language product readiness (i18n/l10n):

- Introduce localization framework and translation key architecture.
- Add locale-aware date/number formatting and language switching.
- Add content review workflow for translated UX/help/legal text.

4. Multi-country compliance readiness:

- Legal/compliance mapping by target country/region (privacy, retention, deletion, consent).
- Data processing agreement and subprocessor transparency artifacts.
- Country-aware consent and policy presentation where required.

5. Regional deployment and data residency:

- Define region strategy for backend/data hosting.
- Control cross-border data transfer handling and fallback behavior.
- Add deployment gates that validate region + compliance prerequisites.

**Acceptance criteria**

1. Multi-user security controls are validated by automated tests and external review.
2. Core user journeys meet defined performance/reliability SLOs under concurrent load.
3. Product supports at least one additional language end-to-end (UI + help + key product flows).
4. Country-specific compliance checklist is documented and approved for initial launch regions.
5. Release gates block deployment if region/compliance/security prerequisites are missing.

**Estimated effort**

1. 8-14 days

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
6. Approve **P7** (release manifest + app/runtime/database version synchronization controls).
7. Approve **P8** (global v1 readiness: security hardening, i18n/l10n, compliance, and regional deployment controls).

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
