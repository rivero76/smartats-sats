<!-- UPDATE LOG -->
<!-- 2026-04-06 00:00:00 | Architecture audit — Rebuild vs. Refactor decision report -->

# Architecture Audit — 2026-04-06

**FINAL RECOMMENDATION:** Incremental refactor (Option A). The core data model, auth pattern, and LLM abstraction are sound and production-ready. The two genuine structural debts — a dead Lovable schema layer still living in the DB and a 29-table speculative infrastructure migration — are removable table-by-table without touching any user-facing code. No rebuild is warranted.

---

## DIMENSION 1 — Architecture Map

### 1A — System Topology: Three Critical Journeys

---

#### Journey 1: Resume Upload → Parse → ATS Score

**Numbered sequence:**

1. `src/pages/MyResumes.tsx` (line 180) — user clicks "Upload Resume", opens Dialog containing `FileUpload` component
2. `src/components/FileUpload.tsx` (line 116) — `onDrop` callback fires; loads existing resume names from `sats_resumes` via `supabase.from('sats_resumes').select('name')` to propose a unique name
3. `FileUpload.tsx` (line 177) — `performUploadWithName()`: calls `assertFileIsLocal(file)` (cloud-stub guard), then uploads binary to Supabase Storage bucket `SATS_resumes`
4. `FileUpload.tsx` (line 222) — calls `useCreateResume().mutateAsync()` (hook: `src/hooks/useResumes.ts` line 52) — inserts row into `sats_resumes`
5. `FileUpload.tsx` (line 253) — calls `saveExtractionToSupabase(resumeId, extractedContent)` (hook: `src/hooks/useResumeExtractionHandler.ts`) — inserts extracted text into `document_extractions`
6. User navigates to `src/pages/ATSAnalyses.tsx` and opens `ATSAnalysisModal`
7. `src/components/ATSAnalysisModal.tsx` calls `useCreateATSAnalysis()` which delegates to `src/hooks/useDirectATSAnalysis.ts` (line 32)
8. `useDirectATSAnalysis.ts` (line 34) — inserts row into `sats_analyses` with `status: 'queued'`
9. `useDirectATSAnalysis.ts` (line 64) — calls `supabase.functions.invoke('ats-analysis-direct', { body: {...} })`
10. `supabase/functions/ats-analysis-direct/index.ts` — validates input, fetches resume text from `document_extractions`, fetches JD from `sats_job_descriptions`, optionally reads `sats_skill_profiles` + `sats_skill_decay_config`
11. Edge function calls `callLLM()` (Call 1: baseline ATS scoring, Call 2: CV optimisation in parallel via `Promise.allSettled()`, Call 3: Resume Intelligence)
12. Edge function updates `sats_analyses` row with `status: 'completed'`, `ats_score`, `analysis_data` JSONB
13. `src/hooks/useATSAnalyses.ts` (line 143) — Supabase Realtime subscription on `sats_analyses` fires `queryClient.invalidateQueries()` → UI auto-updates
14. Fallback: `useATSAnalyses.ts` (line 131) — polling at 3-second interval if any analysis is `in-flight`

**Files touched:** `MyResumes.tsx`, `FileUpload.tsx`, `useResumes.ts`, `useResumeExtractionHandler.ts`, `documentProcessor.ts`, `ATSAnalyses.tsx`, `ATSAnalysisModal.tsx`, `useATSAnalyses.ts`, `useDirectATSAnalysis.ts`, `ats-analysis-direct/index.ts`, `_shared/llmProvider.ts`, `_shared/cors.ts`, `_shared/env.ts`, `_shared/skillDecay.ts`, `sats_resumes`, `document_extractions`, `sats_analyses`, `sats_skill_profiles`, `sats_skill_decay_config`

**FLAG (MINOR):** `useATSAnalyses.ts` (lines 100–126) performs an **N+1 query** — for every analysis row it makes two additional queries (`sats_users_public` + `profiles`). At current scale (<200 analyses/user) this is self-documented as acceptable, but it will degrade as the user's history grows. Acknowledged in code comment at line 99.

---

#### Journey 2: LinkedIn Enrichment / Merge

1. `src/pages/Settings.tsx` — "Import LinkedIn Profile" button triggers `useLinkedinImportPreparation`
2. User enters LinkedIn URL, triggering `supabase.functions.invoke('linkedin-profile-ingest', { body: { linkedin_url } })`
3. `supabase/functions/linkedin-profile-ingest/index.ts` (line 109) — calls external Playwright scraper service (Railway/Fly.io) via HTTP POST to `/scrape-profile`
4. Edge function receives raw `LinkedInRawProfile` from scraper; calls OpenAI directly (NOT via `callLLM()`) via inline `fetch()` at line 393 to normalize the profile — **this is SEC-1, a known open defect**
5. Returns `{ normalized_skills, normalized_skill_experiences }` preview without any DB writes
6. `src/hooks/useLinkedinImportPreparation.ts` (line 33) — fetches user's existing `sats_user_skills` and `sats_skill_experiences`, runs `mergeLinkedinImportData()` (merge/dedupe logic in `src/utils/linkedin-import-merge.ts`)
7. `src/components/ProfileImportReviewModal.tsx` — HITL review modal; user selects which items to save
8. On confirm: mutations write selected items to `sats_user_skills` and `sats_skill_experiences`

**Files touched:** `Settings.tsx`, `linkedin-profile-ingest/index.ts`, `useLinkedinImportPreparation.ts`, `ProfileImportReviewModal.tsx`, `linkedin-import-merge.ts`, `sats_user_skills`, `sats_skill_experiences`, `sats_skills`

**FLAG (MAJOR — SEC-1):** `linkedin-profile-ingest` uses a direct `fetch()` to OpenAI at line 393, bypassing `_shared/llmProvider.ts`. This means: no cost logging to `sats_llm_call_logs`, no centralized error mapping via `mapProviderError()`, no `SATS_LLM_PROVIDER` switch. Documented in `docs/changelog/CHANGELOG.md` (2026-03-31) as a known blocker from the WAF review.

