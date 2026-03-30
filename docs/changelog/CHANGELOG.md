# Changelog

All notable changes to this project should be documented in this file.

## [Unreleased]

### Added

- 2026-03-31: INFRA-1 — LinkedIn scraper migrated from Railway to Fly.io. Added `scripts/playwright-linkedin/fly.toml` (shared-cpu-1x, 1 GB RAM, auto-stop, health check at `/health`). Removed `railway.json`. Updated `Dockerfile`, `package.json`, `.env.example`, and `scraper.ts` to remove Railway references. Flagged as MVP-temporary in `docs/improvements/TECHNICAL_IMPROVEMENTS.md` — hosting strategy must be reviewed before scaling beyond MVP.
- 2026-03-31: AWS Well-Architected Framework review completed. Full report saved to `docs/improvements/CODE-REVIEW-2026-03-31.md`. WAF-1 through WAF-18 added to backlog. Verdict: BLOCKED on SEC-1 (direct OpenAI call in `linkedin-profile-ingest` bypassing `callLLM()`). Review prompt saved to `docs/audits/aws-waf-review-prompt.md` for future use.

### Added (continued)

- 2026-03-30: PROD-9 — Resume Format Audit intelligence. `ats-analysis-direct` edge function now calls LLM with INTELLIGENCE_JSON_SCHEMA to detect ATS-breaking patterns (tables, emojis, vague bullets, missing URL, length mismatch) with severity levels. Results stored as `format_audit` in `analysis_data` JSONB. New `OPENAI_MODEL_INTELLIGENCE` environment variable (default: `gpt-4.1-mini`) added to `docs/specs/technical/llm-model-governance.md`.
- 2026-03-30: PROD-10 — Resume Geography Mode intelligence. Added `target_country` parameter to `CreateATSAnalysisRequest`. User can select from 8 countries or use auto-detect. Detects target country from job description text or user override; produces per-country format checklist (photo, length, personal details, date format). Results stored as `geography_passport` in `analysis_data` JSONB. UI component `ATSAnalysisModal.tsx` now includes optional "Target Market" Select field.
- 2026-03-30: PROD-11 — Resume Industry Lens intelligence. Classifies job description by vertical (Tech, Finance, Healthcare, Legal, Creative, Academic, Startup, Operations); flags missing industry-expected resume sections. Results stored as `industry_lens` in `analysis_data` JSONB.
- 2026-03-30: PROD-12 — Resume Cultural Tone Advisor intelligence. Detects writing register and flags mismatches against target market cultural norms. Results stored as `cultural_tone` in `analysis_data` JSONB.
- 2026-03-30: Resume Intelligence display layer. Created `ResumeIntelligencePanel.tsx` component rendering four intelligence sub-sections (Format Audit, Geography Passport, Industry Lens, Cultural Tone) with null-safe rendering for pre-feature analyses. Imported and rendered on `/analyses` page after CV Optimisation panel. `useDirectATSAnalysis.ts` and `useATSAnalyses.ts` hooks updated to include `target_country` in request interface.
- 2026-03-30: Updated `ats-analysis-direct` edge function to run CV Optimisation (Call 2) and Resume Intelligence (Call 3) in parallel via `Promise.allSettled()`. IntelligenceResult type and buildIntelligencePrompt() utility added. Intelligence keys (format_audit, geography_passport, industry_lens, cultural_tone, target_country_input) stored in analysis_data JSONB.
- 2026-03-30: Updated `async-ats-scorer` batch analysis to store null for four intelligence keys (format_audit, geography_passport, industry_lens, cultural_tone) since batch-scored analyses do not invoke Resume Intelligence logic.
- 2026-03-30: P25 S1 — DB foundation for Skill Profile Engine. Created `sats_skill_profiles` table (user_id + skill_name UNIQUE, proficiency level, last_classified, career_chapter reference, tier gating) with RLS policies and audit trigger. Created `sats_skill_decay_config` table with 6 seeded decay rules (skill-specific exponential decay curves). Migration file: `supabase/migrations/20260330100000_p25_s1_skill_profiles.sql`.
- 2026-03-30: P25 S2 — `classify-skill-profile` edge function. Classifies skills from experience text using LLM with temperature=0, seed=42, and schema-locked output. Returns career chapters, transferable skills, and diff payload for re-ingestion mode. Graceful fallback on LLM errors. Added `OPENAI_MODEL_SKILL_CLASSIFY` environment variable entry to `docs/specs/technical/llm-model-governance.md`.
- 2026-03-30: P25 S3 — `SkillClassificationReview` transparency UI component + `useSkillProfile` TanStack Query hooks (query, upsert, delete). Pre-save report showing AI classification results with three-choice per-skill override options. Pro/Max-gated "explain" re-classification trigger. Framer Motion stagger animations for skill lists. Accessibility tests in place (5 new a11y tests).
- 2026-03-30: P25 S4 — `ats-analysis-direct` weighted skill injection. Implemented `buildWeightedSkillBlock()` function that reads user's skill profile + decay config at analysis call time, computes effective weights using decay formula, and injects as additive context into baseline ATS prompt.
- 2026-03-30: P25 S5 — Shared skill decay utility. Extracted decay logic into reusable `_shared/skillDecay.ts` module. Updated `async-ats-scorer` edge function to batch-read skill profiles + decay config once per run and inject per-user weighted context.
- 2026-03-30: P25 S6 — `SkillProfileManager` settings component. View skills grouped by career chapter, delete individual skills with confirmation dialog. Added to Settings page. Accessibility tests in place. Added `skillProfile` help topic to `src/data/helpContent.ts` with workflow guidance.

