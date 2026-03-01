# SmartATS Architecture

**Last Updated:** 2026-03-01

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
4. **LinkedIn import** → `linkedin-profile-ingest` edge function → `linkedinImportMerge` frontend utility → HITL review modal → `sats_user_skills` + `sats_skill_experiences`.
5. **Profile reconciliation** (P16) → `reconcile-profile` edge function → `sats_profile_conflicts` → HITL resolution page → master profile updated.
6. **Career fit and live job discovery** (P16) → `suggest-career-fit` → `fetch-live-jobs` (JSearch/Adzuna) → `sats_job_discovery_cache` + `sats_career_fit_suggestions` → `/career-fit` UI.

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

A shared utility at `supabase/functions/_shared/llmProvider.ts` is being introduced to remove direct OpenAI coupling from all edge functions. Switching provider will require only a change to the `SATS_LLM_PROVIDER` environment variable. No edge function code changes will be needed.

Supported providers (current and planned): `openai`, `anthropic`, `gemini`, `groq`, `mistral`.

See `docs/decisions/adr-0002-llm-provider-abstraction.md` for full rationale and migration plan.

### Output Contract

All LLM calls enforce schema-locked JSON output. Three schemas are in use:
- `ATS_JSON_SCHEMA` — ATS scoring with evidence and skill match
- `ENRICHMENT_JSON_SCHEMA` — Experience enrichment with evidence constraints
- `ROADMAP_JSON_SCHEMA` — Upskilling milestones with ordered sequence

New schemas added in P16:
- `CAREER_FIT_JSON_SCHEMA` — Role suggestions with match strength and skill gaps

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
- `docs/runbooks/`: operational procedures
- `docs/specs/product/`: product feature specifications
- `docs/specs/technical/`: technical implementation specifications
- `docs/compliance/`: data retention, deletion, and audit policies
- `docs/security/`: RLS baseline and security reports