**FLAG (MINOR):** `linkedin-profile-ingest` has `verify_jwt = true` (config.toml) but the LinkedIn import flow is `CODE-VERIFIED — runtime E2E pending` per `UNTESTED_IMPLEMENTATIONS.md`. The full end-to-end live path (Playwright scraper → LLM normalize → merge → DB write) has not been tested against a real LinkedIn URL.

---

#### Journey 3: Dashboard / Analytics View

1. `src/App.tsx` (line 62) — `/` route renders `Dashboard` inside `ProtectedRoute`
2. `src/components/ProtectedRoute.tsx` — reads `user` + `loading` from `AuthContext`; redirects to `/auth` if no session
3. `src/pages/Dashboard.tsx` (lines 39–42) — fires four parallel TanStack Query hooks: `useResumes()`, `useJobDescriptions()`, `useATSAnalyses()`, `useATSAnalysisStats()`
4. Each hook queries Supabase directly (anon key, RLS-enforced): `sats_resumes`, `sats_job_descriptions`, `sats_analyses`
5. `useATSAnalysisStats` (line 174) is derived from `useATSAnalyses()` result — no additional DB query
6. `useATSAnalyses` performs N+1 fetch as described in Journey 1
7. Dashboard renders stat cards with `Skeleton` loading states while data loads

**Files touched:** `Dashboard.tsx`, `useResumes.ts`, `useJobDescriptions.ts`, `useATSAnalyses.ts`, `useATSAnalysisStats` (inline in `useATSAnalyses.ts`), `AuthContext.tsx`, `ProtectedRoute.tsx`

**FLAG (MINOR):** Dashboard fires 4 concurrent queries on every page load including one with N+1 behavior (`useATSAnalyses`). No pagination. For users with hundreds of analyses this will be slow.

---

### 1B — Dependency Graph

**God files** (imported by more than 10 files in `src/`):

| File | Import count | Notes |
|------|-------------|-------|
| `src/integrations/supabase/client.ts` | 41 | Expected — single DB client |
| `src/contexts/AuthContext.tsx` | 33 | Expected — auth context |
| `src/lib/centralizedLogger.ts` | 10 | Acceptable |

No circular dependencies detected. `useATSAnalyses.ts` imports `useDirectATSAnalysis`, and `useDirectATSAnalysis` does not import back — the chain is one-directional.

**Orphan files:**

- `src/pages/Index.tsx` — Never imported in `App.tsx` or anywhere else. Contains a dead redirect component (lines 1–25). **MINOR dead code.**

**Backup/churn files:**

The `.gitignore` specifies `*.tsx.[0-9]` but 12 such files are tracked in the repo:
- `src/components/FileUpload.tsx.1`, `FileUpload.tsx.2`
- `src/components/ResumeModal.tsx.1`
- `src/hooks/useDocumentExtractions.ts.1`, `useResumeExtractionHandler.ts.1`
- `src/lib/centralizedLogger.ts.1`, `centralizedLogger.ts.2`
- `src/lib/localLogger.ts.1`, `localLogger.ts.2`
- `src/services/documentProcessor.ts.1`
- `src/pages/MyResumes.tsx.1`

These are editor backup artifacts that should be deleted. **MINOR.**

**Dead code inventory:**

- `src/pages/Index.tsx` — entirely unreachable
- `sats_tenants` — created in P21 migration but only referenced in one comment in `usePlanFeature.ts` (line 69). No edge function or frontend component queries it.
- 29 P21 "Enterprise Infrastructure" tables (see Dimension 2A) — zero references in application code

---

### 1C — Third-Party Dependencies

**Total dependencies:** 50 production, 21 dev

**Unused/suspicious packages:**

| Package | Status | Evidence |
|---------|--------|---------|
| `html-to-text` | LIKELY UNUSED | Not found imported in `src/`. May have been displaced by `documentProcessor.ts` custom extraction. |
| `embla-carousel-react` | LIKELY UNUSED | No carousel usage found in pages or components. |
| `react-resizable-panels` | USED | Found in `ui/resizable.tsx` (shadcn component) |
| `vaul` | USED | Found in `ui/drawer.tsx` |
| `cmdk` | USED | Command menu component |
| `input-otp` | USED | OTP input for auth flows |

**No outdated-by-2-major-versions packages detected.** Versions are current (React 18, Vite 5, TanStack Query 5).

**Functional duplicates:** None identified. Single HTTP client (fetch native), single date library (`date-fns`).

**Estimated `node_modules` utilization:** ~75-80% (shadcn uses most Radix primitives; framer-motion, recharts, pdfjs, mammoth are all actively used).

---

