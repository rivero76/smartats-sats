# Technical Improvements Backlog

<!-- Created: 2026-03-16 — sourced from Claude Code architecture review -->
<!-- Updated: 2026-03-17 — added P1-6 (CI pipeline) and P1-7 (Supabase type regeneration) -->
<!-- Updated: 2026-03-17 — P0-1, P0-2, P0-3 completed; P1-1, P1-2, P1-4, P1-6, P1-7 completed -->
<!-- Updated: 2026-03-17 (session 2) — BUG-2026-03-17-LOCATION-RLS fixed; log fetch script hardened; LogViewer time-window filter added; P17 BYOK added as future backlog item -->
<!-- Updated: 2026-03-17 (session 3) — P2-7 (sync AI model label) completed; VITE_AI_MODEL_LABEL env var added -->
<!-- Updated: 2026-03-23 — added P2-8 (per-user API quotas) from multi-user readiness assessment; added i18n gap entry (P3-1) -->
<!-- Updated: 2026-03-26 — added P1-10 through P1-13 and P2-9 from Claude Code audit report (audit_smartats-sats_20260326_164646.md) -->
<!-- Updated: 2026-03-26 — P1-10 completed: .claude/agents/ created with 16 sub-agent files covering full dev lifecycle -->
<!-- Updated: 2026-03-26 — P1-11 completed: .claude/skills/ created with 4 skill files (new-edge-function, new-migration, adr-draft, verify-gate) -->
<!-- Updated: 2026-03-26 — P1-12 completed: .claude/commands/ created with 2 command files (verify, release-check) -->
<!-- Updated: 2026-03-26 — full comparison with audit_smartats-sats_20260326_164646.md: added P2-10 (CLAUDE.md updates); confirmed P0-1 verified done (.railwayignore exists with correct content) -->
<!-- Updated: 2026-03-26 — added UIUX-1 through UIUX-7 (UI/UX Excellence Programme); full plan in plans/p19-uiux-excellence.md -->
<!-- Updated: 2026-03-26 — added MAINT-1 (remove Lovable.dev artifacts) and MAINT-2 (migrate Codex tooling to Claude Code) -->
<!-- Updated: 2026-03-26 — MAINT-2 completed: AGENTS.md retired, CODEX_SESSION_CONTINUITY.md archived, SESSION_CONTINUITY.md created, ADR-0001 marked Superseded, CLAUDE.md updated, docs/sessions/README.md updated, coding-conventions.md and p19 plan Owner updated -->
<!-- Updated: 2026-03-27 — added PROD-1 through PROD-8 from job-seeker gap analysis research session (docs/audits/job-seeker-gap-analysis-2026-03-27.md) -->
<!-- Updated: 2026-03-30 — added PROD-9 through PROD-12 from culture-aware & industry-aware resume intelligence brainstorm (PM research session 2026-03-30) -->
<!-- Updated: 2026-03-31 — WAF full review: added WAF-1 through WAF-18 from CODE-REVIEW-2026-03-31.md -->
<!-- Updated: 2026-03-31 — added INFRA-1 (LinkedIn scraper hosting — MVP-temporary Fly.io, review at scale) -->

This document captures prioritised technical improvements identified during a full codebase review on 2026-03-16. Items are not product features — they are developer experience, robustness, and maintainability improvements.

**Priority levels:**

- `P0` — Do immediately. Blocks correctness, security, or ongoing deployment.
- `P1` — Do soon. Causes hidden failures, accumulating debt, or contributor friction.
- `P2` — Do when convenient. Code quality and long-term maintainability.

---

## P0 — Do Immediately

### P0-1 · Create `.railwayignore` for the LinkedIn scraper

**Area:** Deployment / Infrastructure
**Effort:** 5 minutes
**File:** `scripts/playwright-linkedin/.railwayignore`

The Railway CLI v4.30.5 reads ignore rules from the git-root `.gitignore`, not the subdirectory's `.gitignore`. As a result, `node_modules/` (46 MB) is included in every deploy upload, causing the `railway up --path-as-root` command to time out.

**Fix:** Create `scripts/playwright-linkedin/.railwayignore` with the following content:

```
node_modules/
dist/
*.log
.env
```

Full context: `docs/bugs/bug-railway-up-path-as-root-timeout.md`

---

### P0-2 · Move hardcoded credentials out of `docker-compose.yml`

**Area:** Security / Installation
**Effort:** 15 minutes
**Files:** `docker-compose.yml`, `.env` (new or existing), `.gitignore`

`docker-compose.yml` currently has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` hardcoded inline. Even though these are anon/dev keys today, this pattern is dangerous — it gets copied for production and ends up in git history.

**Fix:**

1. Remove inline env vars from `docker-compose.yml`.
2. Replace with `env_file: .env` in each service definition.
3. Confirm `.env` is in `.gitignore`.
4. Add those vars to `.env.example` with placeholder values (see P1-1).

---

### P0-3 · Commit or ignore `scripts/playwright-linkedin/package-lock.json`

**Area:** Repository hygiene
**Effort:** 5 minutes

`package-lock.json` inside `scripts/playwright-linkedin/` is untracked (shows in `git status`). This is either an oversight (should be committed for reproducible installs) or intentional (should be gitignored).

**Fix:** Commit it — lockfiles for deployable services should be tracked:

```bash
git add scripts/playwright-linkedin/package-lock.json
git commit -m "chore(p14): track playwright scraper lockfile"
```

---

## P1 — Do Soon

### P1-1 · Expand `.env.example` to cover all required variables

**Area:** Developer Experience / Installation
**Effort:** 30 minutes
**File:** `.env.example`

The current `.env.example` has only 3 variables. A new contributor following it will get a partially working app with confusing silent failures on edge function calls. All required and optional env vars should be listed, even with placeholder values.

**Suggested additions (non-exhaustive):**

```bash
# Supabase
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>

# Logging
VITE_LOGGING_ENABLED=true
VITE_LOG_SAMPLE_DEBUG_RATE=0.1
VITE_LOG_SAMPLE_TRACE_RATE=0.05

# LLM Provider (edge functions)
SATS_LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...

# LLM Model overrides (optional — defaults set in each function)
OPENAI_MODEL_ATS=gpt-4.1
OPENAI_TEMPERATURE_ATS=0.2
OPENAI_MAX_TOKENS_ATS=1500

# Privacy flags (edge functions)
STORE_LLM_PROMPTS=false
STORE_LLM_RAW_RESPONSE=false

# CORS (edge functions)
SATS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080

# External job APIs (P14/P16)
RAPID_API_KEY=<rapidapi-key>          # JSearch (US/global jobs)
ADZUNA_APP_ID=<adzuna-app-id>         # Adzuna (BR/AU/NZ/UK jobs)
ADZUNA_API_KEY=<adzuna-api-key>
```

---

### P1-2 · Add a React `<ErrorBoundary>` around route-level components

**Area:** Frontend Robustness
**Effort:** 1–2 hours
**File:** `src/App.tsx`

There is no React error boundary in the application. A runtime error in any page component (e.g., `ATSAnalysisModal`, `UpskillingRoadmaps`) will unmount the entire app, leaving the user with a blank screen and no recovery path.

**Fix:** Wrap the route outlet in `App.tsx` with a class-based `ErrorBoundary` (or a library like `react-error-boundary`):

```tsx
// src/components/ErrorBoundary.tsx
import { ErrorBoundary } from 'react-error-boundary'

