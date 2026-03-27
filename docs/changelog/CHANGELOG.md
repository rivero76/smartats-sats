# Changelog

All notable changes to this project should be documented in this file.

## [Unreleased]

### Added

- P19 S4-1 — Bundle analyser: `rollup-plugin-visualizer` added to `vite.config.ts`; generates `dist/stats.html` treemap on every production build (gzip + brotli sizes). Lighthouse CI added as non-blocking `lighthouse` job in `quality-gates.yml` with category assertions (perf ≥ 0.7 warn, a11y ≥ 0.85 error, bp ≥ 0.8 warn). `lighthouserc.json` committed.
- P19 S5-1 — Storybook bootstrap: installed Storybook 8 (`@storybook/react-vite` + `addon-essentials` + `addon-a11y`). Config at `.storybook/main.ts` and `.storybook/preview.ts` (imports `src/index.css`, light/dark backgrounds). Six component story files: `Button` (10 stories), `Badge` (6), `Card` (4), `Input` (7), `Dialog` (3 — rendered open), `Table` (3). `storybook-static` and `.lighthouseci` added to `.prettierignore`.
- P19 S3-1 — axe-core a11y tests: 5 Vitest test files in `tests/unit/a11y/` (Dashboard, Resumes, JobDescriptions, ATSAnalyses, Settings). All pass with zero violations. Blocking in CI via `npm run test` step in `quality-gates.yml`. Setup utilities: `tests/unit/a11y/setup.tsx` (QueryClient + MemoryRouter wrapper) and `tests/unit/a11y/setup-dom.ts` (DOMMatrix stub for jsdom/pdfjs-dist compat).
- P19 S3-2 — Visual regression baselines: 5 PNG snapshots committed for Dashboard, Resumes, ATS Analyses, Enriched Experiences, Settings (`tests/e2e/visual/pages.spec.ts-snapshots/`). All 6 visual tests pass (auth setup + 5 pages). CI `visual-regression` job (non-blocking) already wired. Fixed `auth.setup.ts` ESM `__dirname` bug (`import.meta.url` + `fileURLToPath`).
- Functional Playwright E2E test suite: 6 new spec files (51 tests total) under `tests/e2e/` covering: Help Hub `/help` (10 tests), Opportunities `/opportunities` (8), ATS Analyses auto-refresh + CV opt panel (7), Roadmaps `/roadmaps` milestone toggle + persistence (8), Persona Manager CRUD in Settings (7), Admin LogViewer time-window filter (9). All skip gracefully without credentials. `playwright.config.ts` updated with `functional` project matching `e2e/*.spec.ts`.
- RLS cross-tenant denial test script `scripts/ops/test-rls-cross-tenant.ts`: programmatic test for P15 S1 roadmap isolation (User A creates → User B reads → expects 0 rows) and BUG-2026-03-17 locations INSERT path. Run with `npx tsx scripts/ops/test-rls-cross-tenant.ts`.
- `tests/unit/utils/linkedinImportMerge.test.ts` expanded from 3 → 11 tests: asymmetry-fix regression, provenance on experience inserts, empty baseline, within-payload duplicate skills/experiences, synonym canonicalization, below-threshold fuzzy, exact-match reason text. All pass.

### Fixed

- Disabled `DevErrorOverlay` (DEV LOGS panel) by setting `VITE_LOGGING_ENABLED=false` in `.env`. The overlay was rendering log entries at the bottom of the screen in development mode.
- `tests/e2e/visual/auth.setup.ts`: replaced `__dirname` with `fileURLToPath(import.meta.url)` to fix ESM incompatibility (`package.json` `"type":"module"` caused ReferenceError blocking all Playwright test listing).

