<!-- UPDATE LOG -->
<!-- 2026-04-07 | AWS Well-Architected Framework Review — arch-reviewer agent, full 6-pillar review -->

# SmartATS — AWS Well-Architected Framework Review

**Date:** 2026-04-07  
**Reviewer:** arch-reviewer agent  
**Branch reviewed:** main (post-merge of p20-data-deletion)  
**Files read:** 45+ source files across edge functions, migrations, frontend hooks, CI config, runbooks, and help content  
**Verdict:** CHANGES REQUIRED

---

## Executive Summary

**Pillar 1 — Operational Excellence:** The observability stack is well-constructed: centralised logging edge function, `centralizedLogger.ts` with sampling/rate-limiting/redaction, `sats_llm_call_logs` table with fire-and-forget writes, CI quality gates, and pre-commit UPDATE LOG enforcement. The main gaps are an empty incident-response runbook (no actionable content in any section) and five CODE-VERIFIED features in `UNTESTED_IMPLEMENTATIONS.md` that have been open for 60+ days without runtime closure. Help page parity is strong — all shipped features have a help topic — but the `skillProfile` and `resumeIntelligence` topics had no route mapping in `HelpHub.tsx` (fixed in `fix/waf-critical-findings`).

**Pillar 2 — Security:** The CORS and auth patterns are consistently applied. RLS is enabled on all new tables. The most significant issue is `linkedin-profile-ingest` bypassing `callLLM()` and making a raw direct OpenAI HTTP call — this is a known violation (WAF-1 from the 2026-03-31 review) that has not been remediated. A secondary finding is that `sats_outbox_events` has a `USING (true)` policy granted to `ALL` (not scoped to service role), meaning any authenticated user with SQL access could read or modify outbox events. The `console.log` calls in `AuthContext.tsx` and `Settings.tsx` risk leaking session and form data to browser consoles in production.

**Pillar 3 — Reliability:** The LLM retry chain is solid across most functions. The primary gap is `analyze-profile-fit` and `generate-gap-matrix` each passing only a single model candidate to `callLLM()` with no fallback — fixed in `fix/waf-critical-findings`. The `async-ats-scorer` job-signal extraction path also uses a single-model candidate array. The `sats_staged_jobs` table still lacks failure columns (`scoring_failed_at`, `retry_count`) documented as P1-3 since 2026-03-16.

**Pillar 4 — Performance Efficiency:** Model tiering is correct — `gpt-4.1` for ATS scoring, `gpt-4.1-mini` for all enrichment, roadmap, classification, and profile-fit tasks. Token budgets are appropriately bounded per task. The `ats-analysis-direct` parallel LLM calls (Call 2 + Call 3 via `Promise.allSettled()`) are well-designed. The stagger animation cap of 10 items is enforced in `animations.ts`. The main concern is `useProfileFit` likely has no `staleTime`, causing refetches on every mount.

**Pillar 5 — Cost Optimization:** The `sats_llm_call_logs` table and fire-and-forget insert in `llmProvider.ts` provide good cost visibility infrastructure. However, `logContext` is only passed in `classify-skill-profile` — all other `callLLM()` calls omit `logContext`, so their costs are never persisted to `sats_llm_call_logs`. This means the audit table is essentially empty for the most expensive operations.

**Pillar 6 — Sustainability:** Model assignments are well-calibrated: heavy reasoning reserved for `gpt-4.1` on the ATS scoring hot path; `gpt-4.1-mini` everywhere else. The main sustainability gap is no cache-hit check before re-running `analyze-profile-fit` — same-day re-runs make duplicate LLM calls. `centralized-logging` duplicates `getEnvNumber` locally instead of using `_shared/env.ts`.

---

## Detailed Findings

### Pillar 1 — Operational Excellence

**OE-1: Incident runbook is empty**

- File: `docs/runbooks/incident-response.md`
- All five sections (Trigger, Detection, Containment, Recovery, Postmortem) contain only a single `-` placeholder.
- Assessment: RISK | Severity: MAJOR
- Fix: Populate with detection commands (`fetch-logs.sh`), containment steps (revert model env var, redeploy), recovery procedure, postmortem template link.

**OE-2: `skillProfile` and `resumeIntelligence` help topics had no route mapping ✅ FIXED**