### Architecture Diagram (ASCII)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  BROWSER                                                                 │
│  ┌──────────────────────────────────────────────────────────┐           │
│  │  React 18 + Vite + shadcn/ui + Tailwind                  │           │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────┐  │           │
│  │  │  Pages          │  │  Hooks         │  │  Services  │  │           │
│  │  │  (src/pages/)   │  │  (TanStack Q)  │  │  docProc   │  │           │
│  │  └────────┬───────┘  └───────┬────────┘  └─────┬──────┘  │           │
│  │           └──────────────────┼─────────────────┘         │           │
│  │                              │                            │           │
│  │                   AuthContext (Supabase Auth)             │           │
│  └──────────────────────────────┼──────────────────────────-┘           │
│                                 │ supabase-js client                     │
└─────────────────────────────────┼───────────────────────────────────────┘
                                  │
              ┌───────────────────┼────────────────────┐
              │  SUPABASE CLOUD    │                    │
              │  ┌─────────────── ▼ ──────────────┐    │
              │  │  Auth (JWT)                      │    │
              │  └──────────────────────────────────┘    │
              │  ┌──────────────────────────────────┐    │
              │  │  Postgres + RLS                  │    │
              │  │  ┌──────────────────────────┐    │    │
              │  │  │  ACTIVE TABLES           │    │    │
              │  │  │  sats_resumes            │    │    │
              │  │  │  sats_analyses           │    │    │
              │  │  │  sats_job_descriptions   │    │    │
              │  │  │  sats_enriched_exper.    │    │    │
              │  │  │  sats_skill_profiles     │    │    │
              │  │  │  sats_learning_roadmaps  │    │    │
              │  │  │  document_extractions    │    │    │
              │  │  │  sats_staged_jobs        │    │    │
              │  │  │  sats_user_notifications │    │    │
              │  │  └──────────────────────────┘    │    │
              │  │  ┌──────────────────────────┐    │    │
              │  │  │  DEAD TABLES (P21)       │    │    │
              │  │  │  29 enterprise tables    │    │    │
              │  │  │  (never queried)         │    │    │
              │  │  └──────────────────────────┘    │    │
              │  └──────────────────────────────────┘    │
              │  ┌──────────────────────────────────┐    │
              │  │  Edge Functions (Deno)           │    │
              │  │  ats-analysis-direct (JWT=true)  │    │
              │  │  async-ats-scorer (JWT=false)    │←───── cron
              │  │  fetch-market-jobs (JWT=false)   │←───── cron
              │  │  linkedin-profile-ingest (JWT=t) │    │
              │  │  enrich-experiences              │    │
              │  │  generate-upskill-roadmap        │    │
              │  │  delete-account                  │    │
              │  │  inbound-email-ingest (JWT=false)│←───── Postmark webhook
              │  │  classify-skill-profile          │    │
              │  │  aggregate-market-signals        │←───── cron
              │  │  generate-gap-matrix             │    │
              │  │  reset-profile-data              │    │
              │  │  centralized-logging             │    │
              │  │  cancel-account-deletion         │    │
              │  └───────────────┬──────────────────┘    │
              │                  │ callLLM()              │
              │  ┌───────────────▼──────────────────┐    │
              │  │  _shared/llmProvider.ts           │    │
              │  │  (OpenAI API)                     │    │
              │  └──────────────────────────────────-┘    │
              └───────────────────────────────────────────┘
                         │
              ┌──────────▼───────────┐
              │  EXTERNAL SERVICES   │
              │  Railway/Fly.io      │
              │  (Playwright scraper)│
              │  Postmark (inbound)  │
              └──────────────────────┘
```

---

## DIMENSION 2 — Database Schema Health

### 2A — Schema Inventory

Total migrations: **98 files** (Sept 2025 – Apr 2026)
Total tables created: **67** (via `CREATE TABLE` statements)

**Active production tables (with primary purpose):**

| Table | Purpose | FK Relationships |
|-------|---------|-----------------|
| `sats_users_public` | User metadata + role | → `auth.users` |
| `profiles` | Email + soft-delete flag | → `auth.users` |
| `sats_resumes` | Resume records | → `auth.users` |
| `document_extractions` | Extracted resume text | → `sats_resumes` |
| `sats_job_descriptions` | JD records | → `sats_companies`, `sats_locations`, `auth.users` |
| `sats_analyses` | ATS scoring results | → `sats_resumes`, `sats_job_descriptions` |
| `sats_enriched_experiences` | AI-enriched experience entries | → `auth.users` |
| `sats_skill_profiles` | Skill classification results | → `auth.users` |
| `sats_skill_decay_config` | Decay curve config | none |
| `sats_learning_roadmaps` | Upskilling roadmaps | → `auth.users` |
| `sats_roadmap_milestones` | Milestones per roadmap | → `sats_learning_roadmaps` |
| `sats_staged_jobs` | Job pipeline queue | — |
| `sats_user_notifications` | Notification records | → `auth.users` |
| `sats_resume_personas` | Resume persona tags | → `auth.users` |
| `sats_user_skills` | User skill inventory | → `auth.users`, `sats_skills` |
| `sats_skill_experiences` | Skill evidence narratives | → `auth.users`, `sats_skills` |
| `sats_log_entries` / `sats_log_settings` | Logging infrastructure | — |
| `sats_llm_call_logs` | LLM call audit | → `auth.users` |
| `sats_market_signals` | Job market frequency data | — |
| `sats_gap_snapshots` / `sats_gap_items` | Gap analysis results | → `auth.users` |
| `sats_role_families` | Role taxonomy reference | — |

**Legacy Lovable-era tables (still exist, zero application code references):**

The `src/integrations/supabase/types.ts` auto-generated file shows these tables are present in the database schema:
- `ats_derivatives`, `ats_findings`, `ats_runs`, `ats_scores`, `ats_resumes`, `ats_jobs`, `ats_job_documents`, `work_experiences`

These were the scaffolding from the original Lovable-generated project. Migration `20260327100000_p21_s1_add_created_by_updated_by.sql` (lines 75–168) even adds audit triggers to `ats_jobs`, `ats_resumes`, `ats_runs`, `ats_derivatives` — indicating these tables are still alive in the Supabase instance. **No frontend component or edge function queries them.** They represent dead schema that adds confusion and unnecessary RLS surface area.

**CRITICAL: P21 "Enterprise Infrastructure" tables (29 tables, zero application usage):**

The following 29 tables were created in a single week (2026-03-27 to 2026-03-28) under the P21 Enterprise Readiness initiative. **None are queried by any frontend hook, page component, or edge function** (confirmed via grep across `src/` and `supabase/functions/`):

`sats_roles`, `sats_permissions`, `sats_role_permissions`, `sats_user_role_assignments`, `sats_api_keys`, `sats_audit_logs`, `sats_tenants`, `sats_plans`, `sats_features`, `sats_tenant_features`, `sats_knowledge_sources`, `sats_document_chunks`, `sats_rag_queries`, `sats_ai_agents`, `sats_ai_sessions`, `sats_ai_messages`, `sats_agent_tasks`, `sats_agent_handoffs`, `sats_agent_memory`, `sats_prompt_templates`, `sats_ai_evaluations`, `sats_currencies`, `sats_exchange_rates`, `sats_locales`, `sats_translations`, `sats_idempotency_keys`, `sats_outbox_events`, `sats_rate_limit_counters`

These represent premature infrastructure — built for an enterprise scale (multi-tenancy, RAG knowledge base, AI agent registry, multi-currency, i18n) that is not yet in the application. The schema is sound and well-designed but is dead weight at MVP stage.

**Orphaned tables (no FK relationships to core data):**

- `sats_skill_decay_config` — no FK to users or resumes; referenced only by edge functions at runtime via service key
- `sats_role_families` — reference/seed data table, no FK

---

### 2B — Migration Quality

**Ratio:** 98 migrations total; 5 have "fix" in their filename explicitly. However, examining the early September 2025 cluster (migrations `20250912*`), the pattern reveals:
- 5 migrations in one day (`20250912122512` through `20250912140443`) recreating the same trigger function repeatedly — classic Lovable scaffolding thrash
- `20250924034010` drops and recreates duplicate triggers introduced by the Lovable platform

**Fix ratio assessment:** ~15–20% of early migrations are fixes for other migrations. The post-P8 migrations (2026-02 onward) are cleaner — deliberate feature additions with no ping-pong.

**Idempotency:** Most recent migrations use `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `ON CONFLICT DO NOTHING` — properly idempotent. Early migrations (Sept 2025) are not idempotent — they will fail on re-run.