- P21 S1 — Universal audit trigger function `set_audit_fields()` (SECURITY DEFINER). Auto-stamps `created_by`/`updated_by`/`version` on INSERT/UPDATE across all application tables. Migration: `20260327000000_p21_s1_universal_audit_trigger.sql`.
- P21 S1 — Added `created_by` and `updated_by` UUID columns to 19 tables with attached `trg_audit_<table>` triggers for automatic user tracking on mutations. Migration: `20260327100000_p21_s1_add_created_by_updated_by.sql`.
- P21 S1 — Added `deleted_by` UUID column to 13 soft-delete tables; patched `soft_delete_enriched_experience()` RPC to update `deleted_by` on record deletion. Migration: `20260327110000_p21_s1_add_deleted_by.sql`.
- P21 S1 — Added `deleted_at` + `deleted_by` + partial indexes to 3 tables missing soft-delete columns; recreated RLS policies with soft-delete guards. Migration: `20260327120000_p21_s1_add_missing_deleted_at.sql`.
- P21 S1 — Added `version` INT DEFAULT 1 column to 9 mutable tables for optimistic locking and concurrency control. Migration: `20260327130000_p21_s1_add_version_column.sql`.
- P21 S1 — Created `sats_llm_call_logs` table with comprehensive LLM observability schema: model used, tokens consumed (prompt/completion/total), cost estimate, latency, finish reason, task label, and user correlation. 3 indexes (user_id, task_label, created_at). RLS policies (owner-only read, admin metrics). Migration: `20260327140000_p21_s1_llm_call_logs.sql`.
- P21 S1 — Tier-1 table rename to universal `sats_` convention: `enriched_experiences` → `sats_enriched_experiences`, `log_entries` → `sats_log_entries`, `log_settings` → `sats_log_settings`, `account_deletion_logs` → `sats_account_deletion_logs`, `log_cleanup_policies` → `sats_log_cleanup_policies`, `user_roles` → `sats_user_roles`. Updated RPCs `run_log_cleanup_policies()` and `soft_delete_enriched_experience()` with new table references. Fixed admin policy on `sats_llm_call_logs`. Migration: `20260327150000_p21_tier1_rename_tables.sql`.
- P21 S1 — Wired `llmProvider.ts` to `sats_llm_call_logs`: added optional `logContext` field to `LLMRequest` and `finishReason` to `LLMResponse`; fire-and-forget insert executes after every successful LLM call with user_id, model, token counts, cost, duration, and task label.
- P21 S1 — Extended `docs/conventions/coding-conventions.md` with legacy `ats_*` table exceptions (7 tables documented); added Section 8 (SQL Function Naming: `sats_<verb>_<noun>()` pattern); added Section 9 (Trigger Naming: `sats_update_<table>_updated_at` / `trg_audit_<table>`).

- P21 S2 — RBAC infrastructure: created `sats_roles`, `sats_permissions`, `sats_role_permissions`, `sats_user_role_assignments` tables with full FK/index structure, RLS policies enforcing admin-only writes. Implemented `sats_has_permission(user_id UUID, permission_code TEXT)` function. Backfilled from legacy `sats_user_roles` one-time migration. Migration: `20260327200000_p21_s2_rbac_tables.sql`.
- P21 S2 — API key infrastructure: created `sats_api_keys` table with hash-only storage (keys never persisted raw), scoped to tenant, with rotation/expiry fields and RLS owner-only access. Migration: `20260327210000_p21_s2_api_keys.sql`.
- P21 S2 — Unified audit logging: created append-only `sats_audit_logs` table with UPDATE/DELETE policies blocked at database level. Implemented `sats_log_audit_event()` trigger firing on mutation (INSERT/UPDATE/DELETE) of `sats_analyses`, `sats_resumes`, `sats_enriched_experiences`, and `sats_api_keys`. Logs action, old/new values, user/IP, and timestamp. Migration: `20260327220000_p21_s2_unified_audit_logs.sql`.

- P21 S3 — Multi-tenancy foundation: created `sats_tenants` table with personal sentinel UUID for solo-user accounts; tenant_id flows to `sats_user_role_assignments`. Migration: `20260327230000_p21_s3_tenants_table.sql`.
- P21 S3 — SaaS feature gating: created `sats_plans` (4 tiers: Free, Pro, Enterprise, Custom with JSON metadata), `sats_features` (8 core features seeded), and `sats_tenant_features` junction table with feature-per-plan assignment. RLS policies enforce tenant isolation. Migration: `20260327240000_p21_s3_plans_subscriptions.sql`.
- P21 S3 — Added `tenant_id UUID` column to 12 tables with partial indexes (backfilled to personal sentinel UUID). Tenant-scoped RLS policies created but not yet activated (Stage 7). Migration: `20260327250000_p21_s3_add_tenant_id.sql`.

- P21 S4 — Multi-currency support: created `sats_currencies` table with 8 ISO 4217 currencies seeded (USD, EUR, GBP, JPY, AUD, CAD, CHF, INR); `sats_exchange_rates` table with live provider integration points. Added `currency_code CHAR(3)` columns to `sats_llm_call_logs`, `sats_plans`, and `profiles`. Migration: `20260328040000_p21_s4_multi_currency.sql`.
- P21 S4 — Internationalization infrastructure: created `sats_locales` table with 6 BCP 47 locales seeded (en-US, en-GB, de-DE, fr-FR, ja-JP, es-ES); `sats_translations` table with `locale_code`, `namespace`, `key`, `value` for string externalization. Added `preferred_locale` and `timezone` columns to `profiles`. Migration: `20260328050000_p21_s4_i18n.sql`.

