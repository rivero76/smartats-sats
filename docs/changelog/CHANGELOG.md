# Changelog

All notable changes to this project should be documented in this file.

## [Unreleased]

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