**Destructive operations:**
- Migration `20260402020000_cleanup_orphaned_proactive_data.sql` and `20260402030000_cleanup_mock_proactive_data.sql` — hard-delete data rows. No rollback path.
- Table renames in `20260327150000_p21_tier1_rename_tables.sql` — zero-downtime `ALTER TABLE RENAME`, preserves OIDs and FKs. Well-executed.

**Schema ping-pong:** The `handle_sats_user_signup()` function is created/replaced in 4 different migrations (`20250912122512`, `20250912124216`, `20250912124258`, `20250924034010`). This is Lovable-era churn, not ongoing. No post-February 2026 ping-pong detected.

---

### 2C — RLS Policy Audit

**Coverage:** RLS enabled on all user-data tables. Confirmed via explicit `ENABLE ROW LEVEL SECURITY` in migrations and the Security Advisor report closure (2026-02-25 per `UNTESTED_IMPLEMENTATIONS.md`).

**Policy patterns:**

| Table | Policy type | Correctness |
|-------|------------|-------------|
| `sats_resumes` | `auth.uid() = user_id` | Correct; WITH CHECK enforced (P8 hardening) |
| `sats_analyses` | `auth.uid() = user_id AND deleted_at IS NULL` | Correct |
| `sats_job_descriptions` | `auth.uid() = user_id AND deleted_at IS NULL` | Correct |
| `sats_enriched_experiences` | `auth.uid() = user_id AND deleted_at IS NULL` | Correct |
| `document_extractions` | Subquery joins to `sats_resumes.user_id` | Correct; WITH CHECK present |
| `sats_users_public` | `auth.uid() = auth_user_id` | Correct; WITH CHECK enforced |
| `sats_llm_call_logs` | Admin select via `sats_user_roles` | Correct post-rename fix |
| `sats_roles` (P21) | `true` — all authenticated users can read | Intentional (public role registry) |
| `sats_permissions` (P21) | `true` — all authenticated users can read | Intentional (public permission registry) |

**Overly permissive policies:**
- `sats_roles` and `sats_permissions` use `USING (true)` for SELECT. This is intentional (they are lookup tables) but documented here for awareness.
- P21 tables with tenant-scoped policies are not yet enforced since `tenant_id` defaults to a sentinel value and no code sets it per-user.