// In App.tsx routes:
;<ErrorBoundary fallback={<ErrorFallback />}>
  <Outlet />
</ErrorBoundary>
```

The fallback should show a friendly error message with a "Reload" button, not a blank screen.

---

### P1-3 · Add `failed_at` + retry counter to `sats_staged_jobs`

**Area:** Backend Robustness / Observability
**Effort:** 2 hours (migration + scorer update)
**Files:** new migration, `supabase/functions/async-ats-scorer/index.ts`

The `async-ats-scorer` processes `sats_staged_jobs` rows on a schedule. If scoring fails (LLM timeout, schema violation, transient error), the row silently stays in its current state with no indication of failure. Admins and developers cannot distinguish "not yet scored" from "failed after N attempts."

**Fix:** Add to `sats_staged_jobs`:

- `scoring_failed_at TIMESTAMPTZ` — set on first failure
- `scoring_retry_count INT DEFAULT 0` — incremented on each failure
- `scoring_error TEXT` — last error message (sanitised, no raw LLM payloads)

Update `async-ats-scorer` to populate these on catch, and skip rows where `scoring_retry_count >= 3`.

---

### P1-4 · Add `postinstall` script to the Playwright scraper

**Area:** Developer Experience / Installation
**Effort:** 5 minutes
**File:** `scripts/playwright-linkedin/package.json`

After `npm install` inside `scripts/playwright-linkedin/`, contributors must manually run `npx playwright install chromium`. This step is not documented in the main README onboarding flow and is easy to miss, causing silent failures when the scraper runs.

**Fix:** Add to `scripts/playwright-linkedin/package.json`:

```json
{
  "scripts": {
    "postinstall": "playwright install chromium"
  }
}
```

Also add a note to the main `README.md` under the setup section: "The LinkedIn scraper (`scripts/playwright-linkedin/`) is a separate service with its own `npm install`."

---

### P1-5 · Add a circuit breaker / fetch audit for external job APIs

**Area:** Backend Robustness / Observability
**Effort:** 2–3 hours
**Files:** `supabase/functions/fetch-market-jobs/index.ts`, new migration

`fetch-market-jobs` calls JSearch (RapidAPI) and Adzuna. If either API returns a rate-limit error or goes down, the function returns nothing — silently. The admin dashboard shows no jobs, and there is no way to tell if this is "no matching jobs" or "API failure."

**Fix (minimum viable):** Add a `sats_fetch_audit` table (or a `last_fetch_status` column on a config table) that records:

- `fetched_at`
- `source` (jsearch / adzuna)
- `http_status`
- `rows_returned`
- `error_message` (if any)

This gives the admin dashboard visibility into API health without changing the scraping logic.

---

### P1-6 · Add a CI pipeline

**Area:** Developer Experience / Automation
**Effort:** 1–2 hours
**File:** `.github/workflows/ci.yml` (new)

No CI pipeline exists. `npm run verify` and `npm run ops` are manual only. There is no automated gate on PRs — lint failures, type errors, and test failures can merge undetected.

**Fix:** Create a GitHub Actions workflow that runs `npm run verify` on every push to `main` and every pull request. Add a second job to build the Docker image (`npm run build`) as a build-gate smoke test.

---

### P1-7 · Document and automate Supabase type regeneration

**Area:** Developer Experience / Schema Safety
**Effort:** 30 minutes
**Files:** `scripts/ops/` (new script), `CLAUDE.md`, `AGENTS.md`

`src/integrations/supabase/types.ts` is auto-generated but there is no documented process and no automation to regenerate it when migrations run. If schema diverges from types, the type checker silently passes broken code.

**Fix:**

1. Add `supabase gen types typescript --project-id <id> > src/integrations/supabase/types.ts` to `scripts/ops/` as `gen-types.sh`.
2. Document in `CLAUDE.md` and `AGENTS.md`: after every migration, run `npm run gen-types`.
3. Long-term: add this as a step in the CI workflow.

---

## P2 — Do When Convenient

### P2-1 · Enable `strict: true` in `tsconfig.app.json`

**Area:** Code Quality
**Effort:** 4–8 hours (fix all violations first)
**File:** `tsconfig.app.json`

`tsconfig.app.json` has `strict: false`, which is the root cause of the 69 current lint issues. The lint issues are non-blocking in CI today (by design, to allow gradual cleanup) but will continue to accumulate if the compiler doesn't enforce them.

**Recommended approach:**

1. Run `npm run lint 2>&1 | grep error` and fix module-by-module (start with `src/lib/`, then `src/hooks/`, then `src/components/`).
2. Once lint is clean, flip `"strict": true` in `tsconfig.app.json`.
3. Change the CI lint step from non-blocking to blocking.

---

### P2-2 · Consolidate domain-specific loggers with their domains

**Area:** Code Organisation
**Effort:** 1 hour (moves + import updates)

`src/lib/` currently has 7 logging files. Only `centralizedLogger.ts` and `requestContext.ts` are general-purpose. The three domain loggers are tightly coupled to specific features and would be easier to find co-located with the code they log:

| Current location                  | Better location                     |
| --------------------------------- | ----------------------------------- |
| `src/lib/authLogger.ts`           | `src/contexts/authLogger.ts`        |
| `src/lib/documentLogger.ts`       | `src/services/documentLogger.ts`    |
| `src/lib/jobDescriptionLogger.ts` | `src/hooks/jobDescriptionLogger.ts` |

`centralizedLogger.ts`, `requestContext.ts`, `devLogger.ts`, and `localLogger.ts` stay in `src/lib/`.

---

### P2-3 · Clarify the LinkedIn scraper's service boundary

**Area:** Repository Organisation
**Effort:** 30 minutes (docs only, or 2 hours if restructuring)

`scripts/playwright-linkedin/` is a fully separate Node.js service with its own `package.json`, `tsconfig.json`, and Railway deployment. Living under `scripts/` implies it's a utility script, but it's a long-running service. This creates ambiguity about ownership, testing, and docs.

**Two options:**

- **Option A (docs only):** Keep it in `scripts/`, add a `scripts/playwright-linkedin/README.md` documenting it as a standalone service, its deploy process, and its environment variables.
- **Option B (restructure):** Move to `services/linkedin-scraper/`, add to `docs/architecture.md` as a first-class service. Better long-term, but higher migration cost.

Recommended: Option A now, Option B when a second service is added.

---

### P2-4 · Add a minimal Supabase seed file

**Area:** Developer Experience
**Effort:** 1–2 hours
**File:** `supabase/seed.sql` (new)

Running `supabase db reset` produces a clean schema but no data. A first-time contributor has no way to see the app in action without manually creating an account, uploading a resume, adding a job description, and running an analysis.

A seed file with one demo user, one resume record, one job description, and one ATS analysis result would dramatically reduce "first run" friction and make UI development faster (no manual data setup before seeing a component render).

---

### P2-5 · Add a smoke test script for edge function deployments

**Area:** Operations / Deployment
**Effort:** 1–2 hours
**File:** `scripts/ops/smoke-test.sh` (new)

After deploying edge functions, there is no automated check that they respond correctly. A deploy can succeed at the infrastructure level (function is up) but be broken at the application level (missing env var returns 500). Currently this is only caught when a user triggers the function from the UI.

A smoke test script that hits each function with a known-bad payload (expect 400, not 500) would make post-deploy verification fast and scriptable:

```bash
# scripts/ops/smoke-test.sh
# Usage: ./scripts/ops/smoke-test.sh <supabase-url> <anon-key>
# Expected: all functions return 400 (bad input), not 500 (misconfigured)
```

Functions to cover: `ats-analysis-direct`, `enrich-experiences`, `generate-upskill-roadmap`, `linkedin-profile-ingest`, `fetch-market-jobs`.

---

### P2-6 · Archive completed plans in `plans/`

**Area:** Repository Organisation
**Effort:** 15 minutes

`plans/` currently mixes active plans (`p14.md` in progress) with fully completed ones (`p13.md`, completed stories of `p15.md`). As the project grows, this directory will become hard to scan.

**Fix:** Create `plans/archive/` and move completed plan files there after their last story merges to main. Update `plans/README.md` to describe the archive convention.

---

### P2-7 · Sync AI model label in UI with active LLM configuration

**Area:** Frontend / Developer Experience
**Effort:** 15 minutes
**Status:** **Done 2026-03-17**

`EnrichExperienceModal.tsx` displayed "The enrichment engine uses GPT-4o…" — wrong on two counts: the active model is `gpt-4.1-mini`, and the string was hardcoded so it fell out of sync every model change.

**Fix:** Added `VITE_AI_MODEL_LABEL` build-time env var to `.env.example` (defaulting to `gpt-4.1-mini`). Modal footer now reads `{import.meta.env.VITE_AI_MODEL_LABEL ?? 'AI'}` so operators can update the displayed label by changing a single env var without touching code. The `'AI'` fallback keeps the message accurate in test environments or when P17 dynamic selection ships.

Also fixed a misleading comment on `useCreateATSAnalysis` in `useATSAnalyses.ts` that incorrectly described the export as "direct OpenAI integration" when it actually delegates through the edge function.

---

## Fixed Issues (Session 2 — 2026-03-17)

### BUG-2026-03-17-LOCATION-RLS · `sats_locations` and `sats_companies` RLS INSERT failure

**Area:** Bug Fix / Database
**Status:** **Done 2026-03-17** — migration `20260317150000_fix_locations_companies_select_policy.sql` applied

PostgREST's `.insert().select().single()` pattern performs a SELECT re-check on the newly inserted row after the INSERT. The SELECT policies on both `sats_locations` and `sats_companies` required the row to already be linked to a `sats_job_descriptions` row owned by the user — impossible for a freshly inserted location/company. PostgREST surfaced this as "new row violates row-level security policy", which appeared to be an INSERT failure even though the INSERT WITH CHECK was correct.

**Root cause:** Over-restrictive SELECT policy (restrictive read applied to shared reference data). `sats_locations` stores city/state/country — geographic reference data with no sensitivity. `sats_companies` stores company names — also shared reference data.

**Fix:** Replaced both SELECT policies with `USING (true)` scoped to `authenticated` role. INSERT policies (which correctly require a non-empty field + authenticated user) are unchanged.

---

### P1-8 · Harden `fetch-logs.sh` for macOS BSD shell compatibility

**Area:** Operational Scripts / Developer Experience
**Status:** **Done 2026-03-17**

Three macOS-incompatible patterns fixed in `scripts/ops/fetch-logs.sh`:

1. `head -n -1` (GNU only) → replaced with `sed '$d'` (POSIX, strips last line)
2. `echo -e` colour output → replaced with `printf` (macOS `/bin/sh` ignores `-e`)
3. `.env` loader didn't strip surrounding quotes from values (e.g. `VAR="value"`) → added quote and inline-comment stripping using parameter expansion

---

### P1-9 · Add time-window filter to Admin LogViewer

**Area:** Observability / Developer Experience
**Status:** **Done 2026-03-17** — `src/components/admin/LogViewer.tsx`

The `LogViewer` component (Admin → Logging Control → Log Viewer) previously only filtered by count limit, with no recency constraint. Added a **Time Window** dropdown (Last 5 min / 15 min / 1h / 6h / 24h / All time) using `date-fns` `subMinutes`/`subHours`. Default is ERROR level + Last 1 hour — viewer opens ready for incident investigation without manual filter selection.

---

## Backlog Items (from 2026-03-23 review)

### P2-8 · Per-user API quotas on AI edge functions

**Area:** Security / Cost control
**Priority:** P2
**Effort:** 2–3 hr
**Identified:** 2026-03-23 multi-user readiness assessment

Currently there are no per-user limits on ATS analysis or enrichment requests. Any authenticated user can trigger unlimited `callLLM()` calls, creating unbounded OpenAI cost exposure and an abuse vector.

**Fix:** Add a pre-call quota check in each edge function (`ats-analysis-direct`, `enrich-experiences`, `linkedin-profile-ingest`):

```sql
-- Example: max 20 ATS analyses per user per day
SELECT COUNT(*) FROM sats_analyses
WHERE user_id = auth.uid()
  AND created_at >= NOW() - INTERVAL '1 day'