### Changed

- 2026-03-30: Updated `docs/specs/technical/llm-model-governance.md` — added `OPENAI_MODEL_INTELLIGENCE` to Model Register (task: "Resume intelligence (format audit, geography mode, industry lens, cultural tone)", default: `gpt-4.1-mini`). Added `OPENAI_MODEL_SKILL_CLASSIFY` to Model Register (task: "Skill profile classification from experience text", default: `gpt-4.1-mini`).

### Fixed

- 2026-03-30: P14 S3 — Fixed `async-ats-scorer` notification threshold bug in `supabase/functions/async-ats-scorer/index.ts`. The `getUserThresholdMap()` function was using `DEFAULT_PROACTIVE_MATCH_THRESHOLD` (0.6 hardcoded) as fallback for users with null `proactive_match_threshold` in their profiles, causing the user threshold map to return 0.6 for all users. This prevented the `globalThreshold` from `sats_runtime_settings` (set to 0.40 for testing) from ever being reached. Fixed by removing the hardcoded fallback — `getUserThresholdMap()` now only inserts entries for users with an explicit non-null threshold. Users without one now correctly fall through to `globalThreshold` via the `??` operator. Code fix committed; function redeployment pending SUPABASE_ACCESS_TOKEN renewal.
- 2026-03-29: Added `@testing-library/dom` as direct dev dependency. The package was imported by axe-core tests but not declared, causing "Cannot find module" errors that failed 5 a11y tests. npm run verify now exits 0.
- 2026-03-29: Corrected `docs/specs/technical/llm-model-governance.md` — §2 Model Register production model is `gpt-4.1` (not stale `o4-mini` from 2026-03-17 rollback). §6 Change Log updated with rollback entry for historical accuracy.
- 2026-03-29: Fixed RLS cross-tenant test script bug in `scripts/ops/test-rls-cross-tenant.ts`: removed reference to non-existent `region` column in `sats_locations` table (table only contains city, state, country, created_at, updated_at).
- 2026-03-29: BUG-2026-03-17-LOCATION-RLS closed — cross-tenant RLS isolation on sats_locations confirmed working via runtime test (3/3 PASS).

### Changed