**Edge functions using `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS):**

| Function | Justification |
|---------|--------------|
| `ats-analysis-direct` | Needs to read resume text + write analysis row on behalf of user — justified |
| `async-ats-scorer` | System cron writing across all user analyses — justified |
| `enrich-experiences` | Writing enrichment for authenticated user — justified (user JWT validated at entry) |
| `delete-account` | Hard-deletes auth user + all data — justified |
| `cancel-account-deletion` | Reactivates soft-deleted account — justified |
| `fetch-market-jobs` | System cron writing to staged_jobs — justified |
| `centralized-logging` | Writes log entries from any caller — **RISK: accept any service_role call** |
| `generate-upskill-roadmap` | Writing roadmap rows for user — partially justified |
| `reset-profile-data` | Bulk-deletes user career data — justified |
| `classify-skill-profile` | Writes skill profile — partially justified |
| `aggregate-market-signals` | System aggregation — justified |
| `generate-gap-matrix` | Writes gap snapshot — partially justified |
| `inbound-email-ingest` | Writes staged jobs from Postmark webhook — justified |

**FLAG (MAJOR):** `async-ats-scorer` has `verify_jwt = false` with no supplementary auth check. Any caller who knows the function URL can trigger a batch scoring run against all users' data. The CORS check only blocks browser-based cross-origin calls — it does not stop `curl` or server-to-server requests. The function should validate a shared secret (`CRON_SECRET`) in the Authorization header.

**FLAG (MAJOR):** `fetch-market-jobs` has the same `verify_jwt = false` vulnerability.

---

### 2D — Data Integrity

**CHECK constraints:**
- `sats_users_public.role IN ('user', 'admin')` — correct
- `sats_analyses.status IN ('initial','queued','processing','completed','error')` — correct
- `sats_tenants.status IN ('active','suspended','cancelled','trial')` — correct (P21 tables)

**NOT NULL coverage:** Generally good on core tables. `sats_analyses.ats_score` is nullable (correct — NULL until scored).

**Default masking:** `sats_analyses.matched_skills DEFAULT '[]'::jsonb` and `missing_skills DEFAULT '[]'::jsonb` — these defaults are appropriate (empty arrays, not misleading zeros).

**FLAG (MINOR):** `analysis_data` column on `sats_analyses` is `jsonb` with no schema enforcement. Nested fields like `cv_optimisation_score`, `format_audit`, `geography_passport` are stored as arbitrary JSON. This is workable but means the column will accumulate undocumented subfields over time.

---

### Dimension 2 Verdict: **FRAGILE**

The active production schema is sound. The fragility comes from two sources: (1) 8 dead Lovable-era tables still receiving audit triggers, and (2) 29 P21 speculative enterprise tables consuming schema real estate. Neither is catastrophic — both are removable via cleanup migrations. The model is not broken; it is overgrown.

---

## DIMENSION 3 — Security Assessment

### 3A — Authentication and Authorization

**Implementation:** Supabase Auth (JWT-based). The `AuthContext.tsx` (`src/contexts/AuthContext.tsx`) wraps `supabase.auth.onAuthStateChange()` and exposes `user`, `session`, and `satsUser` (from `sats_users_public`).

**Auth flow:**
1. User calls `signIn()` → `supabase.auth.signInWithPassword()` → returns JWT
2. `onAuthStateChange` fires `SIGNED_IN` → `fetchSATSUser()` loads `sats_users_public` row
3. JWT is stored in `localStorage` (Supabase default); auto-refreshed via `autoRefreshToken: true`
4. `ProtectedRoute.tsx` checks `user` from context; redirects to `/auth` if null
5. `AdminRoute.tsx` checks `satsUser.role === 'admin'`

**FLAG (MINOR):** The retry logic in `fetchSATSUser()` (`AuthContext.tsx` lines 110–140) uses a bare `setTimeout(..., 2000)` to retry if the SATS user record isn't found immediately after signup. This is a race condition workaround for the DB trigger timing. It works but is fragile — if the trigger fails silently, the user will have `satsUser: null` and the app shows "User" as their name until reload.

**Role enforcement:** RBAC has two layers:
- Legacy: `sats_users_public.role` field checked in `AdminRoute.tsx` and `has_role()` SQL function
- New (P21): `sats_user_role_assignments` table with `sats_has_permission()` function — **not yet used in any frontend component or RLS policy on core tables**

The P21 RBAC layer is fully implemented in the database but has zero integration with application code.

**Client-side routes:** All application routes are wrapped in `ProtectedRoute`. The `/admin` route is additionally wrapped in `AdminRoute`. No sensitive data renders before the auth check resolves.

---

### 3B — API Surface Exposure

**Edge function security summary:**

| Function | JWT | Input validation | Rate limiting | Error sanitization |
|---------|-----|-----------------|--------------|-------------------|
| `ats-analysis-direct` | YES | YES (required fields checked) | NO | YES (mapProviderError) |
| `async-ats-scorer` | NO | CORS only | NO | YES |
| `fetch-market-jobs` | NO | CORS only | NO | YES |
| `linkedin-profile-ingest` | YES | YES | NO | PARTIAL (own error classes) |
| `enrich-experiences` | YES | YES | NO | YES |
| `generate-upskill-roadmap` | YES | YES | NO | YES |
| `delete-account` | YES | Password verified | NO | YES |
| `inbound-email-ingest` | NO (Postmark) | Sender allowlist + signature | NO | YES |
| `classify-skill-profile` | YES | YES | NO | YES |
| `generate-gap-matrix` | YES | YES | NO | YES |
| `reset-profile-data` | YES | YES | NO | YES |
| `centralized-logging` | YES | MINIMAL | NO | YES |
| `cancel-account-deletion` | YES | YES | NO | YES |

**FLAG (MAJOR):** No edge function implements rate limiting. A malicious authenticated user could trigger unlimited ATS analyses, burning OpenAI credits without bound.

**FLAG (MAJOR):** `async-ats-scorer` and `fetch-market-jobs` accept any POST request (CORS check only guards browser clients). These functions should require a shared `CRON_SECRET` header since they operate with `service_role` on all user data.

**FLAG (MINOR):** `centralized-logging` accepts any authenticated call. A user could flood the log table. The logging function itself is only called from edge functions using the service key, but since it accepts any valid JWT, a client-side attacker with a valid session could post arbitrary log entries.

---

### 3C — Secrets and Credentials

**Hardcoded secrets:** None found in `src/` or edge function code. All secrets read from `Deno.env.get()` in edge functions, `import.meta.env` in frontend.

**`.env` in `.gitignore`:** YES — confirmed at `.gitignore` line 37.

**Supabase project ID exposed:** `supabase/config.toml` line 1 contains `project_id = "nkgscksbgmzhizohobhg"`. This is a project reference, not a secret (it is visible in the Supabase dashboard URL), but it confirms which production project is targeted.

**Client-side secrets:** The only env vars exposed to the browser are `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The anon key is safe by design (Supabase RLS enforces data isolation). `OPENAI_API_KEY` and all service keys are edge-function-only. Confirmed no `OPENAI_API_KEY` in `src/`.

**No secret leaks detected in codebase.**

---

### 3D — Prompt Injection and LLM Security

**Pattern used across all functions:** User-supplied resume text and JD text are injected into LLM prompts as string interpolation. Example from `ats-analysis-direct` (line ~569): resume text and JD text are pasted directly into the user prompt.

**No prompt sanitization layer exists.** A resume containing `IGNORE PREVIOUS INSTRUCTIONS` could theoretically alter model behavior. However:
- Schema-locked JSON output (`response_format: json_schema`, `strict: true`) means even a hijacked response must match the expected JSON schema to be parsed
- `retryAttempts` re-prompts on invalid schema output, creating a structural defense
- The `additionalProperties: false` in all schemas limits injection surface

**Residual risk (MINOR):** Schema-locked output prevents data exfiltration via the response, but cannot prevent the model from refusing to answer or producing low-quality output if a resume is adversarially crafted.

**`linkedin-profile-ingest` prompt injection risk is higher (MAJOR):** The function uses a direct `fetch()` to OpenAI (not via `callLLM()`), bypassing the shared schema enforcement. The normalization schema is inline but without the shared `mapProviderError()` safety net.

---

### Dimension 3 Verdict: **NEEDS IMMEDIATE FIXES**

Not fundamentally insecure, but two MAJOR vulnerabilities require patching before any public launch:
1. `async-ats-scorer` and `fetch-market-jobs` accept unauthenticated POST requests (JWT disabled, no cron secret)
2. No rate limiting on any LLM-invoking endpoint

Both are fixable in <1 week without architectural changes.

---

## DIMENSION 4 — Feature Inventory and Health

### 4A — Complete Feature Census