- P21 S5 — Vector embeddings foundation: executed `CREATE EXTENSION vector` for pgvector support. Created `sats_knowledge_sources` (RAG source registry), `sats_document_chunks` (vector-stored extracts with HNSW index on `embedding`). Implemented `sats_search_document_chunks(query_embedding VECTOR)` function for semantic search. Migration: `20260328000000_p21_s5_pgvector_knowledge_base.sql`.
- P21 S5 — AI agent infrastructure: created `sats_ai_agents` table with 17 canonical agents seeded (ATS Optimizer, Resume Coach, Skill Enumerator, etc.). Created `sats_ai_sessions` (agent conversation threads) and `sats_ai_messages` (turn-by-turn message store). RLS enforces session ownership. Migration: `20260328010000_p21_s5_ai_agent_infrastructure.sql`.
- P21 S5 — Agent orchestration layer: created `sats_agent_tasks`, `sats_agent_handoffs` (agent-to-agent handoff routing), and `sats_agent_memory` with HNSW vector index on `value_embedding` for semantic memory retrieval. Enables multi-agent workflows with context preservation. Migration: `20260328020000_p21_s5_agent_orchestration.sql`.
- P21 S5 — Prompt management and AI evaluation: created `sats_prompt_templates` (parameterized prompt registry), `sats_ai_evaluations` (rubric-based LLM output scoring). Added `prompt_template_id` and `prompt_version` columns to `sats_llm_call_logs` for audit trail linking evaluation results to prompts. Migration: `20260328030000_p21_s5_prompt_templates.sql`.

- P21 S6 — Idempotency keys for safe retries: created `sats_idempotency_keys` table with UNIQUE constraint on (user_id, idempotency_key, endpoint_path) and 24-hour TTL. Enables at-most-once semantics for edge function mutations. Migration: `20260328060000_p21_s6_idempotency.sql`.
- P21 S6 — Transactional outbox pattern: created `sats_outbox_events` table (immutable event log, service-role-only writes) for reliable async event publishing. Enables dual-write elimination and consistency guarantees. Migration: `20260328070000_p21_s6_outbox_events.sql`.
- P21 S6 — Distributed rate limiting: created `sats_rate_limit_counters` table with sliding-window counters keyed by user/tenant/endpoint. Supports granular per-user and per-tenant rate limit enforcement. Migration: `20260328080000_p21_s6_rate_limits.sql`.

- TypeScript types regenerated via `bash scripts/ops/gen-types.sh` after all P21 S2–S6 migrations applied to live Supabase project. All migrations tested against live Supabase project and committed.

### Changed

- P21 S1 — Updated 10 application files to reference renamed tables: `useEnrichedExperiences.ts` (enriched_experiences → sats_enriched_experiences), `useLogSettings.ts` (log_settings/log_entries renamed), `LogViewer.tsx`, `LoggingControlPanel.tsx`, `LogCleanupManager.tsx`, `ObservabilityPanel.tsx`, `JobDescriptionLoggingPanel.tsx`, `centralized-logging/index.ts`, `delete-account/index.ts`, `cancel-account-deletion/index.ts`, and `ats-analysis-direct/index.ts` (enriched_experiences → sats_enriched_experiences, FK alias updated).

### Fixed

- 2026-03-27: Fixed infinite React re-render loop (`Warning: Maximum update depth exceeded`) on the `/analyses` page in `src/components/EnrichExperienceModal.tsx`. The `useEffect` dependency array included `generate` (the entire `useMutation` result object, which is a new reference on every render). Changed to `generate.reset` (destructured as `resetGenerate`) which is a stable method reference. This stopped the effect from firing on every render and calling multiple `setState` functions in a loop.
- 2026-03-27: Fixed the `has_role()` PostgreSQL function which was broken by the P21 Tier 1 table rename (`user_roles` → `sats_user_roles`). The function referenced the old table name, causing `42P01 undefined_table` errors when checking admin role and making the `/admin` route completely inaccessible. Migration: `20260327231000_fix_has_role_sats_user_roles_rename.sql`. The new function checks both `sats_user_roles` (legacy path) and `sats_user_role_assignments` joined with `sats_roles` (new RBAC path from P21 S2).

- 2026-03-26: Merged dual-changelog into single source of truth. Migrated unique early-history entries (SDLC P0–P4 hardening, lint cleanup, P5 enrichment lifecycle) from `SATS_CHANGES.txt` into a [Pre-v1 Development History] section. Archived `SATS_CHANGES.txt` with a stub pointing to `CHANGELOG.md`. Updated `changelog-keeper` agent, `CLAUDE.md`, `README.md`, `llm-model-governance.md`, and `docs/audits/code-review-prompt.md` to remove all dual-changelog requirements.

