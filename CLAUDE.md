# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Role

Claude Code is the **sole agentic development environment** for this project. It owns architecture review, ADRs, risk/quality analysis, documentation quality, and implementation — delegating to specialised sub-agents in `.claude/agents/` as appropriate.

## Primary Responsibilities

1. Architecture proposals and tradeoff analysis.
2. Large-diff review for correctness, regression, security, and maintainability risks.
3. Documentation quality for `docs/architecture.md`, `docs/decisions/`, and runbooks.
4. Release-readiness review against blockers in `docs/releases/UNTESTED_IMPLEMENTATIONS.md`.

## Secondary Responsibilities

1. Draft implementation plans in `plans/` when work needs decomposition.
2. Draft ADRs under `docs/decisions/` for non-trivial technical choices.
3. Support test strategy design for complex workflows.

## Implementation Delegation

When delegating implementation to a sub-agent or starting a new implementation session, provide:

1. Exact scope and acceptance criteria.
2. Files expected to change.
3. Validation commands required.
4. Risks and non-goals.

Sub-agents available in `.claude/agents/` cover the full development lifecycle:

| Phase       | Agents                                                                                                                                                                                                            |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product     | `product-analyst` — raw PM/user input → user stories + handoff brief                                                                                                                                              |
| Planning    | `plan-decomposer` — epic → stories + acceptance criteria; `adr-author` — technical decisions                                                                                                                      |
| Development | `migration-writer`, `edge-fn-scaffolder`, `component-scaffolder`, `changelog-keeper`                                                                                                                              |
| Review      | `arch-reviewer`, `convention-auditor`, `security-auditor`                                                                                                                                                         |
| Testing     | `test-writer`, `test-runner`, `e2e-validator`, `llm-eval-runner`                                                                                                                                                  |
| Release     | `release-gatekeeper`                                                                                                                                                                                              |
| Operations  | `incident-responder`, `railway-deployer`, `dev-env-doctor`                                                                                                                                                        |
| Marketing   | `landing-page-writer` — public marketing pages (`/pricing`, `/features`, home) and `investor.html` + `landing.html` at repo root; `help-content-writer` — keep `/help` page content in sync with shipped features |

**Typical PM-to-developer flow:** `product-analyst` → `plan-decomposer` → `arch-reviewer` → implement → `test-runner` → `release-gatekeeper`

**After every feature ships:** `help-content-writer` — update `/help` content to match the new workflow. This is part of the Definition of Done for every user-facing feature.

**When adding or updating marketing pages:** `landing-page-writer` — ensures copy reflects the current tier structure and only markets RUNTIME-VERIFIED features. This includes `investor.html` (investor pitch) and `landing.html` (end-user landing page) at the repo root — both must be kept in sync with shipped features and current pricing tiers.

## Definition of Done

Before marking any task complete, verify every item below. Agents must not declare a task done until all applicable items pass.

- [ ] `npm run verify:full` passes with no errors
- [ ] UPDATE LOG block present in every created or modified TS/JS/SQL/HTML file
- [ ] `docs/changelog/CHANGELOG.md` updated
- [ ] `help-content-writer` agent run if the change is user-facing
- [ ] `landing-page-writer` agent run if pricing or feature copy changed
- [ ] New tables: migration file created + RLS policies added + `bash scripts/ops/gen-types.sh` run
- [ ] `docs/releases/UNTESTED_IMPLEMENTATIONS.md` updated if the feature has not yet been E2E tested

## Key Commands

```bash
# Development
npm run dev              # Vite dev server on http://localhost:8080
npm run build            # Production build
npm run lint             # ESLint
npm run test             # Vitest (all tests — note: NOT included in verify)
npm run test:watch       # Vitest in watch mode
npm run test -- tests/unit/utils/someFile.test.ts        # Single test file
npm run test:visual              # Playwright visual regression (requires prior npm run build)
npm run test:visual:update       # Update visual snapshots
# Test files can live in src/**/*.test.{ts,tsx} OR tests/**/*.test.{ts,tsx}
npm run format           # Prettier write
npm run format:check     # Prettier check (CI-safe, no writes)
npm run format:check:changed  # Format check for changed files only (pre-commit)
npm run build:dev        # Development mode build (includes source maps)
npm run verify           # format-check + build + docs-check + secrets-check + supabase-check
npm run verify:full      # verify + lint (full ESLint pass)
```