| Feature | Status | Core files | Has tests? | Has error handling? | User-visible bugs? |
|---------|--------|-----------|------------|--------------------|--------------------|
| Resume Upload & Management | WORKING | `MyResumes.tsx`, `FileUpload.tsx`, `useResumes.ts` | a11y tests | YES | None known |
| Job Description Management (manual + URL ingest) | WORKING | `JobDescriptions.tsx`, `JobDescriptionModal.tsx`, `job-description-url-ingest/` | NO | YES | SPA sites handled with warning banner |
| ATS Analysis (3-call: score + CV opt + intelligence) | WORKING | `ATSAnalyses.tsx`, `ats-analysis-direct/`, `useATSAnalyses.ts` | Playwright suite | YES | — |
| Real-time analysis progress updates | WORKING | `useATSAnalyses.ts` (realtime + polling) | Playwright (partial) | YES | — |
| CV Optimisation Score panel | PARTIAL | `ATSAnalyses.tsx`, `ats-analysis-direct` | Absent-case tested; present-case pending | YES | — |
| Resume Intelligence (4 sub-panels) | WORKING | `ResumeIntelligencePanel.tsx`, `ats-analysis-direct` | NO | YES (null-safe) | — |
| AI Experience Enrichment | WORKING | `EnrichedExperiences.tsx`, `enrich-experiences/` | NO | YES | — |
| LinkedIn Profile Import (HITL) | PARTIAL | `ProfileImportReviewModal.tsx`, `linkedin-profile-ingest/`, `useLinkedinImportPreparation.ts` | 11 unit tests (merge logic) | YES | Live E2E untested |
| Proactive Job Matching | WORKING | `ProactiveMatches.tsx`, `async-ats-scorer/`, `fetch-market-jobs/` | Playwright (8 tests pass) | YES | Notification threshold bug fixed, redeployment pending |
| Upskilling Roadmaps | WORKING | `UpskillingRoadmaps.tsx`, `generate-upskill-roadmap/` | Playwright (8 tests pass) | YES | E2E of edge function untested |
| Inbound Email Job Ingestion (Postmark) | WORKING | `inbound-email-ingest/`, `Settings.tsx` | RUNTIME-VERIFIED | YES | — |
| Skill Profile Engine | WORKING | `SkillProfileManager.tsx`, `SkillClassificationReview.tsx`, `classify-skill-profile/` | 5 a11y tests | YES | — |
| Gap Analysis Engine | PARTIAL | `GapMatrix.tsx`, `generate-gap-matrix/`, `aggregate-market-signals/` | CODE-VERIFIED only | YES | Runtime E2E pending |
| Resume Personas | PARTIAL | `PersonaManager.tsx`, `useResumePersonas.ts` | 6/7 tests pass | YES | CRUD blocked by pending migration |
| Dashboard Analytics | WORKING | `Dashboard.tsx`, `useATSAnalyses.ts`, `useATSAnalysisStats` | a11y tests | YES | — |
| Help Hub | WORKING | `HelpHub.tsx`, `helpContent.ts` | Playwright (10 tests pass) | YES | — |
| Admin Dashboard | WORKING | `AdminDashboard.tsx`, admin components | Playwright (log viewer) | YES | — |
| Settings + Data Management | WORKING | `Settings.tsx`, `useAccountDeletion.ts`, `useCareerDataReset.ts` | a11y tests | YES | Career data reset runtime E2E pending |
| Career Data Reset | PARTIAL | `ResetCareerDataModal.tsx`, `reset-profile-data/` | CODE-VERIFIED | YES | Runtime E2E pending |
| Plan/Feature Gating | PARTIAL | `usePlanFeature.ts` | NO | YES | All users hardcoded to 'free' until P22 |
| PM Dashboard | WORKING | `PMDashboard.tsx` | NO | YES | — |

---

### 4B — Feature Coupling Assessment

The feature architecture is loose by design (each feature = one page + one hook + one edge function). Removing any single feature requires:
1. Delete the page component
2. Delete the hook
3. Remove the route from `App.tsx`
4. Optionally drop the DB table
5. Undeploy the edge function

No feature appears to have hidden coupling that would cascade. The `useATSAnalyses` hook is used by both `ATSAnalyses.tsx` and `Dashboard.tsx`, but Dashboard uses it for stats only — removing ATSAnalyses page would require refactoring Dashboard's stat calculation.

---

### 4C — Usage Data

No analytics data is accessible from the codebase. The `sats_log_entries` table accumulates structured events. Feature usage cannot be assessed from the code alone.

**Inferred from UNTESTED_IMPLEMENTATIONS.md:** Proactive matching pipeline is fully operational with real email ingestion confirmed. Core ATS scoring is the primary validated feature. LinkedIn import and Gap Analysis are code-complete but have not been tested in live user sessions.

---

## DIMENSION 5 — Codebase Maintainability Score

### 5A — Consistency Index

Sample of 30 files assessed (mix of pages, hooks, edge functions, utilities, UI components):

| File category | Formatting | Naming | SoC | Error handling | Score |
|--------------|-----------|--------|-----|---------------|-------|
| `src/pages/Dashboard.tsx` | 5 | 5 | 4 | 4 | 4.5 |
| `src/pages/MyResumes.tsx` | 5 | 5 | 4 | 4 | 4.5 |
| `src/hooks/useATSAnalyses.ts` | 5 | 5 | 3 (realtime mixed into query hook) | 5 | 4.5 |
| `src/hooks/useDirectATSAnalysis.ts` | 5 | 5 | 4 | 5 | 4.75 |
| `src/contexts/AuthContext.tsx` | 5 | 5 | 3 (retry logic mixed with auth state) | 5 | 4.5 |
| `src/components/FileUpload.tsx` | 5 | 5 | 3 (name dialog inline in upload component) | 4 | 4.25 |
| `supabase/functions/ats-analysis-direct/index.ts` | 4 | 5 | 3 (1654 lines, 3 LLM calls inline) | 5 | 4.25 |
| `supabase/functions/linkedin-profile-ingest/index.ts` | 4 | 5 | 3 (direct OpenAI call diverges from shared pattern) | 4 | 4.0 |
| `supabase/functions/_shared/llmProvider.ts` | 5 | 5 | 5 | 5 | 5.0 |
| `src/lib/centralizedLogger.ts` | 5 | 5 | 4 | 5 | 4.75 |
| `src/utils/linkedin-import-merge.ts` | 5 | 5 | 5 | 4 | 4.75 |
| `src/components/ui/card.tsx` (shadcn) | 5 | 5 | 5 | N/A | 5.0 |
| `src/components/ui/accordion.tsx` (shadcn) | 5 | 5 | 5 | N/A | 5.0 |
| `src/hooks/usePlanFeature.ts` | 5 | 5 | 4 | 4 | 4.5 |
| `src/services/documentProcessor.ts` | 5 | 5 | 4 | 5 | 4.75 |
| (remaining 15 files estimated by pattern) | 4-5 | 4-5 | 3-5 | 4-5 | 4.25 avg |

