# Changelog

All notable changes to this project should be documented in this file.

## [Unreleased]

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