> **Which to run when:**
> - **Local pre-push minimum:** `npm run verify` — fast, catches build and config regressions.
> - **Before opening a PR / CI gate:** `npm run verify:full` — adds the full ESLint pass.
>   CI will fail if `verify:full` does not pass. Do not skip it on feature branches.
> - Agents must run `verify:full` before marking any implementation task complete.

```bash
# Individual quality-gate checks (also run inside verify)
npm run docs:check       # Validate docs completeness
npm run secrets:check    # Diff-based secret scanning
npm run supabase:check   # Supabase migration/config checks
npm run supabase:check:strict  # Same, with stricter rules

# LLM evaluation gate (run after any model/param change)
npm run llm:eval         # Score responses against rubric
npm run llm:eval:gate    # Pass/fail gate (non-zero exit on regression)

# Docker
docker compose --profile dev up smartats-dev --build  # Hot-reload dev container (localhost:8080)
docker compose up smartats-app --build                 # Production container (localhost:3000)
# Use /dev-start skill or dev-env-doctor agent if Docker build stalls

# Ops automation (wraps docker/git/verify into named tasks)
npm run ops -- help                                    # List all ops commands
bash scripts/ops/smartats.sh dev-start --build        # Alt: start dev container
bash scripts/ops/smartats.sh prod-start --build       # Alt: start prod container
bash scripts/ops/smartats.sh git-safe-push            # Push with pre-flight checks

# Supabase edge functions (local)
supabase functions serve <function-name>  # Serve a single function locally
supabase db push                          # Apply migrations

# After every migration — regenerate TypeScript types
bash scripts/ops/gen-types.sh            # Writes src/integrations/supabase/types.ts

# One-time setup after cloning — install git pre-commit hooks
bash scripts/ops/install-hooks.sh        # Installs UPDATE LOG header enforcement hook

# Log inspection (runtime / operational)
bash scripts/ops/fetch-logs.sh           # Interactive: prompts for 1–10 min window, queries all sources
bash scripts/ops/fetch-logs.sh --source docker --minutes 5   # Docker only, 5 min
bash scripts/ops/fetch-logs.sh --source app --minutes 2      # log_entries table (needs SUPABASE_SERVICE_KEY)
bash scripts/ops/fetch-logs.sh --source platform --minutes 3 # Supabase platform API (needs SUPABASE_ACCESS_TOKEN)
bash scripts/ops/clean-logs.sh           # Remove logs/tmp/ files older than 1 day
bash scripts/ops/clean-logs.sh --days 3 --dry-run            # Preview before deleting

# Dev data reset (development only — never run against production)
bash scripts/ops/dev-reset.sh                  # Dry-run: show row counts, no changes
bash scripts/ops/dev-reset.sh --confirm        # Wipe all career data (requires typing project ref)
bash scripts/ops/dev-reset.sh --list-users     # List all auth accounts with roles
```

## Architecture

### Stack

- **Frontend:** React 18 + TypeScript + Vite, React Router v6, TanStack Query, shadcn/ui + Tailwind
- **Backend:** Supabase (Postgres + RLS, Edge Functions in Deno, Storage, Auth)
- **AI:** OpenAI via `callLLM()` abstraction in `supabase/functions/_shared/llmProvider.ts`
- **Deploy:** Docker multi-stage build (nginx); Playwright LinkedIn scraper on Railway (see INFRA-1 note below)

> **Infrastructure note (INFRA-1):** The Playwright LinkedIn scraper currently runs on
> Railway (`scripts/playwright-linkedin/`). Migration to Fly.io is scheduled when MAU
> exceeds 200. Full context and acceptance criteria are in
> `docs/improvements/TECHNICAL_IMPROVEMENTS.md` under `INFRA-1`. Remove this note once
> the migration is complete.

### Frontend Patterns