- P19 S3-1: Fixed heading-order a11y violations across Dashboard, MyResumes, JobDescriptions, ATSAnalyses, Settings, and PersonaManager by converting secondary CardTitle components from `h3` to `h2` for section headings, stat metric CardTitle to `p`, and empty-state headings to `h2` where they follow `h1` directly.
- P19 S3-1: Fixed button-name a11y violations by adding `aria-label` to Switch components in Settings, SelectTrigger in ResumePreview, and icon-only HelpButton variant for screen reader users.

### Changed

- P21 S1 — Updated 10 application files to reference renamed tables: `useEnrichedExperiences.ts` (enriched_experiences → sats_enriched_experiences), `useLogSettings.ts` (log_settings/log_entries renamed), `LogViewer.tsx`, `LoggingControlPanel.tsx`, `LogCleanupManager.tsx`, `ObservabilityPanel.tsx`, `JobDescriptionLoggingPanel.tsx`, `centralized-logging/index.ts`, `delete-account/index.ts`, `cancel-account-deletion/index.ts`, and `ats-analysis-direct/index.ts` (enriched_experiences → sats_enriched_experiences, FK alias updated).
- P19 S1-1: Installed `@fontsource-variable/geist` and `@fontsource-variable/geist-mono`. Added `@font-face` imports to `src/index.css` via `@fontsource-variable` CSS. Extended `tailwind.config.ts` with `fontFamily.sans: ['Geist Variable', ...]` and `fontFamily.mono: ['Geist Mono Variable', ...]`. Applied `font-sans` to body with `font-feature-settings` for ligatures. Font loads with `font-display: swap` to prevent FOUT.
- P19 S1-2: Created `src/lib/animations.ts` with six Framer Motion variant presets (`fadeIn`, `slideUp`, `scaleIn`, `listItem`, `staggerContainer`, `slideInFromRight`). Installed `framer-motion`. No component changes — presets only, applied in S2.
- fix(ops): `check-docs.sh` — replaced stale `plans/product-improvements.md` reference (archived) with `docs/decisions/product-roadmap.md` in required files list and error message. `check-secrets.sh` — tightened `SUPABASE_SERVICE_ROLE_KEY` pattern to require `=` sign (false positive on docs text).

- 2026-03-23: Created `docs/improvements/technical_review_2026-03-18.md` — Mac developer environment and repository organisation recommendations (OneDrive risk, node_modules sync, stray files, scripts layout, pre-commit hook setup, .railwayignore).
- 2026-03-23: Extended `technical_review_2026-03-18.md` with i18n readiness assessment (NOT READY — zero translation infrastructure, all strings hardcoded in English; date-fns and toLocaleString present as foundation) and multi-user readiness assessment (READY — RLS enforced on all user-owned tables, query-layer filtering correct, admin role gated; gap: no per-user API quotas on ATS/enrichment edge functions).
- 2026-03-26: Updated `CLAUDE.md` to document `npm run test:visual` and `npm run test:visual:update` commands for Playwright visual regression testing and clarify test locations (`tests/e2e/visual/` for Playwright e2e, `tests/unit/a11y/` for axe-core accessibility).
- 2026-03-26: Updated `CLAUDE.md` — fixed stale Role section that still referenced Codex/AGENTS.md; now correctly states Claude Code is the sole agentic development environment. Updated Implementation Delegation section: replaced the paragraph listing agents with a full phase-by-phase agent table (Product → Planning → Development → Review → Testing → Release → Operations), added a "Typical PM-to-developer flow" line showing the agent pipeline.
- 2026-03-26: Updated `docs/improvements/TECHNICAL_IMPROVEMENTS.md` — updated the P1-10 agent table from 16 to 17 agents, added product-analyst.md as the new Product phase entry.
- MAINT-2: Retired `AGENTS.md` — replaced with archive stub redirecting to `CLAUDE.md`. OpenAI Codex is no longer the implementation agent; Claude Code is now the sole agentic toolchain.
- MAINT-2: Archived `docs/runbooks/CODEX_SESSION_CONTINUITY.md` — replaced with stub pointing to new runbook. Created `docs/runbooks/SESSION_CONTINUITY.md` with Claude Code–flavoured session continuity patterns (checkpoint discipline, execution loop, start/end-of-session checklists) migrated from the Codex runbook.
- MAINT-2: Updated `docs/runbooks/README.md` — removed `CODEX_SESSION_CONTINUITY.md` entry, added `SESSION_CONTINUITY.md`.
- MAINT-2: Marked `docs/decisions/adr-0001-agent-collaboration-model.md` Status as Superseded. Claude Code is now the sole agentic toolchain.
- MAINT-2: Updated `docs/conventions/coding-conventions.md` Owner line from "Architecture (Claude Code) + Implementation (Codex)" to "Claude Code".
- MAINT-2: Renamed "Handoff to Codex" section in `CLAUDE.md` to "Implementation Delegation"; updated body to reference `.claude/agents/` sub-agents instead of Codex.
- MAINT-2: Added archive note to `docs/sessions/README.md` clarifying these are Codex-era checkpoints; documented Claude Code project memory as the current continuity mechanism.
- MAINT-2: Updated Owner line in `plans/p19-uiux-excellence.md` from "Architecture (Claude Code) + Implementation (Codex)" to "Claude Code".
- MAINT-2: Marked `docs/improvements/TECHNICAL_IMPROVEMENTS.md` — MAINT-2 status changed to Done 2026-03-26.

