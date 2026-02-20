# SmartATS

## Update Log
- 2026-02-20 22:25:31 | Replaced Lovable deployment documentation with the current SmartATS architecture and product feature set.

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