- Path alias `@/` maps to `./src/`
- Auth state lives in `src/contexts/AuthContext.tsx` — wraps Supabase Auth, adds `SATSUser` role check
- Server state is managed via TanStack Query hooks in `src/hooks/` (one hook per domain: resumes, jobs, analyses, etc.)
- Document text extraction (PDF/DOCX/HTML) happens client-side in `src/services/documentProcessor.ts`
- Structured logging via `src/lib/centralizedLogger.ts` — sends events to the `centralized-logging` edge function
- Animation presets live in `src/lib/animations.ts` (Framer Motion variants: `fadeIn`, `slideUp`, `scaleIn`, `listItem`, `staggerContainer`, `slideInFromRight`). All new animated components must import from here — no ad-hoc Framer Motion values. Wrap list containers with `staggerContainer` + `listItem` on children; cap stagger at 10 items.
- Accessibility tests live in `tests/unit/a11y/` using `jest-axe` — run via `npm run test`.
- Visual regression tests live in `tests/e2e/visual/` using Playwright. They require `PLAYWRIGHT_TEST_EMAIL` / `PLAYWRIGHT_TEST_PASSWORD` env vars and a prior `npm run build`. Base URL defaults to `http://localhost:4173` (vite preview), overridable via `PLAYWRIGHT_BASE_URL`.
- Plan/tier feature gating uses `usePlanFeature()` from `src/hooks/usePlanFeature.ts`. Call `hasFeature('feature_key')` to gate UI. Tiers: `free` < `pro` < `max` < `enterprise`. All users currently default to `free` until P22 (Billing) ships — the hook interface is stable so callers don't need to change. When adding a gated capability, register a new `PlanFeatureKey` and list which tiers unlock it in `PLAN_FEATURES`.

### Backend Patterns (Edge Functions)

**Edge functions** live in `supabase/functions/`. Every function must use the three shared utilities in `supabase/functions/_shared/` (see table below). Direct OpenAI SDK calls or inline CORS logic are not permitted.

| Domain        | Function                     | Role                                                  |
| ------------- | ---------------------------- | ----------------------------------------------------- |
| ATS / Scoring | `ats-analysis-direct`        | Synchronous ATS scoring (single resume + JD)          |
|               | `async-ats-scorer`           | Async scoring queue worker                            |
| Profile       | `enrich-experiences`         | LLM enrichment of work experience bullets             |
|               | `linkedin-profile-ingest`    | Parse and store LinkedIn profile data                 |
|               | `classify-skill-profile`     | Classify skills against taxonomy                      |
|               | `reset-profile-data`         | Wipe career data for a user (dev + user self-service) |
| Roadmaps      | `generate-upskill-roadmap`   | Generate learning roadmap from skill gaps             |
| Jobs          | `job-description-url-ingest` | Fetch + parse job description from URL                |
|               | `fetch-market-jobs`          | Pull external job board listings                      |
| Inbound       | `inbound-email-ingest`       | Process inbound emails (e.g. forwarded JDs)           |
| Logging       | `centralized-logging`        | Receive and persist structured log events             |
| Account       | `delete-account`             | Hard-delete user account and all data                 |
|               | `cancel-account-deletion`    | Cancel a pending deletion request                     |

All edge functions share three utilities in `supabase/functions/_shared/`:

| File             | Purpose                                                                                                                                              |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `llmProvider.ts` | Single `callLLM(LLMRequest)` entry point; provider selected by `SATS_LLM_PROVIDER` env var (default: `openai`)                                       |
| `cors.ts`        | `isOriginAllowed(origin)` + `buildCorsHeaders(origin)` against `SATS_ALLOWED_ORIGINS` env var (falls back to `ALLOWED_ORIGINS` for backwards compat) |
| `env.ts`         | `getEnvNumber(name, fallback)` and `getEnvBoolean(name, fallback)`                                                                                   |

**Every new edge function must use these shared utilities.**

#### Edge function error handling rules

- **Fail fast on config errors** — validate env vars at function top; return `503` (not `500`) for misconfiguration.
- **Never forward raw provider payloads** — use `mapProviderError()` to produce safe messages.
- **Telemetry must not block** — wrap all `logEvent()` / centralized-logging calls in `try/catch`.

#### `callLLM()` interface (key fields)

```ts
LLMRequest { systemPrompt, userPrompt, modelCandidates[], jsonSchema?, temperature, maxTokens, retryAttempts, taskLabel, pricingOverride? }
LLMResponse { rawContent, modelUsed, provider, promptTokens, completionTokens, costEstimateUsd, durationMs, retryAttemptsUsed }
```

