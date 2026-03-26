# Changelog

All notable changes to this project should be documented in this file.

## [Unreleased]

- 2026-03-23: Created `docs/improvements/technical_review_2026-03-18.md` — Mac developer environment and repository organisation recommendations (OneDrive risk, node_modules sync, stray files, scripts layout, pre-commit hook setup, .railwayignore).
- 2026-03-23: Extended `technical_review_2026-03-18.md` with i18n readiness assessment (NOT READY — zero translation infrastructure, all strings hardcoded in English; date-fns and toLocaleString present as foundation) and multi-user readiness assessment (READY — RLS enforced on all user-owned tables, query-layer filtering correct, admin role gated; gap: no per-user API quotas on ATS/enrichment edge functions).

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
