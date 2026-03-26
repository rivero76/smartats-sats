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

| Phase | Agents |
| --- | --- |
| Product | `product-analyst` — raw PM/user input → user stories + handoff brief |
| Planning | `plan-decomposer` — epic → stories + acceptance criteria; `adr-author` — technical decisions |
| Development | `migration-writer`, `edge-fn-scaffolder`, `component-scaffolder`, `changelog-keeper` |
| Review | `arch-reviewer`, `convention-auditor`, `security-auditor` |
| Testing | `test-writer`, `test-runner`, `e2e-validator`, `llm-eval-runner` |
| Release | `release-gatekeeper` |
| Operations | `incident-responder`, `railway-deployer`, `dev-env-doctor` |

**Typical PM-to-developer flow:** `product-analyst` → `plan-decomposer` → `arch-reviewer` → implement → `test-runner` → `release-gatekeeper`

## Key Commands

```bash
# Development
npm run dev              # Vite dev server on http://localhost:8080
npm run build            # Production build
npm run lint             # ESLint
npm run test             # Vitest (all tests)
npm run test:watch       # Vitest in watch mode
npm run test -- tests/unit/utils/someFile.test.ts        # Single test file
npm run test:visual              # Playwright visual regression (requires prior npm run build)
npm run test:visual:update       # Update visual snapshots
npm run format           # Prettier write
npm run format:check     # Prettier check (CI-safe, no writes)
npm run format:check:changed  # Format check for changed files only (pre-commit)
npm run build:dev        # Development mode build (includes source maps)
npm run verify           # lint + type-check + test
npm run verify:full      # verify + build

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
# Use /dev-start skill or dev-env-doctor agent if Docker build stalls (OneDrive node_modules issue)

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
```

## Architecture

### Stack

- **Frontend:** React 18 + TypeScript + Vite, React Router v6, TanStack Query, shadcn/ui + Tailwind
- **Backend:** Supabase (Postgres + RLS, Edge Functions in Deno, Storage, Auth)
- **AI:** OpenAI via `callLLM()` abstraction in `supabase/functions/_shared/llmProvider.ts`
- **Deploy:** Docker multi-stage build (nginx); Playwright LinkedIn scraper on Railway

### Frontend Patterns

- Path alias `@/` maps to `./src/`
- Auth state lives in `src/contexts/AuthContext.tsx` — wraps Supabase Auth, adds `SATSUser` role check
- Server state is managed via TanStack Query hooks in `src/hooks/` (one hook per domain: resumes, jobs, analyses, etc.)
- Document text extraction (PDF/DOCX/HTML) happens client-side in `src/services/documentProcessor.ts`
- Structured logging via `src/lib/centralizedLogger.ts` — sends events to the `centralized-logging` edge function
- Animation presets live in `src/lib/animations.ts` (Framer Motion variants: `fadeIn`, `slideUp`, `scaleIn`, `listItem`, `staggerContainer`, `slideInFromRight`). All new animated components must import from here — no ad-hoc Framer Motion values. Wrap list containers with `staggerContainer` + `listItem` on children; cap stagger at 10 items.
- Accessibility tests live in `tests/unit/a11y/` using `jest-axe` — run via `npm run test`.
- Visual regression tests live in `tests/e2e/visual/` using Playwright. They require `PLAYWRIGHT_TEST_EMAIL` / `PLAYWRIGHT_TEST_PASSWORD` env vars and a prior `npm run build`. Base URL defaults to `http://localhost:4173` (vite preview), overridable via `PLAYWRIGHT_BASE_URL`.

### Backend Patterns (Edge Functions)

All edge functions share three utilities in `supabase/functions/_shared/`:

| File             | Purpose                                                                                                                                              |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `llmProvider.ts` | Single `callLLM(LLMRequest)` entry point; provider selected by `SATS_LLM_PROVIDER` env var (default: `openai`)                                       |
| `cors.ts`        | `isOriginAllowed(origin)` + `buildCorsHeaders(origin)` against `SATS_ALLOWED_ORIGINS` env var (falls back to `ALLOWED_ORIGINS` for backwards compat) |
| `env.ts`         | `getEnvNumber(name, fallback)` and `getEnvBoolean(name, fallback)`                                                                                   |