**Model register** (authoritative source: `docs/specs/technical/llm-model-governance.md`):

| Task                          | Env var                        | Default (code fallback)                                    |
| ----------------------------- | ------------------------------ | ---------------------------------------------------------- |
| ATS scoring / CV Optimisation | `OPENAI_MODEL_ATS`             | `gpt-4.1` (target: `o4-mini`, `temperature:0`, `seed:42`) |
| Skill enrichment              | `OPENAI_MODEL_ENRICH`          | `gpt-4.1-mini`                                             |
| Upskilling roadmap            | `OPENAI_MODEL_UPSKILL_ROADMAP` | `gpt-4.1-mini`                                             |
| LinkedIn profile parse        | `OPENAI_MODEL_LINKEDIN_INGEST` | `gpt-4.1-mini`                                             |

Fallback for all tasks: `OPENAI_MODEL_ATS_FALLBACK` / `gpt-4o-mini`. Any model change must follow the governance protocol in that spec (pre-flight check + LLM eval gate).

### Main App Routes

`/` Dashboard · `/resumes` Resumes · `/jobs` Job Descriptions · `/analyses` ATS Analyses · `/opportunities` Proactive Matches (Pro+) · `/experiences` Enriched Experiences · `/roadmaps` Upskilling Roadmaps · `/help` Help Hub · `/pm` PM Dashboard · `/settings` Settings · `/admin` Admin (role-gated) · `/auth` Auth · `/reset-password` Password Reset

### Database

- `src/integrations/supabase/types.ts` is auto-generated — **do not edit manually**.
- All tables use RLS. New tables require migration files under `supabase/migrations/`.
- **New table naming:** `sats_<noun_plural>` (lowercase, snake_case). Legacy exceptions that predate this convention and must **not** be renamed: `SATS_resumes`, `document_extractions`, `error_logs`, `profiles`.
- **Migration naming:** `YYYYMMDDHHMMSS_<short_description>.sql` (14-digit UTC timestamp, no separators).
- Key tables: `sats_resumes`, `sats_job_descriptions`, `sats_analyses`, `sats_enriched_experiences`, `sats_learning_roadmaps`, `sats_roadmap_milestones`, `sats_user_notifications`, `log_events`, `log_settings`.

**Adding a new table — required steps (in order):**

1. Create migration file: `YYYYMMDDHHMMSS_<description>.sql` with `sats_` prefix and full RLS policies.
2. Run `bash scripts/ops/gen-types.sh` to regenerate `src/integrations/supabase/types.ts`.
3. Add the table to the Key tables list above if it is a core domain table.

## Coding Conventions (Enforced)

Full reference: `docs/conventions/coding-conventions.md`.

### File UPDATE LOG (mandatory)

Every created or modified TS/JS/SQL/HTML file must have an UPDATE LOG block at the top. Append — never replace.

```typescript
/**
 * UPDATE LOG
 * YYYY-MM-DD HH:MM:SS | <description> (reference plan ID where applicable)
 */
```

SQL uses `-- UPDATE LOG` / `-- YYYY-MM-DD HH:MM:SS | ...`. HTML uses `<!-- UPDATE LOG -->`.

> **Enforcement:** The pre-commit hook installed by `bash scripts/ops/install-hooks.sh`
> will **reject commits** that are missing this block in any TS/JS/SQL/HTML file.
> If your commit is blocked, add the UPDATE LOG block and re-stage the file.
> **Never use `--no-verify` to bypass this hook.** Investigate the root cause and fix it.
> Agents must include the UPDATE LOG before marking a task complete.

### Branch Naming

| Pattern                    | When to use                                      |
| -------------------------- | ------------------------------------------------ |
| `p<N>-<short-description>` | Phase/feature work (e.g. `p20-data-deletion`)    |
| `fix/<short-description>`  | Bug fixes (e.g. `fix/resume-upload-timeout`)     |
| `infra/<short-description>`| Infrastructure changes (e.g. `infra/fly-migration`) |

Always branch off `main` unless the work is explicitly scoped to a feature branch.

### TypeScript / frontend naming

