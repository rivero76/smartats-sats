# SmartATS Architecture

## Overview

SmartATS is a React + TypeScript application with Supabase (Postgres + Auth + Edge Functions) and AI-assisted workflows for ATS analysis, enrichment, proactive matching, and roadmap generation.

## High-Level Components

1. Frontend: `src/`
   - React, Vite, Tailwind, shadcn/ui
   - Data layer via TanStack Query + Supabase client
2. Backend data and auth: `supabase/`
   - Postgres schema/migrations in `supabase/migrations/`
   - Auth and RLS at database layer
3. Server-side workflows: `supabase/functions/`
   - ATS scoring, enrichment, logging, ingestion, and roadmap generation
4. Operations and quality gates: `scripts/ops/`
   - Verify, docs gates, secrets scan, Supabase checks, eval checks

## Key Data Flows

1. Resume/JD ingestion -> extraction/normalization -> persistence in `sats_*` tables.
2. ATS analysis requests -> edge function scoring -> `sats_analyses` + related artifacts.
3. Enrichment and roadmap generation -> schema-locked LLM output -> persisted user-owned records.

## Repository Organization

- `AGENTS.md`: Codex execution rules
- `CLAUDE.md`: Claude Code review/architecture rules
- `README.md`: developer onboarding and commands
- `plans/`: implementation plans and phase workpacks
- `docs/decisions/`: ADRs and product/architecture decisions
- `docs/runbooks/`: operational procedures