- File: `src/pages/HelpHub.tsx` lines 15–31
- Fixed in `fix/waf-critical-findings`: added `skillProfile: '/settings'` and `resumeIntelligence: '/analyses'` to `HELP_ROUTE_MAP`.

**OE-3: Lint step is `continue-on-error: true` in CI — failures silent in PRs**

- File: `.github/workflows/quality-gates.yml` line 47
- Assessment: NEEDS IMPROVEMENT | Severity: MAJOR
- Prerequisite: resolve 90 pre-existing ESLint errors in `src/components/ui/` first. Then remove `continue-on-error`.

**OE-4: UPDATE LOG header CI check is also non-blocking**

- File: `.github/workflows/quality-gates.yml` line 51
- Assessment: NEEDS IMPROVEMENT | Severity: MINOR
- Fix: Remove `continue-on-error` after clearing UPDATE LOG debt.

**OE-5: Five CODE-VERIFIED items open 30–60+ days without runtime closure**

- File: `docs/releases/UNTESTED_IMPLEMENTATIONS.md`
- Items: P15 S2, P13 S1, P13 S3, P18 S2/S3, P26 full set.
- Assessment: NEEDS IMPROVEMENT | Severity: MAJOR
- Fix: Assign a sprint to close via E2E runs.

---

### Pillar 2 — Security

**SEC-1: `linkedin-profile-ingest` makes direct OpenAI HTTP call — bypasses `callLLM()`**

- File: `supabase/functions/linkedin-profile-ingest/index.ts` lines 420–476
- Raw provider error payloads forwarded; cost not tracked; `mapProviderError()` bypassed; local `getEnvNumber` duplicate.
- Violation type: Raw payload forwarding + `callLLM()` bypass
- Severity: MAJOR
- Fix: Replace `runNormalizationWithSchema()` with `callLLM()`. Remove local `getEnvNumber` — import from `_shared/env.ts`. (This was WAF-1 from 2026-03-31 — still unremediated.)

**SEC-2: `sats_outbox_events` has `FOR ALL USING (true)` — any authenticated user can read/write**

- File: `supabase/migrations/20260328070000_p21_s6_outbox_events.sql` line 38
- Violation type: Overly permissive RLS policy on sensitive operational table
- Severity: MAJOR
- Fix: `CREATE POLICY "Service role manages outbox" ON public.sats_outbox_events FOR ALL TO service_role USING (true);`

**SEC-3: `console.log` in `AuthContext.tsx` and `Settings.tsx` leaks session data**

- Files: `src/contexts/AuthContext.tsx` (multiple lines), `src/pages/Settings.tsx` lines 113/119
- Violation type: Sensitive data in browser console
- Severity: MINOR
- Fix: Replace with `centralizedLogger` or remove.

**SEC-4: `sats_llm_call_logs` INSERT policy `WITH CHECK (true)` — authenticated users can pollute audit log**

- File: `supabase/migrations/20260327140000_p21_s1_llm_call_logs.sql` line 67
- Violation type: Overly permissive INSERT on audit table
- Severity: MINOR
- Fix: Scope to `TO service_role`.

---

### Pillar 3 — Reliability

**REL-1: `analyze-profile-fit` passed single model candidate — no fallback ✅ FIXED**

- Fixed in `fix/waf-critical-findings`: `modelCandidates: [modelName, modelFallback]` now used in both `callLLM()` calls.

**REL-2: `generate-gap-matrix` passed single model candidate — no fallback ✅ FIXED**

- Fixed in `fix/waf-critical-findings`: `OPENAI_MODEL_GAP_FALLBACK` constant added; both passed to `modelCandidates`.

**REL-3: `async-ats-scorer` job-signal extraction uses single model — no fallback**

- File: `supabase/functions/async-ats-scorer/index.ts` line 246
- Assessment: NEEDS IMPROVEMENT | Severity: MINOR
- Fix: `modelCandidates: [OPENAI_MODEL_EXTRACTION, OPENAI_MODEL_ATS_FALLBACK]`

**REL-4: `sats_staged_jobs` still lacks failure tracking columns (P1-3 backlog)**

- Files: No migration for `scoring_failed_at`, `scoring_retry_count`, `scoring_error`
- Assessment: NEEDS IMPROVEMENT | Severity: MINOR (already in backlog as P1-3)