- CR1-2: Centralized CORS helpers across 6 edge functions (`cancel-account-deletion`, `centralized-logging`, `delete-account`, `fetch-market-jobs`, `job-description-url-ingest`, `linkedin-profile-ingest`). Replaced inline `ALLOWED_ORIGINS` constant + `isOriginAllowed`/`buildCorsHeaders` function declarations with `import { isOriginAllowed, buildCorsHeaders } from '../_shared/cors.ts'`. Production origin changes now require updating only `_shared/cors.ts`.
- CR4-2: Added missing UPDATE LOG header to `job-description-url-ingest/index.ts` (was the only edge function with no header).
- CR4-3: Created `docs/decisions/adr-0003-two-call-ats-cv-optimisation-isolation.md` — documents why P18 uses two separate `callLLM()` calls (base ATS score + CV optimisation projection) to prevent context contamination and ensure base score reproducibility.
- CR4-4: Created `docs/decisions/adr-0004-async-vs-direct-ats-scoring.md` — documents when `async-ats-scorer` (cron/proactive pipeline) vs `ats-analysis-direct` (user-triggered) is used, why they are separate, and the long-term direction.
- CR1-3: Extracted proactive match threshold `0.6` to `DEFAULT_PROACTIVE_MATCH_THRESHOLD` constant in `async-ats-scorer`. Overridable via `SATS_PROACTIVE_MATCH_THRESHOLD` env var.
- CR1-4: Extracted Dice-coefficient skill dedup cutoff `0.86` to `SKILL_FUZZY_MATCH_THRESHOLD` in `linkedinImportMerge.ts`.
- CR1-5: Extracted auto-apply confidence cutoff `0.78` to `AUTO_APPLY_CONFIDENCE_THRESHOLD` in `JobDescriptionModal.tsx`.
- CR1-6: Added explanatory comment above the weighted confidence formula in `contentExtraction.ts` (title 40%, company 35%, location 25%).
- CR1-7: Added inline comment to `ats-analysis-direct` explaining `temperature=0` + `seed=42` determinism rationale.
- CR2-2: Renamed `src/utils/contentExtraction.ts` → `content-extraction.ts` (kebab-case); updated import in `JobDescriptionModal.tsx`.
- CR2-3: Renamed `src/utils/linkedinImportMerge.ts` → `linkedin-import-merge.ts` (kebab-case); updated imports in `ProfileImportReviewModal.tsx` and `useLinkedinImportPreparation.ts`.
- CR2-4: `_shared/cors.ts` now reads `SATS_ALLOWED_ORIGINS` env var (canonical `SATS_` prefix) with fallback to `ALLOWED_ORIGINS` for backwards compatibility. `.env.example` and `CLAUDE.md` updated.
- CR4-5: Created `docs/decisions/adr-0005-skill-dedup-fuzzy-matching.md` — documents Dice-coefficient strategy, why 0.86, why not embeddings.
- CR4-6: Created `docs/decisions/adr-0006-rls-first-tenant-isolation.md` — documents RLS-first multi-tenant isolation model, P8 migration patterns, service role discipline.
- CR4-8: Updated `docs/architecture.md` — added P14 proactive matching flow, P16 Resume Personas flow, P18 two-call CV Optimisation; expanded LLM schemas table; linked all 6 ADRs; updated Last Updated date.
- CR4-9: Added "why" comments to 5 non-obvious logic blocks across `useATSAnalyses`, `useRetryATSAnalysis`, `useEnrichedExperiences`, and `useLinkedinImportPreparation`.