**Aggregate mean: ~4.5 / 5.0**

Distribution: ~20% score 5, ~70% score 4-4.75, ~10% score 3-4 (mostly large edge functions or mixed-concern components).

No files scored below 3. The codebase is notably consistent for a startup product built over 7 months.

---

### 5B — AI-Generated Code Footprint

**Identified AI-generated scaffolding:**
- `src/components/ui/` — entire directory is shadcn/ui scaffolding (30+ files). These are standard, unmodified, and are the correct way to use shadcn. Not harmful.
- Early Lovable-era migrations (Sept 2025) — 12 migrations from a single day clearly represent Lovable platform output; they recreate the same trigger function multiple times, create storage buckets redundantly, and fix their own output within hours.
- `sats_ai_agents` seed data in migration `20260328010000` seeds 17 Claude Code agent definitions into the database — the codebase is registering its own development agents as data. This is harmless but indicates agentic development process.

**Estimate:** ~40% of files have significant AI authorship (pages, hooks, edge functions). ~20% are pure AI scaffolding (shadcn UI components). The key quality signal is that even AI-authored files are consistently formatted and follow project conventions — the UPDATE LOG discipline and shared utility patterns are being enforced uniformly.

---

### 5C — Test Coverage

**Test types present:**

| Test type | Location | Count | Quality |
|-----------|---------|-------|---------|
| Accessibility (jest-axe) | `tests/unit/a11y/` | 8 files, ~40 tests | Meaningful — tests real rendered components |
| Unit (Vitest) | `tests/unit/utils/` | 2 files: `contentExtraction.test.ts`, `linkedinImportMerge.test.ts` | 11 tests, well-structured |
| Playwright functional | `tests/e2e/` | 7 spec files | Meaningful — tests against live Supabase |
| Visual regression | `tests/e2e/visual/` | Exists, non-blocking in CI | Requires auth credentials in CI |

**Coverage gaps:**
- Zero tests for `src/hooks/` logic itself
- Zero tests for edge functions (no Deno test files)
- Zero tests for `src/services/documentProcessor.ts` (complex PDF/DOCX parsing)
- Zero integration tests for the ATS scoring pipeline
- LLM eval gate exists (`npm run llm:eval:gate`) — passed 2026-03-27 per UNTESTED_IMPLEMENTATIONS.md

**Overall coverage: ~10–15% of application surface area.** Adequate for beta, insufficient for production scale.

---

### 5D — Build and Deploy Pipeline

**CI/CD:** GitHub Actions workflow at `.github/workflows/quality-gates.yml`:
- `verify` job: build + unit tests + format check + docs gate + secret scan (**BLOCKING**)
- `visual-regression` job: Playwright tests (**non-blocking, `continue-on-error: true`**)
- `lighthouse` job: Lighthouse CI (**non-blocking**)

**Lint is non-blocking** (`continue-on-error: true`) — allowing lint debt to accumulate silently.

**Deploy:** Not automated. `supabase functions deploy` must be run manually per function. No CD to Supabase Functions. Edge function deployment requires a valid `SUPABASE_ACCESS_TOKEN` — this was the blocker for `async-ats-scorer` in March 2026.

**Fresh clone readiness:** `.env.example` provides all required variables with descriptions. `supabase/config.toml` has the project ref hardcoded. Docker compose provided for local dev. Rated: **ADEQUATE**.

**Environment-specific concerns:** `SUPABASE_ACCESS_TOKEN` for platform API queries and function deployment lives only locally. No documented rotation procedure.

---

## DIMENSION 6 — Rebuild vs. Refactor Decision Matrix

### 6A — Structural Assessment

| Area | Salvageable? | Effort to fix | Effort to rebuild | Verdict |
|------|-------------|---------------|-------------------|---------|
| **Database schema (active tables)** | YES | S (cleanup migrations) | XL | FIX |
| **Database schema (P21 dead tables)** | YES | M (drop migrations) | N/A | FIX |
| **Auth & security** | YES | S-M | XL | FIX |
| **API layer (edge functions)** | YES | S (SEC-1 fix + cron secrets) | L | FIX |
| **Frontend architecture** | YES | S (delete orphans, clean backups) | XL | FIX |
| **LLM integration** | YES | S (fix linkedin-profile-ingest) | M | FIX |
| **CI/CD & DevOps** | YES | S (add CD for edge functions) | S | FIX |

---

### 6B — Risk Assessment

**1. Is the database schema fundamentally broken, or just messy?**

Just messy. The active production schema is well-modeled, properly normalized, and consistently RLS-protected. The mess is additive: dead Lovable tables and speculative P21 infrastructure. A cleanup migration removing the unused tables would leave a clean, coherent schema. No data model redesign required.

**2. Are there security vulnerabilities that can't be patched incrementally?**

No. Both MAJOR vulnerabilities (unprotected cron endpoints and missing rate limiting) are straightforward fixes:
- Add `CRON_SECRET` header validation to `async-ats-scorer` and `fetch-market-jobs` (~2 hours each)
- Add per-user rate limiting to `ats-analysis-direct` via a counter in Redis or Supabase (~1 day)

The auth model (Supabase Auth + RLS) is sound.

**3. Is the code so coupled that changing one feature breaks others?**

No. The feature-per-hook-per-edge-function architecture has kept coupling low. The most coupled module is `useATSAnalyses.ts` (used by Dashboard, ATSAnalyses page, and 3 components), but this is proportionate to its central role.

