# SmartATS Architecture

**Last Updated:** 2026-03-18

## Overview

SmartATS is a React + TypeScript application with Supabase (Postgres + Auth + Edge Functions) and AI-assisted workflows for ATS analysis, enrichment, proactive matching, and roadmap generation.

---

## High-Level Components

1. **Frontend:** `src/`
   - React, Vite, Tailwind, shadcn/ui
   - Data layer via TanStack Query + Supabase client

2. **Backend data and auth:** `supabase/`
   - Postgres schema and migrations in `supabase/migrations/`
   - Auth and RLS enforced at database layer

3. **Server-side workflows:** `supabase/functions/`
   - ATS scoring, enrichment, logging, ingestion, and roadmap generation
   - All AI/LLM calls routed through `_shared/llmProvider.ts` (P16 Story 0 — see LLM section)

4. **Operations and quality gates:** `scripts/ops/`
   - Verify, docs gates, secrets scan, Supabase checks, eval checks

---

## Key Data Flows

1. **Resume/JD ingestion** → extraction/normalization → persistence in `sats_*` tables.
2. **ATS analysis requests** → edge function scoring → `sats_analyses` + related artifacts.
3. **Enrichment and roadmap generation** → schema-locked LLM output → persisted user-owned records.
4. **LinkedIn import** → `linkedin-profile-ingest` edge function → `linkedin-import-merge` frontend utility → HITL review modal → `sats_user_skills` + `sats_skill_experiences`.
5. **Profile reconciliation** (P16) → `reconcile-profile` edge function → `sats_profile_conflicts` → HITL resolution page → master profile updated.
6. **Career fit and live job discovery** (P16) → `suggest-career-fit` → `fetch-live-jobs` (JSearch/Adzuna) → `sats_job_discovery_cache` + `sats_career_fit_suggestions` → `/career-fit` UI.
7. **Proactive matching** (P14) → `fetch-market-jobs` (cron) → `sats_staged_jobs` → `async-ats-scorer` (cron) → `sats_analyses` + `sats_user_notifications` (if score ≥ threshold).
8. **Resume Personas** (P16 Story 1) → user selects active persona in `/settings` → `PersonaManager` writes to `sats_resume_personas` → active persona is passed to ATS analysis as role context.
9. **CV Optimisation Score** (P18) → ATS analysis completes (Call 1, pure baseline) → `getAcceptedEnrichments()` fetches accepted enrichments → Call 2 (`buildOptimisationPrompt`) projects improved score → both scores returned in analysis response.

---

## LLM Provider

### Current Provider: OpenAI

| Edge Function | Primary Model | Fallback Model |
|---|---|---|
| `ats-analysis-direct` | `gpt-4.1` | `gpt-4o-mini` |
| `async-ats-scorer` | `gpt-4.1` | `gpt-4o-mini` |
| `enrich-experiences` | `gpt-4.1-mini` | `gpt-4o-mini` |
| `generate-upskill-roadmap` | `gpt-4.1-mini` | `gpt-4o-mini` |

All calls use structured JSON output (`response_format.json_schema` with `strict: true`). Cost estimates are tracked per analysis in `sats_analyses.cost_estimate_usd`.

### Provider Abstraction (P16 Story 0)

A shared utility at `supabase/functions/_shared/llmProvider.ts` removes direct OpenAI coupling from all edge functions. Switching provider requires only a change to the `SATS_LLM_PROVIDER` environment variable. No edge function code changes are needed.

Supported providers (current and planned): `openai`, `anthropic`, `gemini`, `groq`, `mistral`.

See `docs/decisions/adr-0002-llm-provider-abstraction.md` for full rationale and migration plan.

### CV Optimisation Score — Two-Call Isolation (P18)

ATS analysis with CV Optimisation uses two sequential, isolated `callLLM()` calls:

1. **Call 1 — Base ATS Score**: Pure scoring prompt. No enrichment context. `temperature: 0`, `seed: 42` for deterministic output. Produces the raw ATS score and gap analysis.
2. **Call 2 — CV Optimisation Projection**: Receives Call 1 output + accepted enrichments. Projects what the score *could be* if improvements are applied.

The two calls are never merged. Call 1 output is read-only input to Call 2. See `docs/decisions/adr-0003-two-call-ats-cv-optimisation-isolation.md` for full rationale.

### Async vs Direct ATS Scoring (P14/P8)

Two code paths for ATS scoring exist and are intentionally separate:

| Path | File | Trigger | Use |
|---|---|---|---|
| Direct | `ats-analysis-direct` | User action | On-demand, user-facing, includes CV Optimisation |
| Async | `async-ats-scorer` | Cron job | Background proactive scoring against market jobs |

See `docs/decisions/adr-0004-async-vs-direct-ats-scoring.md` for full rationale.

### Output Contract

All LLM calls enforce schema-locked JSON output (`response_format.json_schema`, `strict: true`). Schemas in use:

