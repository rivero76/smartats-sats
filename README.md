# SmartATS

## Repository Organization

- `AGENTS.md`: Codex operating rules and execution guardrails
- `CLAUDE.md`: Claude Code review/architecture guardrails
- `docs/architecture.md`: current architecture baseline
- `docs/decisions/`: ADRs and strategy decisions
- `plans/`: phase plans and implementation workpacks (`p13`, `p14`, `p15`, and product improvements)
- `scripts/ops/`: operational automation and quality gates
- `tests/`: top-level test suites

## Agent Task Split

1. Codex: implementation, refactors, tests, scripts/CI updates.
2. Claude Code: architecture tradeoffs, large-diff review, risk/security/performance review.
3. Human owner: final decisions, merge/release approvals, and scope prioritization.

## Update Log

- 2026-02-25 17:50:00 | Implemented P13 Story 2 frontend dedupe/merge preparation: fuzzy skill matching, experience fingerprint dedupe, and provenance-tagged import buckets for HITL flow.
- 2026-02-25 17:20:00 | Implemented P13 Story 1 backend preview flow: new `linkedin-profile-ingest` edge function with mock LinkedIn payload fetch and schema-locked LLM normalization for HITL review.
- 2026-02-25 16:55:00 | Implemented P15 Story 3 roadmap UI: new `/roadmaps` dashboard with sequenced milestones, completion toggles, and progress tracking.
- 2026-02-25 16:20:00 | Added Codex session continuity guidance and runbook links to preserve context across large/long-running implementation sessions.
- 2026-02-20 22:25:31 | Replaced Lovable deployment documentation with the current SmartATS architecture and product feature set.
- 2026-02-20 23:22:57 | Implemented P1 logging improvements: structured schema normalization, centralized validation, and edge-function lifecycle telemetry.
- 2026-02-20 23:29:40 | Implemented P2 correlation and timing: request_id propagation, debug visibility, and duration tracking for key workflows.
- 2026-02-20 23:29:40 | Implemented P3 reliability controls: policy-driven cleanup automation, sampling/throttling, retry/backoff, and payload truncation.
- 2026-02-20 23:42:10 | Implemented P4 observability and governance: admin dashboards, threshold alerts, and immutable log settings audit trail.
- 2026-02-21 00:05:00 | Added full `enrich-experiences-client` logging support (DB provisioning + generate/save workflow telemetry).
- 2026-02-21 00:15:00 | Hardened enrichment failure handling: safe provider error mapping, no raw provider payload logging, and improved client-side invoke diagnostics.
- 2026-02-21 00:40:00 | Implemented enrichment product upgrades: evidence checklist, tone controls, batch actions, progress states, and success metrics dashboard.
- 2026-02-21 00:34:53 | Added P5 roadmap in `plans/product-improvements.md`: enrichment record lifecycle (id/timestamps/update/delete) and full account data deletion analysis.
- 2026-02-21 00:54:21 | Added P6 roadmap in `plans/product-improvements.md`: modern SDLC automation (`scripts/ops`), CI quality gates, docs-as-release artifacts, and governance controls.
- 2026-02-21 00:54:21 | Implemented P5 lifecycle controls: enriched experience id/timestamps in UI, edit/delete actions, and account-deletion function scope alignment for enrichment records.
- 2026-02-21 02:18:11 | Implemented P6 SDLC baseline: `scripts/ops/` automation scripts, CI quality gates, docs-required checks, and diff-based secret scanning.
- 2026-02-21 02:32:24 | Added P7 roadmap in `plans/product-improvements.md` for release version synchronization control across app artifacts, runtime baselines, and database migration state.
- 2026-02-21 02:36:51 | Added P8 roadmap in `plans/product-improvements.md` for global v1 readiness across multi-user security hardening, localization, compliance, and regional deployment controls.
- 2026-02-21 02:42:45 | Executed Phase A lint cleanup: resolved `no-empty-object-type`, `no-case-declarations`, `ban-ts-comment`, and `no-require-imports` blockers.
- 2026-02-21 02:47:02 | Started Phase B lint hardening on logger libraries: removed `any` usage in auth/document/job-description/dev/local loggers and reduced total lint issues from 107 to 69.
- 2026-02-21 02:58:55 | Executed P0 configuration hardening: removed hardcoded Supabase/project identifiers from frontend client and centralized logger transport endpoint.
- 2026-02-21 03:02:13 | Executed SDLC P1 provider-model parameterization: ATS and enrichment edge functions now read OpenAI endpoint/model/temperature (and ATS pricing) from environment variables.
- 2026-02-21 03:06:56 | Executed SDLC P2 data-governance hardening: ATS function now disables prompt/raw LLM response persistence by default unless explicitly enabled via env flags.
- 2026-02-21 03:09:09 | Executed SDLC P3 reliability parameterization: centralized logging limits, retry/backoff, and sampling/rate controls are now environment-driven in frontend and edge logger paths.
- 2026-02-21 03:24:42 | Added P9 roadmap in `plans/product-improvements.md` for AI runtime governance and unified LLM operations analytics (config editing + telemetry + KPI dashboards).

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
  - `linkedin-profile-ingest` for LinkedIn profile normalization preview (HITL pre-save stage)

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