**REL-5: No React `<ErrorBoundary>` wrapping route-level components (P1-2 backlog)**

- File: `src/App.tsx`
- Assessment: NEEDS IMPROVEMENT | Severity: MINOR (already in backlog as P1-2)

---

### Pillar 4 — Performance Efficiency

**PE-1: `enrich-experiences` fallback model conditional is correct**

- Assessment: GOOD — no action needed.

**PE-2: `useProfileFit` history query likely has no `staleTime`**

- File: `src/hooks/useProfileFit.ts`
- Assessment: NEEDS IMPROVEMENT | Severity: MINOR
- Fix: Add `staleTime: 60_000` to the history query options.

**PE-3: `aggregate-market-signals` cron produces no centralised log output**

- File: `supabase/functions/aggregate-market-signals/index.ts`
- Assessment: NEEDS IMPROVEMENT | Severity: MINOR
- Fix: Add `logEvent()` calls at function start and end (success/failure).

---

### Pillar 5 — Cost Optimization

**CO-1: `logContext` omitted from all `callLLM()` calls except `classify-skill-profile`**

- Files: `ats-analysis-direct` lines 570/630/664, `enrich-experiences` line 238, `generate-upskill-roadmap` line 458, `generate-gap-matrix` line 174, `analyze-profile-fit` lines 238/299, `async-ats-scorer` lines 246/440
- Assessment: RISK | Severity: MAJOR
- Fix: Add `logContext: { userId, functionName, runId, analysisId }` to every `callLLM()` call.

**CO-2: No same-day deduplication guard in `analyze-profile-fit`**

- File: `supabase/functions/analyze-profile-fit/index.ts`
- Assessment: NEEDS IMPROVEMENT | Severity: MINOR
- Fix: Check for existing same-day report before LLM call; return cached result if found.

---

### Pillar 6 — Sustainability

**SUS-1: `linkedin-profile-ingest` inline duplicate `getEnvNumber` — resolved by SEC-1 fix**

**SUS-2: `centralized-logging` uses raw `parseInt` instead of `_shared/env.ts`**

- File: `supabase/functions/centralized-logging/index.ts` lines 14–18
- Assessment: NEEDS IMPROVEMENT | Severity: MINOR
- Fix: Import and use `getEnvNumber` from `_shared/env.ts`.

**SUS-3: No `<MotionConfig reducedMotion="user">` in App.tsx**

- File: `src/App.tsx`
- Assessment: NEEDS IMPROVEMENT | Severity: MINOR
- Fix: Wrap app content in `<MotionConfig reducedMotion="user">`.

---

## Help Page Parity Audit

| Help Topic ID         | In helpContentData | In HELP_ROUTE_MAP | Gap                  |
| --------------------- | ------------------ | ----------------- | -------------------- |
| dashboard             | YES                | YES               | OK                   |
| resumes               | YES                | YES               | OK                   |
| jobDescriptions       | YES                | YES               | OK                   |
| atsAnalysis           | YES                | YES               | OK                   |
| resumeIntelligence    | YES                | YES (fixed)       | Fixed in this review |
| profileSettings       | YES                | YES               | OK                   |
| enrichedExperiences   | YES                | YES               | OK                   |
| upskillingRoadmaps    | YES                | YES               | OK                   |
| gapAnalysis           | YES                | YES               | OK                   |
| proactiveMatches      | YES                | YES               | OK                   |
| linkedinProfileImport | YES                | YES               | OK                   |
| resumePersonas        | YES                | YES               | OK                   |
| adminLogging          | YES                | YES               | OK                   |
| accountDeletion       | YES                | YES               | OK                   |
| skillProfile          | YES                | YES (fixed)       | Fixed in this review |
| profileFitAnalyzer    | YES                | YES               | OK                   |
| emailJobAlerts        | YES                | YES               | OK                   |

---

## Summary Findings Table

