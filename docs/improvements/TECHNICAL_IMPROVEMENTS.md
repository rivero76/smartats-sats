# Technical Improvements Backlog

<!-- Created: 2026-03-16 — sourced from Claude Code architecture review -->
<!-- Updated: 2026-03-17 — added P1-6 (CI pipeline) and P1-7 (Supabase type regeneration) -->
<!-- Updated: 2026-03-17 — P0-1, P0-2, P0-3 completed; P1-1, P1-2, P1-4, P1-6, P1-7 completed -->
<!-- Updated: 2026-03-17 (session 2) — BUG-2026-03-17-LOCATION-RLS fixed; log fetch script hardened; LogViewer time-window filter added; P17 BYOK added as future backlog item -->

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
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080

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
import { ErrorBoundary } from 'react-error-boundary';

// In App.tsx routes:
<ErrorBoundary fallback={<ErrorFallback />}>
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

| Current location | Better location |
|---|---|
| `src/lib/authLogger.ts` | `src/contexts/authLogger.ts` |
| `src/lib/documentLogger.ts` | `src/services/documentLogger.ts` |
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

| ID | Area | Priority | Effort | Status |
|---|---|---|---|---|
| P0-1 | Create `.railwayignore` | P0 | 5 min | **Done 2026-03-17** |
| P0-2 | Remove hardcoded creds from docker-compose | P0 | 15 min | **Done 2026-03-17** |
| P0-3 | Commit/ignore playwright lockfile | P0 | 5 min | **Done 2026-03-17** |
| P1-1 | Expand `.env.example` | P1 | 30 min | **Done 2026-03-17** |
| P1-2 | Add React `ErrorBoundary` | P1 | 1–2 hr | **Done 2026-03-17** |
| P1-3 | Add failure tracking to `sats_staged_jobs` | P1 | 2 hr | Open |
| P1-4 | Add `postinstall` to playwright `package.json` | P1 | 5 min | **Done 2026-03-17** |
| P1-5 | Circuit breaker / fetch audit for job APIs | P1 | 2–3 hr | Open |
| P1-6 | Add a CI pipeline | P1 | 1–2 hr | **Done 2026-03-17** (test step added) |
| P1-7 | Document and automate Supabase type regeneration | P1 | 30 min | **Done 2026-03-17** |
| P1-8 | Harden `fetch-logs.sh` for macOS BSD compatibility | P1 | 30 min | **Done 2026-03-17** |
| P1-9 | Add time-window filter to Admin LogViewer | P1 | 1 hr | **Done 2026-03-17** |
| BUG-2026-03-17-LOCATION-RLS | Fix `sats_locations`/`sats_companies` SELECT policy | Bug/P0 | 30 min | **Done 2026-03-17** |
| P2-1 | Enable `strict: true` in `tsconfig.app.json` | P2 | 4–8 hr | Open |
| P2-2 | Co-locate domain loggers with their domains | P2 | 1 hr | Open |
| P2-3 | Clarify LinkedIn scraper service boundary | P2 | 30 min–2 hr | Open |
| P2-4 | Add Supabase seed file | P2 | 1–2 hr | Open |
| P2-5 | Add smoke test script for edge functions | P2 | 1–2 hr | Open |
| P2-6 | Archive completed plans | P2 | 15 min | Open |
| P17-BYOK | Per-user model preference + BYOK + AI opt-out | High | 3 stories | Planned (P17) |
