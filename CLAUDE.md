# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server on http://localhost:8080
npm run build        # Production build
npm run build:dev    # Development mode build
npm run lint         # ESLint validation
npm run format       # Prettier formatting
npm run format:check # Check formatting without applying
npm run preview      # Preview production build locally
```

No test suite is configured in this project.

## Architecture Overview

**SmartATS** is an ATS (Applicant Tracking System) resume optimization tool. Users upload resumes, provide job descriptions, and get AI-powered analysis on how well their resume matches the job posting.

**Stack:** React 18 + TypeScript, Vite, Tailwind CSS, shadcn-ui, TanStack Query, React Router v6, Supabase (auth + DB + edge functions), OpenAI GPT-4o-mini.

### Data Flow

```
User uploads resume/job description
  → Document processor extracts text (PDF.js for PDF, Mammoth for DOCX)
  → Text stored in Supabase DB (sats_resumes, sats_job_descriptions)
  → ATS analysis triggered via Supabase Edge Function (ats-analysis-direct)
  → Edge function calls OpenAI, stores results in sats_analyses + ats_findings
  → Frontend polls/subscribes to display results
```

### Key Directories

- `src/pages/` — Route-level components (Dashboard, MyResumes, JobDescriptions, ATSAnalyses, Settings, AdminDashboard)
- `src/components/` — Domain components (modals, forms) + `ui/` (shadcn-ui wrappers)
- `src/hooks/` — Custom hooks wrapping TanStack Query for each domain entity
- `src/services/documentProcessor.ts` — PDF/DOCX/HTML text extraction pipeline
- `src/lib/` — Loggers and utilities
- `src/integrations/supabase/` — Auto-generated types (`types.ts`) and client config
- `supabase/functions/` — Deno edge functions
- `supabase/migrations/` — SQL schema evolution files
- `public/pdfjs/` — Local PDF.js worker files (required for PDF extraction)

### Auth & Routing

- `src/contexts/AuthContext.tsx` provides `user`, `session`, and `satsUser` (app-level user model)
- `ProtectedRoute` wraps authenticated routes; redirects to `/auth` if unauthenticated
- Admin routes additionally require the `useUserRole` hook to return an admin role
- Supabase Auth with email/password; soft-delete user accounts (reactivated on login)

### Database Schema (key tables)

- `sats_resumes` — User-uploaded resumes
- `sats_job_descriptions` — Job postings entered by users
- `sats_analyses` — ATS match analysis results linking a resume to a job description
- `ats_findings` — Granular findings from an analysis
- `ats_derivatives` — Artifacts generated during analysis
- `profiles` — Auth user profiles (with soft-delete support)
- `sats_companies` — Company directory

### Logging System

Three specialized logger modules exist under `src/lib/`:
- `centralizedLogger.ts` — Ships logs to the `centralized-logging` Supabase edge function; falls back to console in non-browser environments. Use `createScriptLogger()` for script-scoped context.
- `documentLogger.ts` — Document processing stage logging
- `authLogger.ts` — Auth event logging
- `jobDescriptionLogger.ts` — Job description processing logging

Logging to the remote endpoint can be toggled via the `VITE_LOGGING_ENABLED` env var (controls the dev error overlay as well).

### Edge Functions (Deno)

- `ats-analysis-direct` — Calls OpenAI, calculates token costs, stores results
- `centralized-logging` — Aggregates logs from client
- `delete-account` / `cancel-account-deletion` — Account lifecycle with audit trail
- `enrich-experiences` — Enriches work experience entries via LLM

### Supabase Client

Configured in `src/integrations/supabase/client.ts`. Types are auto-generated in `src/integrations/supabase/types.ts` — do not hand-edit this file.

## Environment Variables

Create `.env.local` (not committed):

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_LOGGING_ENABLED=true
```

## Key Patterns

- **Component-level data fetching**: Each domain hook (e.g., `useResumes`, `useATSAnalyses`) encapsulates TanStack Query logic and exposes typed data + mutation functions.
- **Real-time updates**: Supabase `.channel()` subscriptions used where live data is needed; hooks invalidate React Query cache on change.
- **Modals for complex flows**: Resume upload, job description entry, ATS analysis, and debug output each have dedicated modal components.
- **Path alias**: `@/` maps to `src/` throughout the codebase.
- **TypeScript strictness**: `strict: false` — unused variable/parameter checks are disabled.