| Pillar                 | ID    | Severity | Issue                                                  | Status                                  |
| ---------------------- | ----- | -------- | ------------------------------------------------------ | --------------------------------------- |
| Operational Excellence | OE-1  | MAJOR    | Incident runbook is empty                              | Open                                    |
| Operational Excellence | OE-2  | MINOR    | Missing Help route mappings                            | **Fixed**                               |
| Operational Excellence | OE-3  | MAJOR    | Lint CI gate non-blocking                              | Open (prerequisite: fix 90 lint errors) |
| Operational Excellence | OE-4  | MINOR    | UPDATE LOG CI check non-blocking                       | Open                                    |
| Operational Excellence | OE-5  | MAJOR    | 5 CODE-VERIFIED items 30–60+ days old                  | Open                                    |
| Security               | SEC-1 | MAJOR    | `linkedin-profile-ingest` direct OpenAI call           | Open (WAF-1 from 2026-03-31)            |
| Security               | SEC-2 | MAJOR    | `sats_outbox_events` USING(true) — all roles           | Open                                    |
| Security               | SEC-3 | MINOR    | `console.log` leaks session data                       | Open                                    |
| Security               | SEC-4 | MINOR    | `sats_llm_call_logs` INSERT not scoped to service_role | Open                                    |
| Reliability            | REL-1 | MAJOR    | `analyze-profile-fit` single model, no fallback        | **Fixed**                               |
| Reliability            | REL-2 | MAJOR    | `generate-gap-matrix` single model, no fallback        | **Fixed**                               |
| Reliability            | REL-3 | MINOR    | `async-ats-scorer` extraction single model             | Open                                    |
| Reliability            | REL-4 | MINOR    | `sats_staged_jobs` lacks failure columns               | Open (P1-3 backlog)                     |
| Reliability            | REL-5 | MINOR    | No ErrorBoundary in App.tsx                            | Open (P1-2 backlog)                     |
| Performance            | PE-2  | MINOR    | `useProfileFit` history no staleTime                   | Open                                    |
| Performance            | PE-3  | MINOR    | `aggregate-market-signals` no logging                  | Open                                    |
| Cost Optimization      | CO-1  | MAJOR    | `logContext` missing from all callLLM() calls          | Open                                    |
| Cost Optimization      | CO-2  | MINOR    | No same-day dedup in `analyze-profile-fit`             | Open                                    |
| Sustainability         | SUS-2 | MINOR    | `centralized-logging` raw parseInt                     | Open                                    |
| Sustainability         | SUS-3 | MINOR    | No MotionConfig reducedMotion in App.tsx               | Open                                    |

---

## Prioritised Action List

### IMMEDIATE (fix/waf-critical-findings branch — in progress)

1. ✅ **503 on config errors** — `ats-analysis-direct`, `delete-account`, `cancel-account-deletion`
2. ✅ **REL-1 + REL-2** — Fallback models wired in `analyze-profile-fit` + `generate-gap-matrix`
3. ✅ **OE-2** — Help route mappings for `skillProfile` + `resumeIntelligence`

### IMMEDIATE (next sprint)

4. **SEC-1** — Replace direct OpenAI call in `linkedin-profile-ingest` with `callLLM()`. (Longest-standing violation — WAF-1 from 2026-03-31.)
5. **CO-1** — Wire `logContext` to all `callLLM()` call sites. Infrastructure exists; this is call-site plumbing.
6. **SEC-2** — One-line migration to restrict `sats_outbox_events` to `service_role`.

### SHORT-TERM (next 2 sprints)

7. **OE-1** — Write real incident runbook content.
8. **OE-5** — Close 5 long-lived CODE-VERIFIED E2E items.
9. **SEC-3** — Replace `console.log` in `AuthContext.tsx` + `Settings.tsx` with `centralizedLogger`.
10. **OE-3** — Fix 90 pre-existing lint errors, then remove `continue-on-error` from CI lint step.

### BACKLOG

11. **REL-3** — Fallback model in `async-ats-scorer` extraction
12. **CO-2** — Same-day dedup guard in `analyze-profile-fit`
13. **SEC-4** — Scope `sats_llm_call_logs` INSERT to service_role
14. **PE-2** — `staleTime` on `useProfileFitHistory`
15. **PE-3** — Centralized logging in `aggregate-market-signals`
16. **SUS-2** — `getEnvNumber` import in `centralized-logging`
17. **SUS-3** — `<MotionConfig reducedMotion="user">` in App.tsx
18. **OE-4** — Make UPDATE LOG CI check blocking after clearing debt