**Every new edge function must use these shared utilities.** Direct OpenAI SDK calls or inline CORS logic are not permitted.

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

| Task                          | Env var                        | Default (code fallback)                                   |
| ----------------------------- | ------------------------------ | --------------------------------------------------------- |
| ATS scoring / CV Optimisation | `OPENAI_MODEL_ATS`             | `gpt-4.1` (target: `o4-mini`, `temperature:0`, `seed:42`) |
| Skill enrichment              | `OPENAI_MODEL_ENRICH`          | `gpt-4.1-mini`                                            |
| Upskilling roadmap            | `OPENAI_MODEL_UPSKILL_ROADMAP` | `gpt-4.1-mini`                                            |
| LinkedIn profile parse        | `OPENAI_MODEL_LINKEDIN_INGEST` | `gpt-4.1-mini`                                            |

Fallback for all tasks: `OPENAI_MODEL_ATS_FALLBACK` / `gpt-4o-mini`. Any model change must follow the governance protocol in that spec (pre-flight check + LLM eval gate).

### Database

- `src/integrations/supabase/types.ts` is auto-generated — **do not edit manually**.
- All tables use RLS. New tables require migration files under `supabase/migrations/`.
- **New table naming:** `sats_<noun_plural>` (lowercase, snake_case). Legacy exceptions that predate this convention and must **not** be renamed: `SATS_resumes`, `document_extractions`, `error_logs`, `profiles`.
- **Migration naming:** `YYYYMMDDHHMMSS_<short_description>.sql` (14-digit UTC timestamp, no separators).
- Key tables: `sats_resumes`, `sats_job_descriptions`, `sats_analyses`, `sats_enriched_experiences`, `sats_learning_roadmaps`, `sats_roadmap_milestones`, `sats_user_notifications`, `log_events`, `log_settings`.

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

### TypeScript / frontend naming

| Construct            | Convention                |
| -------------------- | ------------------------- |
| React components     | `PascalCase.tsx`          |
| Hooks                | `camelCase`, `use` prefix |
| File names in `src/` | `kebab-case`              |
| Interfaces / types   | `PascalCase`              |

### Environment variables

| Scope                | Pattern                                                 |
| -------------------- | ------------------------------------------------------- |
| Global SATS config   | `SATS_<NOUN>`                                           |
| Task-specific model  | `OPENAI_MODEL_<TASK>`                                   |
| Task-specific params | `OPENAI_<PARAM>_<TASK>` (e.g. `OPENAI_TEMPERATURE_ATS`) |
| Feature flags        | `SATS_<FEATURE>_ENABLED`                                |
| Storage flags        | `STORE_LLM_<NOUN>`                                      |

### Changelog updates

After any code change, update `docs/changelog/CHANGELOG.md`. (`SATS_CHANGES.txt` is archived — do not write to it.)

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

- `src/`: frontend application code
- `supabase/functions/`: Deno edge functions + shared utilities
- `supabase/migrations/`: database migrations
- `tests/`: top-level test suites
- `scripts/`: automation and operational scripts
  - `scripts/playwright-linkedin/`: LinkedIn scraper (standalone Node.js service, deployed on Railway)
  - `scripts/ops/`: operational scripts (smoke tests, type generation, etc.)
- `plans/`: active feature and implementation plans — mark completed plans with `<!-- Status: COMPLETED -->` and move to `plans/archive/`
- `plans/archive/`: completed plans
- `docs/`: architecture, decisions, runbooks, releases, compliance
  - `docs/improvements/`: technical improvement backlog + periodic code review findings
  - `docs/bugs/`: active code defects
  - `docs/incidents/`: operational and deployment incident post-mortems
  - `docs/audits/`: reusable review/audit prompts and structure analyses