- 2026-03-29: Updated `docs/releases/UNTESTED_IMPLEMENTATIONS.md` — 8 items promoted from CODE-VERIFIED to RUNTIME-VERIFIED after Playwright functional test suite run. P16 S1 partial verification documented (6/7 persona manager tests pass, 1 skipped pending has_role migration). BUG-2026-03-17-LOCATION-RLS marked closed.

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

- 2026-03-27: Fixed infinite React re-render loop (`Warning: Maximum update depth exceeded`) on the `/analyses` page in `src/components/EnrichExperienceModal.tsx`. The `useEffect` dependency array included `generate` (the entire `useMutation` result object, which is a new reference on every render). Changed to `generate.reset` (destructured as `resetGenerate`) which is a stable method reference. This stopped the effect from firing on every render and calling multiple `setState` functions in a loop.
- 2026-03-27: Fixed the `has_role()` PostgreSQL function which was broken by the P21 Tier 1 table rename (`user_roles` → `sats_user_roles`). The function referenced the old table name, causing `42P01 undefined_table` errors when checking admin role and making the `/admin` route completely inaccessible. Migration: `20260327231000_fix_has_role_sats_user_roles_rename.sql`. The new function checks both `sats_user_roles` (legacy path) and `sats_user_role_assignments` joined with `sats_roles` (new RBAC path from P21 S2).

- 2026-03-28: Fixed P14 async-ats-scorer pipeline failure ("No analyses produced. Last error: [object Object]"). Root cause: `sats_job_descriptions` and `sats_analyses` tables had partial unique indexes (`WHERE proactive_staged_job_id IS NOT NULL`) which PostgreSQL cannot use with `ON CONFLICT (user_id, proactive_staged_job_id)` — produces error `42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification`. Migration: `20260328230000_fix_p14_proactive_job_conflict_constraints.sql` drops partial indexes and replaces with full unique constraints (`uq_sats_job_descriptions_user_staged_job`, `uq_sats_analyses_user_staged_job`). PostgreSQL's NULL != NULL behavior preserves the ability to have multiple rows with `proactive_staged_job_id = NULL` per user.
- 2026-03-28: Fixed `async-ats-scorer` edge function error serialization. The catch block was calling `String(error)` on Supabase `PostgrestError` objects, which are not `Error` instances, resulting in "[object Object]" in error messages. Changed to `error.message || JSON.stringify(error)` for proper diagnostics. File: `supabase/functions/async-ats-scorer/index.ts`.

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

## Pre-v1 Development History

Entries prior to 2026-03-23 are archived from `SATS_CHANGES.txt` for historical reference.

### P0–P4: SDLC Hardening & Infrastructure

- P0 S2: ESLint & Prettier config; ruled out Husky due to CI friction.
- P0 S3: Added GitHub Actions quality-gates.yml (lint, build, type-check, format-check).
- P1: Supabase auth + session refresh refactor → SATSUser wrapper (role context).
- P1 S2: Profiles table + RLS per-user read (excludes email/phone); `useAuth()` hook for client login/register.
- P2 S1: ATS Scoring edge function (`ats-analysis-direct`) + LLM orchestration abstraction.
- P3: Resume/Job management CRUD (QueryClient + TanStack Query); soft-delete pattern for auditing.
- P3 S1: Geolocation parsing from resume text (regex); upskilling roadmap schema.
- P4: Enriched Experiences entity + cross-cutting skill/location extraction & merge logic from LinkedIn.

### P5: Enrichment Lifecycle & LinkedIn Ingest

- P5 S1: Resume text extraction (PDF, DOCX, HTML via DOM) → `documentProcessor.ts`; lazy-load pdfjs/docx libs.
- P5 S2: LinkedIn profile scraper service + JSON validation; `linkedinImportMerge.ts` deduplication (fuzzy skill/location matching).
- P5 S3: Upskilling roadmap generation edge function with OpenAI integration.