### Upskilling Roadmaps

- View generated learning roadmaps by target role
- Track sequenced milestones across course, project, and interview-prep steps
- Toggle milestone completion and monitor percentage progress

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
- `/roadmaps` Upskilling Roadmaps
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
bash scripts/ops/smartats.sh dev-start --build
bash scripts/ops/smartats.sh prod-start --build
bash scripts/ops/smartats.sh logs-dev-follow
bash scripts/ops/smartats.sh logs-prod-follow
bash scripts/ops/smartats.sh git-status
bash scripts/ops/smartats.sh git-safe-push
bash scripts/ops/smartats.sh supabase-check
```

### CI quality gates

- GitHub Actions workflow: `.github/workflows/quality-gates.yml`
- Blocking checks: build, changed-files format check, docs gate, secrets check
- Current transition mode: lint runs in CI as non-blocking while legacy lint debt is being reduced

### Verification logs

- `verify` now writes a timestamped report in `scripts/ops/logs/`:
  - `scripts/ops/logs/verify_YYYY-MM-DD_HH-MM-SS.log`

## Codex Session Continuity

When resuming work in a new Codex session, use checkpoint artifacts instead of chat history.

1. Pull latest branch state:
   - `git checkout p14`
   - `git pull`
2. Open the latest checkpoint in `docs/sessions/`.
3. Start a new checkpoint immediately:
   - `NOTE="session start: <goal>" make checkpoint`
4. Use short execution loops:
   - change -> verify -> checkpoint -> commit
5. End each session by updating `Next Actions` in the checkpoint file.

Detailed workflow:
- `docs/runbooks/CODEX_SESSION_CONTINUITY.md`
- `docs/sessions/README.md`

## Change Tracking Functionality

- Reviewed code files include an `UPDATE LOG` header entry with timestamp format `YYYY-MM-DD HH24:MM:SS`.
- `README.md` is updated when functionality/process changes are introduced.
- `docs/changelog/SATS_CHANGES.txt` records product-level changes, updated files, reasons, and timestamps.
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
  - `scripts/ops/smartats.sh` for start/stop/restart/logs/verify/git-safe-push flows.
  - `scripts/ops/check-docs.sh` to enforce docs updates when code/infrastructure changes.
  - `scripts/ops/check-format.sh` to enforce Prettier on changed files.
  - `scripts/ops/check-secrets.sh` to detect likely secrets in newly added diff lines.
  - `scripts/ops/check-supabase.sh` to validate Supabase CLI status, migration visibility, and linked dry-run status when token is available.
  - GitHub Action quality gates in `.github/workflows/quality-gates.yml`.
- SDLC P4 security hardening now enforces CORS allowlists in edge functions via `ALLOWED_ORIGINS` and rejects non-allowed origins with explicit `403` responses.
- P9 roadmap now defines AI runtime governance and analytics foundations: editable model/runtime parameters, immutable config audit trail, unified LLM event capture, and cost/performance/product KPI dashboards.
- P15 Story 3 is now implemented in-app via `/roadmaps`, including sequenced milestone timeline UI, completion toggles, and progress bar tracking for persisted learning plans.