- P0-1: Created `scripts/playwright-linkedin/.railwayignore` — excludes `node_modules/`, `dist/`, `*.log`, `.env` from Railway uploads. Fixes `railway up --path-as-root` timeout (Railway CLI v4.30.5 reads git-root `.gitignore` not subdirectory ignore).
- P0-2: Removed hardcoded `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` from `docker-compose.yml`. Both services now use `env_file: .env` and build args reference `${VAR}`. Added `.env` to `.gitignore`.
- P0-3: Noted `scripts/playwright-linkedin/package-lock.json` is untracked (committed separately).
- P1-1: Expanded `.env.example` to cover all required and optional env vars (Supabase, LLM provider, model overrides, privacy flags, CORS, job APIs).
- P1-2: Added `src/components/ErrorBoundary.tsx` (class-based, friendly fallback with Reload + Dashboard buttons, stack trace in dev mode). Wrapped main route outlet in `App.tsx` with `<ErrorBoundary>`.
- P1-4: Added `"postinstall": "playwright install chromium"` to `scripts/playwright-linkedin/package.json`.
- P1-6: Added `npm run test -- --run` step to `.github/workflows/quality-gates.yml` CI pipeline.
- P1-7: Created `scripts/ops/gen-types.sh` — runs `supabase gen types typescript` and writes `src/integrations/supabase/types.ts`. Documented in `CLAUDE.md`.
- P16 Story 1 (in progress): migration `20260317120000_p16_s1_create_resume_personas.sql`, `useResumePersonas` hook, `PersonaManager` component, wired into Settings. (Branch: p14)
- E2E test session guide created at `docs/releases/e2e-test-session-p13-p15-p14.md` (P13/P15/P14 manual execution protocol).
- Added `scripts/ops/fetch-logs.sh` — interactive log collector (1–10 min window) querying Docker containers, `log_entries` table (service key), and Supabase platform API (access token). Saves to `logs/tmp/` with timestamped filenames.
- Added `scripts/ops/clean-logs.sh` — removes `logs/tmp/` files older than N days (default 1). Supports `--dry-run`.
- Added `logs/tmp/` to `.gitignore`.
- Updated `.env.example` with `SUPABASE_SERVICE_KEY`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`.
- Updated `CLAUDE.md` with log script usage examples.

- P2-7: Replaced hardcoded "GPT-4o" label in `EnrichExperienceModal.tsx` with `{import.meta.env.VITE_AI_MODEL_LABEL ?? 'AI'}`. Added `VITE_AI_MODEL_LABEL=gpt-4.1-mini` to `.env.example` with cross-reference to `OPENAI_MODEL_ENRICH`. Fixed misleading comment on `useCreateATSAnalysis` in `useATSAnalyses.ts` (was "direct OpenAI integration", now correctly describes delegation to edge function).
- Confirmed `o4-mini` and `o3-mini` available on OpenAI account via pre-flight check. Re-enabled `o4-mini` as ATS scoring model (`OPENAI_MODEL_ATS=o4-mini`, fallback `gpt-4.1`, `temperature:0`, `seed:42`).
- Fixed `callOpenAI` fallback bug in `llmProvider.ts`: model-not-found 400 errors now fall through to the next model candidate instead of throwing immediately. Previously, an invalid primary model silently blocked the fallback chain entirely.
- ATS scoring: set `temperature:0` + `seed:42` on `gpt-4.1` for deterministic output. `o4-mini` upgrade attempted but rolled back — API returned 400 model not found. Added `§4.0 pre-flight check` to `llm-model-governance.md` requiring `curl /v1/models/<id>` validation before any future model change.
- Upgraded ATS scoring model from `gpt-4.1` to `o4-mini` (reasoning model) for improved rubric consistency; set `temperature:0` + `seed:42` for deterministic output; updated pricing defaults to `$1.10/$4.40` per 1M tokens; updated `llmProvider.ts` with o4-mini/o3 pricing entries and reasoning model `max_completion_tokens` body handling; fallback remains `gpt-4.1`. Created `docs/specs/technical/llm-model-governance.md` with model register, change protocol, and pre/post validation test suite.
- Fixed P18 CV Optimisation Score context contamination (score regression bug): `ats-analysis-direct` now uses two-call isolation — baseline `buildATSPrompt()` receives no enrichment context; `getAcceptedEnrichments()` runs after the baseline call; a separate second `callLLM()` with `CV_OPTIMISATION_JSON_SCHEMA` and `buildOptimisationPrompt()` projects the enriched score independently. Optimisation failure is caught and isolated so it cannot corrupt `ats_score`. Removed `cv_optimisation_score`/`cv_optimisation_improvements` from `ATS_JSON_SCHEMA` and `ATSAnalysisResult`; added `CVOptimisationResult` interface. Deployed to `nkgscksbgmzhizohobhg` (commit `bf879f9`).
- Added P17 User-Controlled AI to `docs/decisions/product-roadmap.md` (High priority): 3 stories — S1 per-user model preference, S2 BYOK encrypted key storage via Supabase Vault, S3 AI opt-out/GDPR toggle. Formally scoped the existing "API key generation" Settings placeholder to P17 S2. Added to roadmap snapshot, strategic assessment, Now/Next/Later (Later queue), feature register, Section 4A, changelog, and decision log.
- Added time window filter to `LogViewer` (Admin → Logging Control → Log Viewer): dropdown for Last 5 min / 15 min / 1h / 6h / 24h / All time; defaults to ERROR level + Last 1 hour so the viewer opens ready for incident investigation. Uses `date-fns` `subMinutes`/`subHours` for timestamp boundaries passed to PostgREST `.gte('timestamp', ...)`.
- Fixed BUG-2026-03-17-LOCATION-RLS: `sats_locations` and `sats_companies` SELECT policies were over-restrictive — required the row to already be linked to the user's JD, making PostgREST's post-INSERT SELECT re-check always fail. Migration `20260317150000_fix_locations_companies_select_policy.sql` replaces both with open authenticated-read policies (`USING (true)`). Both tables are shared reference data; per-user read isolation was never appropriate.
- Fixed BUG-2026-02-24-ENRICH-SCROLL: removed nested `ScrollArea h-[44vh]` from `EnrichExperienceModal.tsx` suggestion list; outer `flex-1 overflow-y-auto` div now handles all modal scrolling so Reject/Save action buttons on every suggestion card are always reachable without a second scroll context. Removed unused `ScrollArea` import.
- Fixed scroll clipping in `ProfileImportReviewModal.tsx`: moved `pr-3` padding from `ScrollArea` wrapper to inner content div so the Radix scrollbar no longer overlaps skill/experience list items.
- Code-reviewed P13 Stories 1–3, P14 Stories 1–4, P15 Stories 1–3, and ATS auto-refresh implementation. All pass code review. UNTESTED_IMPLEMENTATIONS.md updated with `CODE-VERIFIED — runtime E2E pending` status for each. BUG-2026-02-24-ENRICH-SCROLL closed.
- Fixed experience fingerprint asymmetry in `linkedinImportMerge`: removed `companyName` from proposed-experience fingerprint so both sides use the same fields (canonical skill + job title + description). Restores deduplication guard for P13 Story 2; all unit tests now pass.
- Reorganized repository structure: `ops/` renamed to `scripts/ops/`; `P14.md`/`P15.md` moved into `plans/`; `docs/VISION.md` moved to `docs/decisions/product-vision.md`; unit tests relocated from `src/tests/` to `tests/unit/`.
- Added `docs/runbooks/CODEX_SESSION_CONTINUITY.md` and `docs/sessions/` checkpoint framework with `README.md` and `_TEMPLATE.md`.
- Added `Makefile` with `checkpoint` target and `scripts/checkpoint.sh`.
- Added `AGENTS.md` with Codex operating rules and execution guardrails.
- Added `docs/decisions/README.md` and `docs/decisions/adr-0001-agent-collaboration-model.md` (agent collaboration model decision).
- Added `plans/p13.md` and `plans/p10-p11-agent-prompts.md` to plans directory.
- Added P13 Story 1: `linkedin-profile-ingest` Supabase Edge Function with mocked provider payload, schema-locked LLM normalization, and preview-only HITL output (no DB writes before user approval).
- Added P13 Story 2: `src/utils/linkedinImportMerge.ts` deterministic merge/dedupe utility (canonical + fuzzy skill matching, experience fingerprint dedupe, provenance tagging) and `src/hooks/useLinkedinImportPreparation.ts` preparation hook; unit tests in `tests/unit/utils/linkedinImportMerge.test.ts`.
- Added P14 Story 1: `fetch-market-jobs` Edge Function + `sats_staged_jobs` migration (deduplication via `source_url` + `content_hash`, pg_cron scheduler).
- Added P14 Story 2: `async-ats-scorer` Edge Function + ATS-compatible persistence into `sats_job_descriptions` and `sats_analyses` with proactive metadata.
- Added P14 Story 3: threshold filtering and `sats_user_notifications` table; `profiles.proactive_match_threshold` per-user override; duplicate notification guard.
- Added P14 Story 4: `src/pages/ProactiveMatches.tsx` Opportunities UI dashboard with score-ordered proactive match cards and external URL links.
- Added P15 Story 1: `sats_learning_roadmaps` and `sats_roadmap_milestones` schema migration with owner-only RLS policies.
- Added P15 Story 2: `generate-upskill-roadmap` Edge Function with schema-locked LLM output, mandatory portfolio milestone enforcement, and roadmap/milestone persistence.
- Added P15 Story 3: `src/pages/UpskillingRoadmaps.tsx` and `src/components/UpskillingRoadmap.tsx` timeline UI with milestone completion toggles and progress bar; `/roadmaps` route and sidebar entry.
- Added In-App Help Hub (`/help` route + `src/pages/Help.tsx`) with searchable feature guides sourced from `helpContent`.
- Applied Supabase Security Advisor remediation: `20260225143500_enable_rls_on_public_policy_tables.sql`.
- Added `scripts/ops/` operational automation scripts for container lifecycle, verification, logs, and safe git push flows.
- Added CI workflow `.github/workflows/quality-gates.yml` with build, format, docs gate, and secrets gate checks.
- Added `scripts/ops/check-format.sh` for changed-files Prettier checks to support incremental adoption.
- Added `scripts/ops/check-docs.sh` to require documentation updates when code or infrastructure changes.
- Added `scripts/ops/check-secrets.sh` to scan added diff lines for potential secret leaks.
- Added `scripts/ops/check-supabase.sh` for Supabase CLI/local-status/migration/linked dry-run checks.
- Updated `scripts/ops/smartats.sh verify` to always generate timestamped execution logs under `scripts/ops/logs/`.

---

## [Pre-v1 Development History] – 2026-02-20 to 2026-03-01

> Migrated from `SATS_CHANGES.txt` on 2026-03-26. Contains granular detail for early infrastructure phases not fully captured above. `SATS_CHANGES.txt` is now archived; `git log --stat` is the authoritative file-level history.

### Added

- Implemented P5 enriched experience lifecycle: active-record filtering, in-place update mutation (`useUpdateEnrichedExperience`), soft-delete mutation (`useDeleteEnrichedExperience`), UI edit/delete actions. Added `deleted_at` / `updated_at` soft-delete fields and RLS policies for `enriched_experiences`. Aligned `cancel-account-deletion`, `delete-account` edge functions to include enrichment records in deletion scope.
- Implemented P5 enrichment modal product enhancements: evidence-checklist gating for inferred claims, tone controls + soften action, batch save/reject, workflow progress states, reasoning trace expansion, interview-safe tagging, and outcome metrics (acceptance rate, edit-before-save rate, rejection reasons, time-to-approve, ATS delta).
- Standardized Dockerfile healthcheck target to `127.0.0.1:3000`; added file-level update headers to `Dockerfile` and `docker-compose.yml`.
- Updated `README.md` to remove Lovable deployment documentation; replaced with current SmartATS architecture, features, routes, and deployment workflows.

### Changed

- SDLC P0 — removed hardcoded Supabase URL / project-id from `src/integrations/supabase/client.ts` and `src/lib/centralizedLogger.ts`; replaced with environment-driven endpoint resolution and fail-fast validation.
- SDLC P1 — moved OpenAI endpoint, model, and temperature (plus ATS token pricing inputs) to environment-driven configuration with safe defaults in `ats-analysis-direct` and `enrich-experiences` edge functions.
- SDLC P2 — disabled prompt and raw LLM payload persistence by default; added `STORE_LLM_PROMPTS` and `STORE_LLM_RAW_RESPONSE` runtime env var controls in `ats-analysis-direct`.
- SDLC P3 — moved logging retry/backoff, sampling rate limits, and payload size thresholds to environment-driven configuration in `centralizedLogger.ts` and `centralized-logging` edge function.
- SDLC P4 — replaced wildcard CORS with environment-driven `ALLOWED_ORIGINS` allowlist enforcement (explicit origin rejection + preflight support) across all five edge functions.
- Phase A lint cleanup: fixed `no-empty-object-type`, `no-case-declarations`, `ban-ts-comment`, and `no-require-imports` violations in `command.tsx`, `textarea.tsx`, `documentProcessor.ts`, `ats-analysis-direct/index.ts`, `tailwind.config.ts`.
- Phase B lint reduction: replaced `any` with typed/unknown metadata in all logger modules (`authLogger`, `documentLogger`, `jobDescriptionLogger`, `devLogger`, `localLogger`); added error-shape normalization helpers. Reduced global lint issues from 107 to 69.
- Hardened enrichment failure handling in `enrich-experiences`: mapped OpenAI provider failures (401/429/5xx) to safe client messages via `mapProviderError()`; removed raw provider payload logging; improved invoke diagnostics with error name/context/status and top-level `request_id` propagation.
