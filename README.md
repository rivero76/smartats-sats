# SmartATS

## Update Log
- 2026-02-20 22:25:31 | Replaced Lovable deployment documentation with the current SmartATS architecture and product feature set.
- 2026-02-20 23:22:57 | Implemented P1 logging improvements: structured schema normalization, centralized validation, and edge-function lifecycle telemetry.
- 2026-02-20 23:29:40 | Implemented P2 correlation and timing: request_id propagation, debug visibility, and duration tracking for key workflows.
- 2026-02-20 23:29:40 | Implemented P3 reliability controls: policy-driven cleanup automation, sampling/throttling, retry/backoff, and payload truncation.
- 2026-02-20 23:42:10 | Implemented P4 observability and governance: admin dashboards, threshold alerts, and immutable log settings audit trail.
- 2026-02-21 00:05:00 | Added full `enrich-experiences-client` logging support (DB provisioning + generate/save workflow telemetry).

SmartATS is a web application for resume management, job description management, ATS scoring, and AI-assisted experience enrichment.

## Current Architecture

### Frontend
- React 18 + TypeScript + Vite
- TanStack Query for server state and caching
- React Router for navigation
- Tailwind CSS + shadcn/ui for UI components

### Backend and Data
- Supabase Auth for authentication and session management
- Supabase Postgres for application data
- Supabase Edge Functions (Deno) for server-side workflows
- Supabase Storage for document assets

### AI Processing
- OpenAI model integration from Supabase Edge Functions
- Core AI flows:
  - `ats-analysis-direct` for resume-to-job ATS analysis
  - `enrich-experiences` for improving resume experience entries

### Runtime and Deployment
- Local development: Vite (`npm run dev`)
- Production container: multi-stage Docker build (`node:20-alpine` builder + `nginx:alpine` runtime)
- Container orchestration: `docker-compose.yml` with services:
  - `smartats-app` (production)
  - `smartats-dev` (hot-reload development profile)

## Product Features and Functionalities

### Authentication and Access
- User sign-in/sign-out and protected routes
- Profile-aware sidebar and role-based admin access
- Password reset flow

### Resume Management
- Upload and manage resumes
- Resume content extraction and preview flow
- Resume CRUD operations

### Job Description Management
- Create, update, and manage job descriptions
- Job description CRUD operations

### ATS Analysis
- Trigger ATS analysis for a selected resume and job description
- Queue, process, retry, and delete analysis jobs
- Display ATS score, matched/missing skills, and suggestions
- Analysis progress and debug visibility

### Experience Enrichment
- Generate AI suggestions to strengthen experience bullets
- Review and save enriched experience content
- Track enriched outcomes for later review

### Dashboard and Analytics
- Summary dashboard for resumes, jobs, and analyses
- ATS analysis status/metrics views

### Administration and Logging
- Admin dashboard for operational visibility
- Centralized logging controls and log viewer/cleanup utilities
- Account deletion and cancellation flows via edge functions

## Main App Routes
- `/` Dashboard
- `/resumes` My Resumes
- `/jobs` Job Descriptions
- `/analyses` ATS Analyses
- `/experiences` Enriched Experiences
- `/settings` Settings
- `/admin` Admin Dashboard (role-gated)
- `/auth` Authentication
- `/reset-password` Password Reset

## Local Development

### Prerequisites
- Node.js 20+
- npm
- Supabase project credentials configured in environment files

### Start with npm
```bash
npm install
npm run dev
```

### Build production assets
```bash
npm run build
npm run preview
```

## Docker Usage

### Development container
```bash
docker compose --profile dev up smartats-dev --build
```
App: `http://localhost:8080`

### Production container
```bash
docker compose up smartats-app --build
```
App: `http://localhost:3000`

## Change Tracking Functionality

- Reviewed code files include an `UPDATE LOG` header entry with timestamp format `YYYY-MM-DD HH24:MM:SS`.
- `README.md` is updated when functionality/process changes are introduced.
- `SATS_CHANGES.txt` records product-level changes, updated files, reasons, and timestamps.
- Centralized logging now validates request shape and payload size, and normalizes structured metadata fields:
`event_name`, `component`, `operation`, `outcome`, `duration_ms`, `request_id`, `session_id`, `user_id`.
- P2 correlation is now wired through ATS and enrichment flows with `request_id` propagated from frontend hooks to edge functions and log storage.
- P3 reliability controls now include:
  - Automated policy-driven cleanup (`retention_days` + `max_entries`) through `run_log_cleanup_policies()`.
  - Client-side `DEBUG`/`TRACE` sampling and rate limiting in the centralized logger.
  - Retry with exponential backoff for remote log delivery.
  - Message and metadata truncation to enforce storage-safe payload budgets.
- P4 observability now includes:
  - Admin observability dashboard cards for error rate, p95 latency, failure trends, and cost trend.
  - Rule-based alert checks (error spikes, ATS failure-rate, and cost anomaly thresholds).
  - Immutable audit trail for `log_settings` changes via database trigger-backed audit table.
- Frontend enrichment logging now has explicit `log_settings` provisioning for `enrich-experiences-client`, including both suggestion generation and save workflow events.