| Schema | Owner function | Purpose |
|---|---|---|
| `ATS_JSON_SCHEMA` | `ats-analysis-direct`, `async-ats-scorer` | ATS scoring with evidence and skill match |
| `CV_OPTIMISATION_JSON_SCHEMA` | `ats-analysis-direct` (Call 2 only) | CV improvement projection score (P18) |
| `ENRICHMENT_JSON_SCHEMA` | `enrich-experiences` | Experience enrichment with evidence constraints |
| `ROADMAP_JSON_SCHEMA` | `generate-upskill-roadmap` | Upskilling milestones with ordered sequence |
| `CAREER_FIT_JSON_SCHEMA` | `suggest-career-fit` | Role suggestions with match strength and skill gaps (P16) |
| `LINKEDIN_NORMALIZATION_SCHEMA` | `linkedin-profile-ingest` | Skills and experiences normalized from raw scraper payload (P13) |

---

## Resume Storage Architecture

### Design: Split Storage

| Data | Location | Details |
|---|---|---|
| Resume file bytes | Supabase Storage, `SATS_resumes` bucket | Private bucket, path: `{user_id}/{random_filename}.{ext}` |
| Resume metadata | `sats_resumes` table | name, object_key, sha256, mime_type, size_bytes |
| Extracted text | `document_extractions` table | Full text, word count, extraction method, warnings |
| Persona configuration | `sats_resume_personas` table (P16 Story 1) | Role weights, keyword highlights, custom summary |

### Security Controls

- Supabase Storage RLS enforces `user_id` from storage path: `(storage.foldername(name))[1] = auth.uid()::text`
- Postgres RLS enforces `user_id = auth.uid()` on all resume-related tables
- Soft deletes (`deleted_at`) on both `sats_resumes` and `document_extractions`
- Cascading deletes: resume deletion cascades to `document_extractions`

### Planned Enterprise Upgrade (P16 Story 2)

- Replace permanent public `file_url` with on-demand signed URLs (15-minute expiry)
- Add SHA-256 content hash for deduplication
- Add resume version chain (`supersedes_id` FK)
- Add server-side MIME validation on upload edge function
- ClamAV virus scanning (backlog)

---

## Key Data Tables

| Table | Purpose |
|---|---|
| `sats_resumes` | Resume file metadata and storage references |
| `document_extractions` | Extracted text content from resume files |
| `sats_resume_personas` | Role-specific profile configurations (P16) |
| `sats_job_descriptions` | User-managed job descriptions for ATS matching |
| `sats_analyses` | ATS analysis results with score, matched/missing skills |
| `sats_user_skills` | User's canonical skill records with proficiency |
| `sats_skill_experiences` | Detailed work experience records per skill |
| `sats_enriched_experiences` | AI-generated experience enrichment suggestions |
| `sats_learning_roadmaps` | P15 upskilling roadmap records |
| `sats_roadmap_milestones` | Ordered milestones within a roadmap |
| `sats_reconciliation_runs` | Profile reconciliation session audit trail (P16) |
| `sats_profile_conflicts` | Detected conflicts between profile data sources (P16) |
| `sats_conflict_resolutions` | Immutable record of user resolution decisions (P16) |
| `sats_career_fit_suggestions` | AI-generated role suggestions per user/persona (P16) |
| `sats_job_discovery_cache` | Live job listings from external APIs, 4h TTL (P16) |
| `sats_staged_jobs` | P14 proactive market job pool |
| `sats_user_notifications` | User notification records (P14) |

---

## External Integrations

| Service | Purpose | API Type |
|---|---|---|
| OpenAI | LLM for ATS scoring, enrichment, roadmap, career fit | REST (direct HTTP fetch) |
| Supabase Auth | User authentication and session management | Supabase client |
| Supabase Storage | Resume and document file storage | Supabase storage client |
| JSearch (RapidAPI) | Live job listings — US, global aggregated (P16) | REST API |
| Adzuna | Live job listings — BR, AU, NZ, UK (P16) | REST API |
| LinkedIn (planned) | Profile ingestion via `linkedin-profile-ingest` edge function | Scraping (ToS review required for live data) |

---

## Repository Organization

- `AGENTS.md`: Codex execution rules
- `CLAUDE.md`: Claude Code review/architecture rules
- `README.md`: developer onboarding and commands
- `plans/`: implementation plans and phase workpacks
- `docs/decisions/`: ADRs and product/architecture decisions
- `docs/decisions/adr-0001-agent-collaboration-model.md`: agent ownership model
- `docs/decisions/adr-0002-llm-provider-abstraction.md`: LLM provider abstraction decision
- `docs/decisions/adr-0003-two-call-ats-cv-optimisation-isolation.md`: P18 two-call isolation pattern
- `docs/decisions/adr-0004-async-vs-direct-ats-scoring.md`: async vs direct ATS scoring paths
- `docs/decisions/adr-0005-skill-dedup-fuzzy-matching.md`: skill deduplication strategy (Dice coefficient)
- `docs/decisions/adr-0006-rls-first-tenant-isolation.md`: RLS-first multi-tenant isolation model
- `docs/runbooks/`: operational procedures
- `docs/specs/product/`: product feature specifications
- `docs/specs/technical/`: technical implementation specifications
- `docs/compliance/`: data retention, deletion, and audit policies
- `docs/security/`: RLS baseline and security reports
