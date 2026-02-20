# SmartATS

## Update Log

- 2026-02-20 22:25:31 | Replaced Lovable deployment documentation with the current SmartATS architecture and product feature set.
- 2026-02-20 23:22:57 | Implemented P1 logging improvements: structured schema normalization, centralized validation, and edge-function lifecycle telemetry.
- 2026-02-20 23:29:40 | Implemented P2 correlation and timing: request_id propagation, debug visibility, and duration tracking for key workflows.
- 2026-02-20 23:29:40 | Implemented P3 reliability controls: policy-driven cleanup automation, sampling/throttling, retry/backoff, and payload truncation.
- 2026-02-20 23:42:10 | Implemented P4 observability and governance: admin dashboards, threshold alerts, and immutable log settings audit trail.
- 2026-02-21 00:05:00 | Added full `enrich-experiences-client` logging support (DB provisioning + generate/save workflow telemetry).
- 2026-02-21 00:15:00 | Hardened enrichment failure handling: safe provider error mapping, no raw provider payload logging, and improved client-side invoke diagnostics.
- 2026-02-21 00:40:00 | Implemented enrichment product upgrades: evidence checklist, tone controls, batch actions, progress states, and success metrics dashboard.
- 2026-02-21 00:34:53 | Added P5 roadmap in `PRODUCT_IMPROVEMENTS.md`: enrichment record lifecycle (id/timestamps/update/delete) and full account data deletion analysis.
- 2026-02-21 00:54:21 | Added P6 roadmap in `PRODUCT_IMPROVEMENTS.md`: modern SDLC automation (`ops`), CI quality gates, docs-as-release artifacts, and governance controls.
- 2026-02-21 00:54:21 | Implemented P5 lifecycle controls: enriched experience id/timestamps in UI, edit/delete actions, and account-deletion function scope alignment for enrichment records.
- 2026-02-21 02:18:11 | Implemented P6 SDLC baseline: `ops/` automation scripts, CI quality gates, docs-required checks, and diff-based secret scanning.
- 2026-02-21 02:32:24 | Added P7 roadmap in `PRODUCT_IMPROVEMENTS.md` for release version synchronization control across app artifacts, runtime baselines, and database migration state.
- 2026-02-21 02:36:51 | Added P8 roadmap in `PRODUCT_IMPROVEMENTS.md` for global v1 readiness across multi-user security hardening, localization, compliance, and regional deployment controls.
- 2026-02-21 02:42:45 | Executed Phase A lint cleanup: resolved `no-empty-object-type`, `no-case-declarations`, `ban-ts-comment`, and `no-require-imports` blockers.
- 2026-02-21 02:47:02 | Started Phase B lint hardening on logger libraries: removed `any` usage in auth/document/job-description/dev/local loggers and reduced total lint issues from 107 to 69.
- 2026-02-21 02:58:55 | Executed P0 configuration hardening: removed hardcoded Supabase/project identifiers from frontend client and centralized logger transport endpoint.
- 2026-02-21 03:02:13 | Executed SDLC P1 provider-model parameterization: ATS and enrichment edge functions now read OpenAI endpoint/model/temperature (and ATS pricing) from environment variables.
- 2026-02-21 03:06:56 | Executed SDLC P2 data-governance hardening: ATS function now disables prompt/raw LLM response persistence by default unless explicitly enabled via env flags.
- 2026-02-21 03:09:09 | Executed SDLC P3 reliability parameterization: centralized logging limits, retry/backoff, and sampling/rate controls are now environment-driven in frontend and edge logger paths.

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

## SDLC Operations (P6)

### Ops automation commands

```bash
npm run ops -- help
npm run verify
npm run verify:full
npm run supabase:check
```

### Direct script examples

```bash
bash ops/smartats.sh dev-start --build
bash ops/smartats.sh prod-start --build
bash ops/smartats.sh logs-dev-follow
bash ops/smartats.sh logs-prod-follow
bash ops/smartats.sh git-status
bash ops/smartats.sh git-safe-push
bash ops/smartats.sh supabase-check
```

### CI quality gates

- GitHub Actions workflow: `.github/workflows/quality-gates.yml`
- Blocking checks: build, changed-files format check, docs gate, secrets check
- Current transition mode: lint runs in CI as non-blocking while legacy lint debt is being reduced

### Verification logs

- `verify` now writes a timestamped report in `ops/logs/`:
  - `ops/logs/verify_YYYY-MM-DD_HH-MM-SS.log`

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
- Enrichment error hardening now maps OpenAI 401/429/5xx to safe user-facing messages and logs only sanitized provider diagnostics (`status`, `error_type`, `safe_message`).
- Enrichment UX now includes evidence-required validation for inferred skills, one-click claim softening, role relevance vs evidence strength indicators, traceable reasoning, batch save/reject actions, and review progress states.
- Success metrics tracking now surfaces acceptance rate, edit-before-save rate, rejection reason trends, time-to-approve, and ATS score delta when available.
- P5 lifecycle controls now allow users to review record metadata (`id`, `created_at`, `updated_at`), edit enriched suggestions in-place, and soft-delete suggestions from the active list.
- Account deletion/cancellation/reactivation database functions now include `enriched_experiences` in deletion scope handling.
- P6 operations baseline now includes:
  - `ops/smartats.sh` for start/stop/restart/logs/verify/git-safe-push flows.
  - `ops/check-docs.sh` to enforce docs updates when code/infrastructure changes.
  - `ops/check-format.sh` to enforce Prettier on changed files.
  - `ops/check-secrets.sh` to detect likely secrets in newly added diff lines.
  - `ops/check-supabase.sh` to validate Supabase CLI status, migration visibility, and linked dry-run status when token is available.
  - GitHub Action quality gates in `.github/workflows/quality-gates.yml`.
- SDLC P4 security hardening now enforces CORS allowlists in edge functions via `ALLOWED_ORIGINS` and rejects non-allowed origins with explicit `403` responses.