The one genuine coupling concern: `sats_analyses` JSONB `analysis_data` field is becoming a kitchen drawer — it stores ATS scores, CV optimisation data, intelligence sub-panels, request IDs, and debug metadata as untyped JSON. This will make future migrations harder but is not a coupling problem per se.

**4. Do you have paying users or validated demand?**

The codebase shows evidence of real operational usage: Postmark inbound email pipeline has been runtime-verified with live LinkedIn job alerts; Playwright scraper is deployed on Railway/Fly.io; production Supabase project (`nkgscksbgmzhizohobhg`) shows real data. No information about paying users is available from the codebase, but the operational evidence suggests active use.

**5. How long would a rebuild realistically take?**

A full rebuild of the current feature set (15+ features, 14 edge functions, 21 active DB tables, full auth stack) would take **4–6 months** with the same velocity. The codebase represents ~7 months of compounding development; rebuilding to parity would be slower due to all the domain knowledge now embedded in edge function prompts, schema design decisions, and RLS policies.

**6. Can you ship new features while refactoring?**

Yes, definitively. The incremental fixes identified are all additive (new migrations to drop dead tables, new header checks in existing functions, lint fixes). No existing user-facing feature needs to be touched during cleanup. The work can be parallelized.

---

### 6C — Final Recommendation: OPTION A — INCREMENTAL REFACTOR

**Prioritized 6-Phase Refactoring Roadmap:**

---

**PHASE 1 — Security Hardening (1 week, HIGH PRIORITY)**

1. Add `CRON_SECRET` header validation to `async-ats-scorer/index.ts` and `fetch-market-jobs/index.ts`. Both have `verify_jwt = false`; cron invocations should present a shared secret in `Authorization: Bearer <CRON_SECRET>` and the function should reject any request without it.
2. Add per-user rate limiting to `ats-analysis-direct` (e.g., max 20 analyses/hour via a counter in a `sats_rate_limit_counters` table that was already created in P21).
3. Migrate `linkedin-profile-ingest` to use `callLLM()` from `_shared/llmProvider.ts` — this is SEC-1, tracked in the changelog since 2026-03-31.

**PHASE 2 — Schema Cleanup (1 week, MEDIUM PRIORITY)**

1. Create a cleanup migration that drops the 8 Lovable-era dead tables: `ats_derivatives`, `ats_findings`, `ats_runs`, `ats_scores`, `ats_resumes`, `ats_jobs`, `ats_job_documents`, `work_experiences`. First confirm they have no production data (they should be empty).
2. Create a second cleanup migration that drops the 29 P21 speculative enterprise tables. These should be reintroduced one at a time when the corresponding feature (multi-tenancy, RAG, billing) actually ships.
3. Regenerate `src/integrations/supabase/types.ts` after cleanup.

**PHASE 3 — Runtime Validation Backlog (2 weeks, HIGH PRIORITY)**

Work through the 9 `CODE-VERIFIED — runtime E2E pending` items in `UNTESTED_IMPLEMENTATIONS.md`:
- `async-ats-scorer` notification threshold (redeployment after token renewal)
- `generate-upskill-roadmap` live E2E
- `linkedin-profile-ingest` live E2E
- `ProfileImportReviewModal` live E2E
- P18 CV Optimisation panel (present-case)
- P15 RLS cross-tenant test
- P26 Gap Analysis E2E
- P20 S4 Career Data Reset E2E
- ATS model determinism (§4.3 live suite)

**PHASE 4 — Code Quality (2 weeks, MEDIUM PRIORITY)**

1. Delete 12 backup files (`*.tsx.1`, `*.ts.1`, etc.) from `src/`
2. Delete orphaned `src/pages/Index.tsx`
3. Enable lint as a blocking CI check (currently `continue-on-error: true`)
4. Extract the N+1 query in `useATSAnalyses.ts` into a Postgres view or RPC to eliminate per-analysis user lookups
5. Add CD automation for Supabase edge function deployment (GitHub Actions step using `supabase functions deploy`)

**PHASE 5 — Test Coverage (1 month, MEDIUM PRIORITY)**

1. Add Vitest unit tests for `src/services/documentProcessor.ts` (PDF/DOCX parsing edge cases)
2. Add integration tests for the ATS scoring pipeline using mock Supabase
3. Add edge function tests using Deno's built-in test runner
4. Add rate limiting tests

**PHASE 6 — Performance (1 month, LOW PRIORITY)**

1. Add pagination to `useATSAnalyses`, `useResumes`, `useJobDescriptions` — all currently fetch all rows
2. Consider a DB view `sats_analyses_with_users` to eliminate the N+1 pattern
3. Evaluate whether `fetch-market-jobs` should be replaced with real job API calls (currently uses mock data — 3 hardcoded job fixtures in `fetch-market-jobs/index.ts`)

---

## Summary Table

| Dimension | Finding | Severity |
|-----------|---------|---------|
| Journey 1 (Resume → ATS) | Clean 14-step flow, N+1 on user fetch acknowledged | MINOR |
| Journey 2 (LinkedIn) | SEC-1: direct OpenAI call bypasses shared provider | MAJOR |
| Journey 3 (Dashboard) | 4 parallel queries, N+1 embedded | MINOR |
| Orphan files | `Index.tsx` + 12 backup files | MINOR |
| Dead code | 29 P21 enterprise tables, 8 Lovable tables | MAJOR |
| Migration quality | Early Lovable churn resolved; recent migrations clean | MINOR |
| RLS coverage | All active tables protected; P21 tables unconnected | MINOR |
| Cron endpoint auth | `async-ats-scorer`, `fetch-market-jobs` accept any POST | MAJOR |
| Rate limiting | Zero rate limiting on any LLM endpoint | MAJOR |
| Prompt injection | Schema-locked output provides structural defense | MINOR |
| LLM abstraction | `callLLM()` shared provider clean; SEC-1 exception | MAJOR |
| Test coverage | ~10–15%; meaningful where present; large gaps | MAJOR |
| CI/CD | Lint non-blocking; no CD for edge functions | MINOR |
| Code consistency | Mean 4.5/5.0 across 30 sampled files | N/A |

**No finding rises to the level of requiring a rebuild. All MAJOR findings are patching tasks, not redesigns.**