```

Return HTTP `429 Too Many Requests` if exceeded. Quota limits should be configurable via env vars (`SATS_MAX_ANALYSES_PER_DAY`, `SATS_MAX_ENRICHMENTS_PER_DAY`).

---

### P3-1 · i18n foundation — react-i18next + string extraction

**Area:** Internationalisation
**Priority:** P3
**Effort:** 3–5 days
**Identified:** 2026-03-23 multi-language readiness assessment

No i18n library is installed. All UI strings are hardcoded English throughout the component tree. The application is not ready for multi-language support.

**What exists as a foundation:**

- `date-fns` (`^3.6.0`) — locale-switchable date formatting already in use
- `.toLocaleString()` / `.toLocaleDateString()` — locale-aware number/date display

**Steps to implement:**

1. `npm install react-i18next i18next i18next-browser-languagedetector`
2. Create `public/locales/en/translation.json` and extract all hardcoded strings
3. Replace string literals in components with `t('key')` calls
4. Pass locale to `date-fns` `format()` calls
5. Add language switcher to Settings page

This is a mechanical refactor with no architectural changes required.

---

## Backlog Items (from 2026-03-26 Claude Code audit)

### P1-10 · Create `.claude/agents/` with full lifecycle sub-agent definitions

**Area:** Developer Experience / Agent Infrastructure
**Effort:** 1–2 hours
**Source:** Audit report `claude-audit-reports/audit_smartats-sats_20260326_164646.md`
**Status:** **Done 2026-03-26**

Created `.claude/agents/` with 16 agent files covering the full development lifecycle. A 17th agent (`product-analyst`) was added on 2026-03-26:

| File                      | Model  | Phase          |
| ------------------------- | ------ | -------------- |
| `product-analyst.md`      | Sonnet | Product        |
| `plan-decomposer.md`      | Sonnet | Planning       |
| `adr-author.md`           | Sonnet | Planning       |
| `migration-writer.md`     | Haiku  | Development    |
| `edge-fn-scaffolder.md`   | Haiku  | Development    |
| `component-scaffolder.md` | Haiku  | Development    |
| `changelog-keeper.md`     | Haiku  | Development    |
| `arch-reviewer.md`        | Sonnet | Review         |
| `convention-auditor.md`   | Sonnet | Review         |
| `security-auditor.md`     | Sonnet | Review         |
| `test-writer.md`          | Haiku  | Testing        |
| `test-runner.md`          | Haiku  | Testing        |
| `e2e-validator.md`        | Sonnet | Testing        |
| `llm-eval-runner.md`      | Sonnet | LLM Governance |
| `release-gatekeeper.md`   | Sonnet | Release        |
| `incident-responder.md`   | Sonnet | Operations     |
| `railway-deployer.md`     | Haiku  | Operations     |

---

### P1-11 · Create `.claude/skills/` with four reusable skill files

**Area:** Developer Experience / Agent Infrastructure
**Effort:** 1 hour
**Source:** Audit report `claude-audit-reports/audit_smartats-sats_20260326_164646.md`
**Status:** **Done 2026-03-26**

Created `.claude/skills/` with four skill files grounded in actual `_shared/` export signatures:

| Folder                       | Trigger phrases                                 | Purpose                                                                                                                         |
| ---------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `new-edge-function/SKILL.md` | "create edge function", "scaffold function"     | Full `index.ts` scaffold with real `cors.ts`/`env.ts`/`llmProvider.ts` imports, OPTIONS handler, 503 guard, telemetry try/catch |
| `new-migration/SKILL.md`     | "add a table", "create migration", "new column" | 14-digit timestamp name, `sats_` prefix, RLS policies template, `gen-types.sh` reminder                                         |
| `adr-draft/SKILL.md`         | "write an ADR", "document this decision"        | Auto-increments from current ADR-0006, canonical section structure                                                              |
| `verify-gate/SKILL.md`       | "run verify", "check before merge"              | Runs all 5 gates (`verify:full`, secrets, docs, update-log, blockers) and produces ✅/⚠️/❌ verdict                             |

---

### P1-12 · Create `.claude/commands/` with two operator shortcuts

**Area:** Developer Experience / Operator UX
**Effort:** 30 minutes
**Source:** Audit report `claude-audit-reports/audit_smartats-sats_20260326_164646.md`
**Status:** **Done 2026-03-26**

Created `.claude/commands/` with two slash commands:

- `/verify` — runs `npm run verify:full` and reports lint/type/test/build results
- `/release-check` — runs all release gates and produces a GO / NO-GO verdict table

---

### P1-13 · Make CI lint and UPDATE LOG checks blocking

**Area:** CI / Code Quality
**Effort:** 30 minutes (fix existing violations first)
**Files:** `.github/workflows/quality-gates.yml`
**Source:** Audit report `claude-audit-reports/audit_smartats-sats_20260326_164646.md`

Both the `npm run lint` and `check-update-log.sh` CI steps have `continue-on-error: true`. Convention violations (missing UPDATE LOG headers, lint errors) accumulate silently.

**Fix:**

1. Run `npm run lint` locally and fix any blocking errors (leave `no-unused-vars: off` to avoid churn).
2. Run `bash scripts/ops/check-update-log.sh` and add any missing headers.
3. Remove `continue-on-error: true` from both steps in `quality-gates.yml`.

---

### P2-9 · Fix stale MEMORY.md at project root

**Area:** Documentation / Agent Infrastructure
**Effort:** 15 minutes
**File:** `MEMORY.md` (project root, not `.claude/`)
**Source:** Audit report `claude-audit-reports/audit_smartats-sats_20260326_164646.md`

The `MEMORY.md` at project root contains early-version instructions that conflict with `CLAUDE.md` and `coding-conventions.md`. Specifically, the header format it documents (`YYYY-MM-DD HH24:MM:SS`) differs from the UPDATE LOG format in `coding-conventions.md` (`YYYY-MM-DD HH:MM:SS`). Claude Code reads this file alongside `CLAUDE.md` and may act on contradicting instructions.

**Fix:** Review against `docs/conventions/coding-conventions.md` and either remove outdated entries or replace the file content with a single redirect line pointing to the canonical files.

---

### P2-10 · Update CLAUDE.md with agent delegation table, test coverage expectations, and Codex handoff note

**Area:** Documentation / Agent Infrastructure
**Effort:** 20 minutes
**File:** `CLAUDE.md`
**Source:** Audit report `claude-audit-reports/audit_smartats-sats_20260326_164646.md` — CLAUDE.md Recommendation section

Now that `.claude/agents/` (16 agents) and `.claude/skills/` (4 skills) exist, `CLAUDE.md` should reference them so future sessions know what is available. Three targeted changes:

**1. ADD — Agent Delegation section** (insert after `## Primary Responsibilities`):