| Construct            | Convention                |
| -------------------- | ------------------------- |
| React components     | `PascalCase.tsx`          |
| Hooks                | `camelCase`, `use` prefix |
| File names in `src/` | `kebab-case`              |
| Interfaces / types   | `PascalCase`              |

### Environment variables

| Scope                | Pattern                                                  |
| -------------------- | -------------------------------------------------------- |
| Global SATS config   | `SATS_<NOUN>`                                            |
| Task-specific model  | `OPENAI_MODEL_<TASK>`                                    |
| Task-specific params | `OPENAI_<PARAM>_<TASK>` (e.g. `OPENAI_TEMPERATURE_ATS`) |
| Feature flags        | `SATS_<FEATURE>_ENABLED`                                 |
| Storage flags        | `STORE_LLM_<NOUN>`                                       |

### Changelog updates

After any code change, update `docs/changelog/CHANGELOG.md`. (`SATS_CHANGES.txt` is archived — do not write to it.)

### When tests are required

**Tests are required for:**

- Every new utility function in `src/lib/` or `src/utils/`
- Every new TanStack Query hook in `src/hooks/`
- Every new edge function (smoke test at minimum — verify happy path + env-var misconfiguration returns `503`)

**Tests are encouraged but not required for** React components with non-trivial conditional logic.

Test files may live in `src/**/*.test.{ts,tsx}` or `tests/**/*.test.{ts,tsx}`. Run with `npm run test`.

## Plan Lifecycle

- `plans/` — active feature and implementation plans.
- `plans/archive/` — completed plans.

**Lifecycle:**
1. **Implementing agent** marks the plan `<!-- Status: COMPLETED -->` when all acceptance criteria are met and tests pass.
2. **`release-gatekeeper`** moves the file to `plans/archive/` as part of the release-readiness check — not before, so the plan remains visible during QA.
3. **Claude Code** performs a monthly sweep to catch any plans left in `plans/` with a `COMPLETED` status that were not archived.

Never delete a plan file — archive it.

## Source of Truth

| Concern                       | Location                                       |
| ----------------------------- | ---------------------------------------------- |
| Architecture baseline         | `docs/architecture.md`                         |
| Technical decisions (ADRs)    | `docs/decisions/`                              |
| Coding conventions            | `docs/conventions/coding-conventions.md`       |
| Product roadmap               | `docs/decisions/product-roadmap.md`            |
| Product specs (per phase)     | `docs/specs/`                                  |
| Active feature plans          | `plans/`                                       |
| Completed/archived plans      | `plans/archive/`                               |
| Operational runbooks          | `docs/runbooks/`                               |
| Active code defects (bugs)    | `docs/bugs/`                                   |
| Operational/deploy incidents  | `docs/incidents/`                              |
| Technical improvement backlog | `docs/improvements/TECHNICAL_IMPROVEMENTS.md`  |
| Periodic code review findings | `docs/improvements/CODE-REVIEW-YYYY-MM-DD.md`  |
| Reusable audit prompts        | `docs/audits/`                                 |
| Security audit reports        | `docs/security/`                               |
| Compliance policies           | `docs/compliance/`                             |
| Release readiness             | `docs/releases/UNTESTED_IMPLEMENTATIONS.md`    |
| Changelog                     | `docs/changelog/CHANGELOG.md`                  |
| LLM model governance          | `docs/specs/technical/llm-model-governance.md` |
| CI quality gates              | `.github/workflows/quality-gates.yml`          |

## Repository Structure (Canonical)

- `src/` — frontend application code
- `supabase/functions/` — Deno edge functions + shared utilities
- `supabase/migrations/` — database migrations
- `tests/` — top-level test suites
- `scripts/` — automation and operational scripts
  - `scripts/playwright-linkedin/` — LinkedIn scraper standalone Node.js service (see INFRA-1 note above)
  - `scripts/ops/` — operational scripts (smoke tests, type generation, etc.)
- `plans/` — active feature and implementation plans (see Plan Lifecycle above)
- `plans/archive/` — completed plans
- `docs/` — architecture, decisions, runbooks, releases, compliance
  - `docs/improvements/` — technical improvement backlog + periodic code review findings
  - `docs/bugs/` — active code defects
  - `docs/incidents/` — operational and deployment incident post-mortems
  - `docs/audits/` — reusable review/audit prompts and structure analyses