A table mapping tasks to agents (arch-reviewer, migration-writer, edge-fn-scaffolder, security-auditor, test-runner, release-gatekeeper) and a list of available skills (`/new-edge-function`, `/new-migration`, `/adr-draft`, `/verify-gate`).

**2. ADD — Test coverage expectations** (append to `## Key Commands`):

```
# Test coverage expectations
# Unit tests: tests/unit/**/*.test.ts
# E2E tests: manual validation documented in docs/releases/UNTESTED_IMPLEMENTATIONS.md
# New features: at minimum one unit test per utility/hook; E2E session required before
#   removing an item from UNTESTED_IMPLEMENTATIONS.md
```

**3. CHANGE — Codex handoff section**: Add one line noting that after creating a handoff plan, a session checkpoint should be recorded via `make checkpoint`.

---

---

## UI/UX Excellence Backlog (P19 — from 2026-03-26 gap analysis)

> Full staged plan: `plans/p19-uiux-excellence.md`. Each item below maps to a story in that plan.

### UIUX-1 · Install Geist font and define type scale in Tailwind

**Area:** Frontend / Design Foundation
**Priority:** P1
**Effort:** 1 hr
**Plan story:** P19 S1-1
**Status:** Open

SmartATS has no custom typeface. The browser renders with the default system-ui stack, which lacks the personality and legibility of products like Linear, Vercel, and Notion. Geist (Vercel's open-source font) is designed for developer-facing UIs and pairs well with the existing slate/HSL token palette.

**Fix:** Install `geist` npm package, add `@font-face` to `src/index.css`, extend `tailwind.config.ts` with `fontFamily.sans`. Record layout regression check in the validation form in P19 S1-1.

---

### UIUX-2 · Install Framer Motion and create animation presets

**Area:** Frontend / Motion System
**Priority:** P1
**Effort:** 1 hr
**Plan story:** P19 S1-2
**Status:** Open

No motion library is installed. UI interactions (modal open/close, page load, list renders) feel static compared to modern apps. `tailwindcss-animate` only covers CSS enter/exit transitions — no spring physics, gesture animations, or layout animations.

**Fix:** `npm install framer-motion`, create `src/lib/animations.ts` with five named presets (`fadeIn`, `slideUp`, `scaleIn`, `listItem`, `staggerContainer`). No component changes in this story — presets are applied in UIUX-3, UIUX-4, UIUX-5.

---

### UIUX-3 · Animate modals and dialogs (Dialog, Sheet, Drawer)

**Area:** Frontend / Micro-interactions
**Priority:** P1
**Effort:** 1–2 hr
**Plan story:** P19 S2-1
**Status:** Open — blocked by UIUX-2

Wrap `DialogContent`, `SheetContent`, and `DrawerContent` in `<motion.div>` using the `scaleIn`/`slideUp` presets. Must verify ESC, backdrop close, and form submission still work. Respect `prefers-reduced-motion`.

---

### UIUX-4 · Animate page transitions and list renders

**Area:** Frontend / Micro-interactions
**Priority:** P1
**Effort:** 2–3 hr
**Plan stories:** P19 S2-2, S2-3
**Status:** Open — blocked by UIUX-2

Two sub-tasks:

1. Wrap route `<Outlet />` in `<AnimatePresence>` + `fadeIn` for smooth page transitions.
2. Apply `staggerContainer` + `listItem` to Analyses, Resumes, and Jobs list pages for a staggered card entrance.

---

### UIUX-5 · Add axe-core accessibility tests to Vitest

**Area:** Frontend / Accessibility
**Priority:** P2
**Effort:** 2–3 hr
**Plan story:** P19 S3-1
**Status:** Open

No accessibility testing exists. Radix UI primitives provide structural a11y, but focus management, ARIA labels, and colour contrast are not validated. Add `jest-axe` + `@testing-library/react` tests for 5 main pages. Make the CI step blocking.

---

### UIUX-6 · Add Playwright visual screenshot baselines

**Area:** Frontend / Visual Regression
**Priority:** P2
**Effort:** 2–3 hr
**Plan story:** P19 S3-2
**Status:** Open

No visual regression coverage. Layout and styling changes can merge silently. Add Playwright screenshot tests for Dashboard, Resumes, ATSAnalyses, Experiences, Settings. Start non-blocking; promote to blocking after 2 stable sprints.

---

### UIUX-7 · Add bundle analyser + Lighthouse CI gate

**Area:** Frontend / Performance
**Priority:** P2
**Effort:** 2–3 hr
**Plan story:** P19 S4-1
**Status:** Open

No performance gate. Framer Motion and future dependencies could silently inflate the bundle. Add `rollup-plugin-visualizer` to `vite.config.ts` (generates `dist/stats.html` on build) and Lighthouse CI to `quality-gates.yml` with thresholds: performance ≥ 80, a11y ≥ 90.

---

### UIUX-8 · Bootstrap Storybook with existing shadcn/ui components

**Area:** Frontend / Design System
**Priority:** P3
**Effort:** 4–8 hr
**Plan story:** P19 S5-1
**Status:** Open — lowest priority, do after S1–S4

Storybook isolates component development, documents variants, and catches visual drift between PRs. Bootstrap with `@storybook/react-vite`, write 6 core component stories (Button, Card, Badge, Input, Dialog, Table) with dark mode and `@storybook/addon-a11y`.

---

## Maintenance Backlog (2026-03-26 — platform migration)

### MAINT-1 · Remove Lovable.dev artifacts and redirect everything to local development

**Area:** Codebase Hygiene / Infrastructure
**Priority:** P1
**Effort:** 1–2 hr
**Identified:** 2026-03-26 — application was bootstrapped on lovable.dev, subscription cancelled, source moved to local development
**Status: COMPLETED — 2026-03-30** — `lovable-tagger` uninstalled (`npm uninstall lovable-tagger`), `componentTagger()` removed from `vite.config.ts`, all Lovable meta tags replaced with SmartATS branding in `index.html`.

The codebase still carries Lovable.dev platform artifacts. These are harmless in development but expose a stale external dependency (`lovable-tagger`) and incorrect metadata served to browsers and crawlers.

**Files to audit and fix:**

| File             | What to change                                                                                                                                                                                                                                                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.html`     | Replace `<meta name="description">`, `<meta name="author">`, `<meta property="og:*">`, and `<meta name="twitter:*">` tags that reference `lovable.dev` or "Lovable Generated Project" with SmartATS-specific values. Remove the `og:image` and `twitter:image` URLs pointing to `https://lovable.dev/opengraph-image-p98pqg.png`. |
| `vite.config.ts` | Remove the `componentTagger()` Vite plugin import and usage. `lovable-tagger` injects Lovable editor overlays and is a no-op (or a liability) outside the Lovable IDE.                                                                                                                                                            |
| `package.json`   | Remove `lovable-tagger` from `devDependencies`. Run `npm install` to update `package-lock.json`.                                                                                                                                                                                                                                  |

**Search command to confirm no remaining references after fix:**

```bash
grep -r "lovable" . --include="*.{ts,tsx,html,json,md}" --exclude-dir=node_modules
```

**Non-goals:** Do not audit `package-lock.json` manually — it regenerates on `npm install`. Do not remove the README.md UPDATE LOG entry that documents the migration history.

---

### MAINT-2 · Migrate all OpenAI Codex tooling, runbooks, and references to Claude Code exclusively

**Area:** Developer Tooling / Documentation
**Priority:** P1
**Effort:** 2–4 hr
**Identified:** 2026-03-26 — development transitioned from OpenAI Codex → Claude Code; residual Codex scaffolding still present

The project was developed sequentially on: Lovable.dev → OpenAI Codex → Claude Code. The Claude Code environment (`CLAUDE.md`, `.claude/`) is the canonical toolchain. Codex-specific files and references should be migrated or retired so that a new contributor does not encounter contradicting or obsolete tooling instructions.

**Files and areas to audit:**

| File / Area                                            | Action                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AGENTS.md` (project root)                             | Review content. If it contains Codex-specific prompt instructions that are superseded by `CLAUDE.md`, retire or archive it. If it contains instructions still relevant to agent collaboration, migrate the relevant content into `CLAUDE.md` or a new `.claude/` agent file, then delete or stub `AGENTS.md`. |
| `docs/runbooks/CODEX_SESSION_CONTINUITY.md`            | Codex session continuity runbook. Assess whether it contains reusable patterns (checkpoint discipline, handoff structure). If yes, migrate the useful parts into `docs/runbooks/` as a Claude Code–flavoured session guide. Then archive or remove the Codex-specific file.                                   |
| `docs/decisions/adr-0001-agent-collaboration-model.md` | Documents the original Codex/Claude split model. Update the ADR status to `Superseded` and add a note that Claude Code is now the sole agentic toolchain.                                                                                                                                                     |
| `docs/conventions/coding-conventions.md`               | Search for any Codex-specific workflow instructions. Replace with Claude Code equivalents where they exist; remove if obsolete.                                                                                                                                                                               |
| `CLAUDE.md` — "Handoff to Codex" section               | Rename to "Handoff / Implementation Delegation" and update the four-point checklist to describe handing off to Claude Code sub-agents (`.claude/agents/`) instead of Codex.                                                                                                                                   |
| `docs/sessions/`                                       | Codex session log directory. These are historical records — do **not** delete them, but add a `README.md` or header comment noting they are archived Codex session logs and that active session continuity now uses Claude Code's project memory (`.claude/projects/*/memory/`).                              |
| Plans and archive files that mention Codex             | Audit `plans/` and `plans/archive/` for any Codex-specific workflow steps (e.g. `make checkpoint`, Codex task format). Replace or annotate as historical.                                                                                                                                                     |

**Search command to find all remaining Codex references:**

```bash
grep -rl "codex\|Codex\|AGENTS\.md" . \
  --include="*.{ts,tsx,js,md,txt,yml,yaml}" \
  --exclude-dir=node_modules \
  --exclude-dir=.git
```

**Non-goals:** Do not rewrite the git history or commit messages that mention Codex. Do not delete `docs/sessions/` — the logs are useful institutional memory. Do not rename the `AGENTS.md` concept wholesale without first confirming Claude Code does not use `AGENTS.md` itself.

---

## Future Backlog (P17 — from product roadmap)

### P17-BYOK · Per-user model preference + Bring Your Own Key + AI opt-out

**Area:** Product Platform / AI Infrastructure
**Priority:** High (added to roadmap 2026-03-17)
**Effort:** 3 stories (see `docs/decisions/product-roadmap.md` § P17)

Builds on the `_shared/llmProvider.ts` abstraction (P16 S0). Three stories:

- **S1** — `profiles.preferred_llm_provider` + `preferred_model` columns; Settings dropdown; edge functions read at call time (1 migration + minor `callLLM()` context change)
- **S2** — BYOK: encrypted key per user via Supabase Vault; `callLLM()` routes through user's key when present; replaces the dead "API key generation" Settings placeholder
- **S3** — `profiles.ai_processing_enabled` flag; all edge functions gate on it; Settings AI opt-out toggle for GDPR / data-sovereignty compliance

---

## Summary Table

| ID                          | Area                                                                                      | Priority | Effort      | Status                                |
| --------------------------- | ----------------------------------------------------------------------------------------- | -------- | ----------- | ------------------------------------- |
| P0-1                        | Create `.railwayignore`                                                                   | P0       | 5 min       | **Done 2026-03-17**                   |
| P0-2                        | Remove hardcoded creds from docker-compose                                                | P0       | 15 min      | **Done 2026-03-17**                   |
| P0-3                        | Commit/ignore playwright lockfile                                                         | P0       | 5 min       | **Done 2026-03-17**                   |
| P1-1                        | Expand `.env.example`                                                                     | P1       | 30 min      | **Done 2026-03-17**                   |
| P1-2                        | Add React `ErrorBoundary`                                                                 | P1       | 1–2 hr      | **Done 2026-03-17**                   |
| P1-3                        | Add failure tracking to `sats_staged_jobs`                                                | P1       | 2 hr        | Open                                  |
| P1-4                        | Add `postinstall` to playwright `package.json`                                            | P1       | 5 min       | **Done 2026-03-17**                   |
| P1-5                        | Circuit breaker / fetch audit for job APIs                                                | P1       | 2–3 hr      | Open                                  |
| P1-6                        | Add a CI pipeline                                                                         | P1       | 1–2 hr      | **Done 2026-03-17** (test step added) |
| P1-7                        | Document and automate Supabase type regeneration                                          | P1       | 30 min      | **Done 2026-03-17**                   |
| P1-8                        | Harden `fetch-logs.sh` for macOS BSD compatibility                                        | P1       | 30 min      | **Done 2026-03-17**                   |
| P1-9                        | Add time-window filter to Admin LogViewer                                                 | P1       | 1 hr        | **Done 2026-03-17**                   |
| BUG-2026-03-17-LOCATION-RLS | Fix `sats_locations`/`sats_companies` SELECT policy                                       | Bug/P0   | 30 min      | **Done 2026-03-17**                   |
| P2-1                        | Enable `strict: true` in `tsconfig.app.json`                                              | P2       | 4–8 hr      | Open                                  |
| P2-2                        | Co-locate domain loggers with their domains                                               | P2       | 1 hr        | Open                                  |
| P2-3                        | Clarify LinkedIn scraper service boundary                                                 | P2       | 30 min–2 hr | Open                                  |
| P2-4                        | Add Supabase seed file                                                                    | P2       | 1–2 hr      | Open                                  |
| P2-5                        | Add smoke test script for edge functions                                                  | P2       | 1–2 hr      | Open                                  |
| P2-6                        | Archive completed plans                                                                   | P2       | 15 min      | Open                                  |
| P2-7                        | Sync AI model label in UI with active LLM config                                          | P2       | 15 min      | **Done 2026-03-17**                   |
| P2-8                        | Add per-user API quotas (ATS/enrichment rate limiting)                                    | P2       | 2–3 hr      | Open                                  |
| P3-1                        | i18n foundation — install react-i18next, extract all hardcoded strings                    | P3       | 3–5 days    | Open                                  |
| P17-BYOK                    | Per-user model preference + BYOK + AI opt-out                                             | High     | 3 stories   | Planned (P17)                         |
| P1-10                       | Create `.claude/agents/` with full lifecycle sub-agent definitions (16 agents)            | P1       | 1–2 hr      | **Done 2026-03-26**                   |
| P1-11                       | Create `.claude/skills/` with 4 skill files                                               | P1       | 1 hr        | **Done 2026-03-26**                   |
| P1-12                       | Create `.claude/commands/` with 2 operator shortcuts                                      | P1       | 30 min      | **Done 2026-03-26**                   |
| P1-13                       | Make CI lint + UPDATE LOG checks blocking (remove `continue-on-error`)                    | P1       | 30 min      | Open                                  |
| P2-9                        | Fix stale MEMORY.md at project root (conflicting header format)                           | P2       | 15 min      | Open                                  |
| P2-10                       | Update CLAUDE.md — agent delegation table, test coverage expectations, Codex handoff note | P2       | 20 min      | Open                                  |
| UIUX-1                      | Install Geist font + Tailwind type scale                                                  | P1       | 1 hr        | Open                                  |
| UIUX-2                      | Install Framer Motion + animation presets in `src/lib/animations.ts`                      | P1       | 1 hr        | Open                                  |
| UIUX-3                      | Animate modals/dialogs (Dialog, Sheet, Drawer)                                            | P1       | 1–2 hr      | Open                                  |
| UIUX-4                      | Animate page transitions + list stagger (Analyses, Resumes, Jobs)                         | P1       | 2–3 hr      | Open                                  |
| UIUX-5                      | Add axe-core a11y tests to Vitest — 5 main pages, CI blocking                             | P2       | 2–3 hr      | Open                                  |
| UIUX-6                      | Add Playwright visual screenshot baselines — 5 main pages                                 | P2       | 2–3 hr      | Open                                  |
| UIUX-7                      | Add bundle analyser + Lighthouse CI gate (performance ≥ 80, a11y ≥ 90)                    | P2       | 2–3 hr      | Open                                  |
| UIUX-8                      | Bootstrap Storybook with 6 shadcn/ui component stories + a11y addon                       | P3       | 4–8 hr      | Open                                  |
| MAINT-1                     | Remove Lovable.dev artifacts (`lovable-tagger`, `index.html` meta tags, `vite.config.ts`) | P1       | 1–2 hr      | **COMPLETED 2026-03-30**              |
| MAINT-2                     | Migrate all Codex tooling, runbooks, and references to Claude Code exclusively            | P1       | 2–4 hr      | **Done 2026-03-26**                   |

---

## Product Feature Backlog — Job Seeker Gap Analysis (2026-03-27)

> Items below are **product features** (not tech debt) identified from market research on 2026-03-27.
> Source: `docs/audits/job-seeker-gap-analysis-2026-03-27.md`
> Research basis: A Life After Layoff (Bryan Creely), The Interview Guys 2025 State of Job Search Report, scale.jobs, Reddit communities, Jobscan/Teal market data.

| ID      | Feature                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Builds On                                                            | Priority  | Effort Est. | Status |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | --------- | ----------- | ------ |
| PROD-1  | **Interview Readiness Score** — per-skill authenticity check: flags keywords on resume not backed by enriched experience entries. Surfaces as Red/Green signal alongside ATS score.                                                                                                                                                                                                                                                                                                                                                                             | P13 enriched experiences + P14/P18 ATS scoring                       | High      | 2–3 stories | Open   |
| PROD-2  | **Career Gap Advisor** — detects employment gaps from resume timeline; surfaces recruiter-informed framing language, suggests what to emphasise from the gap period, and calibrates job targets accordingly. Integrates with P15 roadmap.                                                                                                                                                                                                                                                                                                                       | Resume timeline analysis + P15 upskilling roadmap                    | High      | 2 stories   | Open   |
| PROD-3  | **Application Debrief** — when a user marks a role as "rejected" or "no response," runs an LLM analysis against their ATS score and gap data to explain likely rejection reasons and what a stronger application would have looked like.                                                                                                                                                                                                                                                                                                                        | Application stage tracking (Priority 3 roadmap) + LLM                | Medium    | 1–2 stories | Open   |
| PROD-4  | **Profile Consistency Check** — compares LinkedIn-imported data (P13) against resume content; flags discrepancies in titles, dates, company names, and skill claims before an application is submitted.                                                                                                                                                                                                                                                                                                                                                         | P13 LinkedIn import data                                             | Medium    | 1 story     | Open   |
| PROD-5  | **Career Fit Map** — uses enriched experiences, skill profile, and aggregate ATS scoring data from the proactive job pipeline to show which role categories the user is genuinely competitive for today vs in 6/12 months, with the specific delta to close the gap.                                                                                                                                                                                                                                                                                            | Aggregate ATS scores + enriched profile + P14 pipeline               | High      | 3–4 stories | Open   |
| PROD-6  | **Your Market Report** — periodic digest (weekly/monthly) personalised to the user: top skills appearing in their matched jobs that their profile lacks, ATS score trend over time, score changes as roadmap milestones complete, roles newly above threshold.                                                                                                                                                                                                                                                                                                  | P14 staged jobs + scoring data in aggregate                          | Medium    | 2 stories   | Open   |
| PROD-7  | **Progress Dashboard** — surfaces positive momentum signals to combat job-search burnout: week-over-week score trend, roadmap completion %, skills added, applications sent vs interviews received rate.                                                                                                                                                                                                                                                                                                                                                        | Roadmap + score history + application funnel                         | Medium    | 1–2 stories | Open   |
| PROD-8  | **Smart Cover Letter** — generates genuinely personalised, narrative-driven cover letters grounded in the user's actual enriched experiences and the specific gap analysis for each role. Not generic; leads with strongest matched skills and addresses missing skills honestly.                                                                                                                                                                                                                                                                               | P13 enriched experiences + P18 CV optimisation                       | High      | 2 stories   | Open   |
| PROD-9  | **ATS Format Audit** — a universal, standalone format-check pass that flags ATS-breaking patterns: tables/columns, emojis or graphics in body, non-standard section headings, missing LinkedIn/portfolio URL, vague bullets lacking metrics, length mismatch vs. experience level. Surfaced as a dedicated "Format Health" card alongside the ATS score. Free-tier activation driver — delivers immediate, tangible value with no JD required.                                                                                                                  | Existing `format_quality` scoring dimension + resume text extraction | High      | 1–2 stories | Open   |
| PROD-10 | **Geography Mode ("Format Passport")** — when a job description targets a specific country (detected from JD text or user-selected), run a parallel format-check pass against that country's recruiter norms (photo inclusion, length, personal details, section naming, tone register). Produce a "Format Passport" — a short checklist of what to add, remove, or adjust to meet local expectations. Initial markets: US, UK, DE, BR, AU/NZ. Unlocked on Pro tier.                                                                                            | `buildATSPrompt()` enrichment + geography detection from JD          | High      | 2–3 stories | Open   |
| PROD-11 | **Industry Lens (Vertical Classifier)** — classify the job description by industry vertical (Tech, Finance, Healthcare, Legal, Creative, Academic, Startup) and overlay industry-specific format rules as a second scoring pass. Produces targeted advice: e.g. "Healthcare roles expect a CV with a Publications and Licensure section — yours is formatted as a standard résumé." Vertical classification is inferred from JD text with no extra user input. Unlocked on Pro tier.                                                                            | JD text + `domain_fit` dimension in existing rubric                  | High      | 2–3 stories | Open   |
| PROD-12 | **Cultural Tone Advisor** — LLM analysis of the résumé's writing register (first-person vs. third, personal narrative vs. functional, formal vs. conversational) flagged against the cultural norms of the target market. Example: a BR-style narrative résumé sent to a UK/US recruiter reads as boilerplate; a Japanese structured format sent to a US startup reads as rigid. Surfaces as "Tone & Style" recommendations beneath the format score. Strongest differentiator vs. all current competitors — no tool does this today. Max/C-Level moat feature. | Geography Mode (PROD-10) + LLM tone classification                   | Very High | 3–4 stories | Open   |

---

## WAF Review Items — 2026-03-31 (AWS Well-Architected Framework Full Review)

Source: `docs/improvements/CODE-REVIEW-2026-03-31.md`

### P0 — CRITICAL (do immediately)

#### WAF-1 · Migrate `linkedin-profile-ingest` to `callLLM()` — raw provider body exposed

**Area:** Security / LLM Layer
**Effort:** 2–3 hours
**File:** `supabase/functions/linkedin-profile-ingest/index.ts` (lines 381–447)
**Pillar:** Security (SEC-1), Performance (PERF-1), Sustainability (SUS-2)

`runNormalizationWithSchema()` makes direct OpenAI HTTP calls and exposes `providerBody` in error strings returned to the client. This bypasses `mapProviderError()`, `callLLM()` fallback logic, cost tracking, and `logContext`. Resolves three WAF findings simultaneously.

**Fix:** Replace with `callLLM({ modelCandidates: [OPENAI_MODEL_LINKEDIN_INGEST, OPENAI_MODEL_LINKEDIN_INGEST_FALLBACK], ... })`.

---

### P1 — MAJOR (next 2 sprints)

#### WAF-2 · Add env validation guards to `delete-account` and `cancel-account-deletion` (503 not TypeError)

**Area:** Reliability / Security
**Effort:** 30 min
**Files:** `supabase/functions/delete-account/index.ts` (lines 35–36), `supabase/functions/cancel-account-deletion/index.ts` (lines 30–31)
**Pillar:** Security (SEC-2), Reliability (REL-4 pattern)

Both functions use non-null assertion `!` on env vars inside a try/catch. Missing config produces a 400 TypeError instead of 503. Must return 503 for misconfiguration (coding-conventions.md).

#### WAF-3 · Add `logContext` to `callLLM()` in all 5 affected edge functions

**Area:** Cost Governance / Observability
**Effort:** 1 hour
**Files:** `ats-analysis-direct`, `async-ats-scorer`, `enrich-experiences`, `generate-upskill-roadmap` (all `callLLM()` call sites)
**Pillar:** Reliability (REL-1), Cost Optimization (COST-1)

`sats_llm_call_logs` table exists but only `classify-skill-profile` writes to it. Add `logContext: { userId, functionName, analysisId? }` to every `callLLM()` call.

#### WAF-4 · Add `staleTime` to all TanStack Query hooks

**Area:** Performance / Reliability
**Effort:** 2 hours
**Files:** All hooks in `src/hooks/`
**Pillar:** Performance (PERF-2), Reliability (REL-2)

`staleTime: 0` (default) causes every component mount to trigger a Supabase refetch. Set domain-appropriate stale times: 30–60s for user data, 5min for reference data.

#### WAF-5 · Add idempotency check in `async-ats-scorer` before LLM call

**Area:** Reliability / Cost
**Effort:** 1 hour
**File:** `supabase/functions/async-ats-scorer/index.ts` (lines 612–637)
**Pillar:** Reliability (REL-3), Sustainability (SUS-1)

Upsert with `ignoreDuplicates: false` overwrites completed analyses on each cron run. Check `status = 'completed'` before running LLM call to prevent re-scoring.

#### WAF-6 · Set milestone to make CI lint and UPDATE LOG checks blocking

**Area:** CI / Operational Excellence
**Effort:** 1 sprint to clear debt; 15 min to flip gate
**File:** `.github/workflows/quality-gates.yml`
**Pillar:** Operational Excellence (OE-1)

Both checks have `continue-on-error: true`. Create a lint-baseline file and set a sprint target to remove the flag.

#### WAF-7 · Replace mock data in `fetch-market-jobs` with real job aggregator API

**Area:** Product Feature Completeness
**Effort:** 1–2 sprints
**File:** `supabase/functions/fetch-market-jobs/index.ts`
**Pillar:** Operational Excellence (OE-2)

Hardcoded 3 mock jobs means the proactive match feature is non-functional in production. The deduplication hash prevents the same jobs from being re-inserted after the first run.

---

### P2 — MINOR (backlog)

#### WAF-8 · Scope `sats_outbox_events` RLS to service_role only

**File:** `supabase/migrations/20260328070000_p21_s6_outbox_events.sql` (line 38)
**Pillar:** Security (SEC-3)
Change `FOR ALL USING (true)` to `FOR ALL TO service_role USING (true)`.

#### WAF-9 · Fix conflicting RLS policies on `sats_rate_limit_counters`

**File:** `supabase/migrations/20260328080000_p21_s6_rate_limits.sql` (lines 37–44)
**Pillar:** Security (SEC-4)
The `FOR ALL USING (true)` policy overrides the per-user SELECT restriction via OR composition. Scope to `TO service_role`.

#### WAF-10 · Replace `console.log` in deletion edge functions with structured `logEvent()`

**Files:** `supabase/functions/delete-account/index.ts`, `supabase/functions/cancel-account-deletion/index.ts`
**Pillar:** Operational Excellence (OE-3)

#### WAF-11 · Import `getEnvNumber` from `_shared/env.ts` in `centralized-logging`

**File:** `supabase/functions/centralized-logging/index.ts` (lines 14–19)
**Pillar:** Operational Excellence (OE-4)

#### WAF-12 · Route `AuthContext.tsx` logging through `authEvents.*` consistently

**File:** `src/contexts/AuthContext.tsx` (~20 console.log/error calls)
**Pillar:** Operational Excellence (OE-5)

#### WAF-13 · Move env validation in `generate-upskill-roadmap` to before handler try/catch

**File:** `supabase/functions/generate-upskill-roadmap/index.ts` (lines 255–268)
**Pillar:** Reliability (REL-4)

#### WAF-14 · Pre-fetch user baselines with `Promise.all()` in `async-ats-scorer`

**File:** `supabase/functions/async-ats-scorer/index.ts` (lines 582–658)
**Pillar:** Performance (PERF-3)
Currently 2 serial DB queries per (job, resume) pair. For 8 jobs × 10 users = 160 sequential queries. Pre-fetch all baselines once using batch queries.

#### WAF-15 · Add `SATS_FETCH_MARKET_JOBS_MAX` budget cap for job aggregator integration

**File:** `supabase/functions/fetch-market-jobs/index.ts`
**Pillar:** Cost Optimization (COST-2)

#### WAF-16 · Add `STORE_LLM_PROMPTS` / `STORE_LLM_RAW_RESPONSE` flags to all LLM edge functions

**Files:** `async-ats-scorer`, `enrich-experiences`, `generate-upskill-roadmap`, `classify-skill-profile`
**Pillar:** Cost Optimization (COST-3)

#### WAF-17 · Enforce stagger 10-item cap in animation wrapper or convention check

**File:** `src/lib/animations.ts` (line 51)
**Pillar:** Sustainability (SUS-3)

#### WAF-18 · Remove `console.log('TODO: email...')` lines exposing email addresses in logs

**Files:** `supabase/functions/delete-account/index.ts` (line 228), `supabase/functions/cancel-account-deletion/index.ts` (line 137)
**Pillar:** Sustainability (SUS-4), Operational Excellence (OE-3)
Track email notification as a proper P1 in this backlog.

---

## Infrastructure Decisions (INFRA)

### INFRA-1 · LinkedIn scraper hosting — review at scale (MVP-TEMPORARY)

**Area:** Infrastructure / Hosting
**Status:** MVP decision made 2026-03-31. Must be revisited before public launch / scale-up.
**Priority:** BACKLOG (review trigger: >100 MAU or first enterprise customer)

**Current state (MVP):** The LinkedIn profile scraper (`scripts/playwright-linkedin/`) is
deployed on **Railway** (Hobby plan, $5 credit/month — covers all MVP scrape volume).
Fly.io was attempted on 2026-03-31 but blocked (requires payment method; Docker auth callback
broken). Decision reversed on 2026-04-01: Railway for MVP, Fly.io at Growth stage.
See full comparison: `docs/audits/linkedin-scraper-hosting-comparison-2026-04-01.md`.

**Why this is flagged temporary:**
Fly.io free tier has hard limits (160 GB-hours/month, no SLA, auto-stop cold starts of ~30s).
At scale, Playwright/Chromium-based scraping also raises LinkedIn ToS and rate-limit concerns
that need a proper architectural decision.

**Options to evaluate at scale:**

| Option | Upside | Downside |
|---|---|---|
| Fly.io paid tier | Same codebase, just upgrade | Still a managed scraper — LinkedIn ToS risk |
| Browserless.io API | No infrastructure to manage | External dependency, ~$10–49/mo |
| LinkedIn Official API (LinkedIn Partner Program) | ToS-safe, reliable | Requires LinkedIn partnership application |
| Drop the feature | Zero cost and risk | LinkedIn import UX removed |
| Self-hosted VPS | Full control, predictable cost | Ops burden |

**Trigger to revisit:** Before any of these events:
1. Scaling beyond MVP / first 100 MAU
2. LinkedIn login starts failing consistently (bot detection)
3. Enterprise customer with LinkedIn enrichment as a hard requirement
4. Monthly Fly.io bill exceeds $10 (means usage has grown beyond free tier)

**Files affected when revisiting:**
- `scripts/playwright-linkedin/fly.toml` (replace or remove)
- `supabase/functions/linkedin-profile-ingest/index.ts` (update `PLAYWRIGHT_SERVICE_URL`)
- `CLAUDE.md` Architecture section
- This entry
