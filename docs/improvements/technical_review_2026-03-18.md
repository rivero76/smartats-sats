# Technical Review — 2026-03-18

## Mac Developer Environment & Repository Organisation

---

## 1. What the AI Agent Is and Where Its Files Live

The SmartATS project uses two AI coding agents:

### Claude Code (`CLAUDE.md`)

- **Role:** Architecture review, ADRs, large-diff review, documentation, release-readiness checks.
- **Global config folder:** `~/.claude/` — stores conversation memory, project indexes, and session artifacts.
  - `~/.claude/projects/.../memory/` — persistent auto-memory (user preferences, project context, feedback)
  - `~/.claude/projects/.../` — session JSONL transcripts
- **Project-level config:** `CLAUDE.md` (repo root) — role definition, commands, architecture reference, coding conventions.
- **Supporting docs (read by Claude Code):**
  - `docs/architecture.md` — architecture baseline
  - `docs/decisions/` — ADRs (adr-0001 through adr-0006)
  - `docs/releases/UNTESTED_IMPLEMENTATIONS.md` — release blockers
  - `docs/conventions/coding-conventions.md` — enforced coding standards

### Codex / OpenAI Codex (`AGENTS.md`)

- **Role:** Implementation, refactors, tests, CI/script updates.
- **Project-level config:** `AGENTS.md` (repo root) — execution guardrails and operating rules.
- **Session continuity artifacts:**
  - `docs/sessions/` — per-session checkpoints written by Codex
  - `docs/runbooks/CODEX_SESSION_CONTINUITY.md` — how to resume Codex sessions

---

## 2. Application Folder Structure

```
smartats-sats/
├── src/                          # React 18 + TypeScript frontend
│   ├── components/               # UI components (PascalCase.tsx)
│   ├── contexts/                 # AuthContext and other React contexts
│   ├── hooks/                    # TanStack Query domain hooks
│   ├── lib/                      # Shared utilities (centralizedLogger, etc.)
│   ├── pages/                    # Route-level page components
│   ├── services/                 # Client-side services (documentProcessor, etc.)
│   ├── utils/                    # Pure utility functions
│   ├── data/                     # Static content (helpContent, etc.)
│   └── integrations/supabase/    # Auto-generated Supabase types + client
│
├── supabase/
│   ├── functions/                # Deno Edge Functions
│   │   ├── _shared/              # Shared utilities: cors.ts, llmProvider.ts, env.ts
│   │   ├── ats-analysis-direct/  # User-triggered ATS scoring
│   │   ├── async-ats-scorer/     # Cron-driven background scoring
│   │   ├── enrich-experiences/   # AI experience enrichment
│   │   ├── linkedin-profile-ingest/ # LinkedIn HITL pre-save normalisation
│   │   └── ...                   # Other edge functions
│   └── migrations/               # PostgreSQL migration files (14-digit UTC timestamps)
│
├── tests/
│   └── unit/utils/               # Vitest unit tests for utility functions
│
├── scripts/
│   ├── ops/                      # Operational scripts: verify, logs, type-gen, hooks
│   └── playwright-linkedin/      # Standalone LinkedIn scraper (Node.js, deployed on Railway)
│
├── docs/
│   ├── architecture.md           # Architecture baseline (source of truth)
│   ├── decisions/                # ADRs
│   ├── runbooks/                 # Operational runbooks
│   ├── improvements/             # Technical improvement backlog
│   ├── bugs/                     # Bug reports and incident docs
│   ├── changelog/                # CHANGELOG.md + SATS_CHANGES.txt
│   ├── specs/                    # Product specs per phase
│   ├── sessions/                 # Codex session checkpoints
│   └── releases/                 # Release readiness tracker
│
├── plans/                        # Active feature/implementation plans
│   └── archive/                  # Completed plans
│
├── CLAUDE.md                     # Claude Code operating rules
├── AGENTS.md                     # Codex operating rules
├── README.md                     # Project overview + developer quickstart
├── package.json
├── vite.config.ts
└── vitest.config.ts
```

---

## 3. Docker Files and Their Purpose

```
smartats-sats/
├── Dockerfile                    # Multi-stage production build
│   │                             #   Stage 1: node:20-alpine — npm ci + vite build
│   │                             #   Stage 2: nginx:alpine — serves /dist on port 80
├── Dockerfile.dev                # Development image with Vite hot-reload on port 8080
├── docker-compose.yml            # Orchestrates two profiles:
│   │                             #   smartats-app  (production, port 3000)
│   │                             #   smartats-dev  (hot-reload, port 8080)
│
└── scripts/playwright-linkedin/
    ├── Dockerfile                # Standalone scraper image (Node.js + Playwright + Chromium)
    ├── package.json              # Scraper-only dependencies
    ├── tsconfig.json             # Scraper TypeScript config
    └── src/
        ├── scraper.ts            # LinkedIn profile scraper (Playwright)
        └── server.ts             # HTTP server wrapping the scraper
```

**How to run:**

```bash
# Development (hot-reload)
docker compose --profile dev up smartats-dev --build
# → http://localhost:8080

# Production preview
docker compose up smartats-app --build
# → http://localhost:3000

# LinkedIn scraper (local test)
cd scripts/playwright-linkedin && npm install && npm run dev
```

---

## 4. Mac Organisation Recommendations

### Recommendation 1 — Move the Repo Out of OneDrive ~~(HIGH PRIORITY)~~ ✅ COMPLETED 2026-03-27

**New path:** `~/Developer/eIT/Git_Projects/smartats-sats` (local, outside OneDrive)

**Original path (archived):** `/Users/ricardorivero/Library/CloudStorage/OneDrive-Personal/eIT/Git_Projects/smartats-sats`

**Risk:** OneDrive continuously syncs `node_modules/` (~150,000 files, ~500 MB) on every `npm install`. This causes:

- Persistent high CPU from `cloudd` and `OneDrive` processes
- Upload/download loops on every dependency change
- Potential git index corruption from mid-sync file modifications
- Slow `git status` and `git add` due to inode churn from OneDrive metadata writes

**Fix:** Move to a path outside OneDrive:

```bash
# 1. Copy the repo
cp -R "/Users/ricardorivero/Library/CloudStorage/OneDrive-Personal/eIT/Git_Projects/smartats-sats" \
      "$HOME/Dev/smartats-sats"

# 2. Verify git history is intact
cd ~/Dev/smartats-sats && git log --oneline -5

# 3. Re-point remote if needed (it is already set, no change needed)
git remote -v

# 4. Update your terminal bookmarks / IDE workspace paths

# 5. Delete the OneDrive copy after verifying the new location is correct
```

**Recommended dev folder structure:**

```
~/Dev/
├── smartats-sats/        ← this repo
├── other-project/
└── ...
```

---

### Recommendation 2 — Tighten `.gitignore` to Protect Against Accidental Commits

Review and confirm the root `.gitignore` covers:

```
# Dependencies
node_modules/
dist/
.vite/

# Logs
*.log
scripts/ops/logs/

# Local env
.env
.env.local
.env.*.local

# DB / data dumps
db_restore/
*.sql.bak

# macOS system files
.DS_Store
.AppleDouble
.LSOverride

# IDE
.vscode/settings.json
.idea/
```

Also add a `scripts/playwright-linkedin/.railwayignore` (needed for Railway deploys — see `docs/bugs/bug-railway-up-path-as-root-timeout.md`):

```
node_modules/
dist/
*.log
.env
```

---

### Recommendation 3 — Remove or Archive Stray Files

The following files have been observed in the repo tree and should be cleaned up:

| File                                    | Action                                                                                            |
| --------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/App.tsx.1`                         | Delete — likely an accidental backup created by an editor                                         |
| `Documents/` (if present at repo root)  | Delete or move outside the repo                                                                   |
| `db_restore/` (if present)              | Move outside the repo, or add to `.gitignore` and delete locally                                  |
| Any `*.log` files committed to git      | Remove with `git rm --cached` and add pattern to `.gitignore`                                     |
| `requirements.txt` (if present at root) | Verify if it belongs — this is a Node.js project; a Python requirements file here is likely stale |

```bash
# Find stray backup files
find . -name "*.1" -o -name "*.bak" -o -name "*.orig" | grep -v node_modules | grep -v .git

# Find committed log files
git ls-files | grep "\.log$"

# Remove a committed file from git without deleting locally
git rm --cached path/to/file
```

---

### Recommendation 4 — Consolidate `scripts/` Layout

Current state has some scripts outside `scripts/ops/`:

| Current location             | Recommended location                                |
| ---------------------------- | --------------------------------------------------- |
| `scripts/checkpoint.sh`      | `scripts/ops/checkpoint.sh`                         |
| `scripts/enriched_check.sql` | `scripts/ops/enriched_check.sql` or `docs/queries/` |

All operational automation should live under `scripts/ops/` for consistency with the P6 SDLC baseline (see `docs/decisions/`).

```bash
git mv scripts/checkpoint.sh scripts/ops/checkpoint.sh
git mv scripts/enriched_check.sql scripts/ops/enriched_check.sql
```

---

### Recommendation 5 — Configure OneDrive to Exclude the Dev Folder

If you must keep git repos inside OneDrive for backup purposes (not recommended for active dev), configure OneDrive to exclude `node_modules/` at the folder level using macOS:

```bash
# Mark node_modules as excluded from OneDrive sync
# (This uses the com.microsoft.OneDrive.FileSyncShell xattr)
xattr -w com.microsoft.OneDrive.ClientExclude 1 \
  "/Users/ricardorivero/Library/CloudStorage/OneDrive-Personal/eIT/Git_Projects/smartats-sats/node_modules"
```

However, the cleanest solution remains moving the repo to `~/Dev/` (Recommendation 1).

---

### Recommendation 6 — Install the Pre-Commit Hook on Every Dev Machine

The `check-update-log.sh` pre-commit hook was added in this session to enforce the UPDATE LOG convention. It must be installed manually on each machine:

```bash
# From repo root
bash scripts/ops/install-hooks.sh
```

This writes `.git/hooks/pre-commit` pointing to `scripts/ops/check-update-log.sh`. The `.git/` directory is not synced by git, so this step is required on each clone/machine.

---

## 5. Summary Table — Mac Organisation

| Area                 | Current State                             | Recommended State                                 |
| -------------------- | ----------------------------------------- | ------------------------------------------------- |
| Repo location        | Inside OneDrive sync path                 | `~/Dev/smartats-sats/`                            |
| `node_modules/` sync | Continuously synced by OneDrive           | Excluded via `.gitignore` + OneDrive exclude      |
| Stray files          | `App.tsx.1`, possible `db_restore/`       | Deleted or archived                               |
| Scripts layout       | Some scripts at `scripts/` root           | All ops scripts under `scripts/ops/`              |
| Pre-commit hook      | Installed per-machine manually            | `bash scripts/ops/install-hooks.sh` on each clone |
| `.railwayignore`     | Missing in `scripts/playwright-linkedin/` | Add to fix Railway deploy timeout                 |

---

## 6. Multi-Language (i18n) Readiness

**Status: NOT READY — Zero i18n infrastructure**

### What is missing

No i18n library is installed. `package.json` has no reference to `react-i18next`, `i18next`, `react-intl`, `FormatJS`, or any translation library. Every UI string — button labels, error messages, modal titles, tab names, validation text — is hardcoded in English throughout the component tree.

Representative examples of hardcoded strings:

- `src/components/ATSDebugModal.tsx` lines 104–109: tab labels ("Overview", "Content", "Prompts", "AI Response", "Tokens", "Errors")
- `src/components/EnrichExperienceModal.tsx` lines 88–116: tone mode descriptions and replacement phrases
- `src/components/JobDescriptionModal.tsx` lines 43–45: threshold description text

### What is already locale-aware (good foundation)

- `date-fns` (`^3.6.0`) is present and used for date formatting (`ATSDebugModal.tsx:141`, `ATSAnalysisProgress.tsx:199`)
- `.toLocaleString()` / `.toLocaleDateString()` used for number and date display in several components

### What needs to happen before multi-language support

1. Install `react-i18next` (or equivalent).
2. Extract every hardcoded UI string into language files (`public/locales/en/translation.json`, etc.).
3. Replace string literals in components with `t('key')` calls.
4. Pass a locale to `date-fns` `format()` for locale-aware date rendering.
5. Add a language switcher to Settings.

This is a significant but mechanical refactor — no architectural changes needed, only string extraction.

---

## 7. Multi-User Readiness

**Status: READY — with one gap (no API quotas)**

### Data isolation — solid

All user-owned tables enforce Row-Level Security with `auth.uid() = user_id` on both `USING` and `WITH CHECK` clauses:

| Table                       | Migration                  | Policy                                                |
| --------------------------- | -------------------------- | ----------------------------------------------------- |
| `sats_resumes`              | `20250912124811_*.sql:131` | `USING (auth.uid() = user_id)`                        |
| `sats_job_descriptions`     | `20250912124811_*.sql:138` | `USING (auth.uid() = user_id)`                        |
| `sats_analyses`             | `20250912124811_*.sql:145` | `USING (auth.uid() = user_id)`                        |
| `sats_user_skills`          | `20250912124811_*.sql:152` | `USING (auth.uid() = user_id)`                        |
| `sats_skill_experiences`    | `20250912124811_*.sql:159` | `USING (auth.uid() = user_id)`                        |
| `sats_enriched_experiences` | `20260221005421_*.sql:14`  | `USING (auth.uid() = user_id AND deleted_at IS NULL)` |

Shared lookup tables (`sats_companies`, `sats_locations`) correctly allow authenticated read-all — `FOR SELECT TO authenticated USING (true)` — which is intentional and correct.

### Query-layer filtering — correct

All TanStack Query hooks filter by `user.id` and are gated behind `!!user`:

- `useJobDescriptions.ts:92` — `.eq('user_id', user.id)`
- `useDirectATSAnalysis.ts:33` — `user_id: user.id`

### Authentication and roles — implemented

- `src/contexts/AuthContext.tsx` — `SATSUser` interface with `role: 'user' | 'admin'`
- `src/hooks/useUserRole.ts` — admin check via `supabase.rpc('has_role', { _user_id, _role: 'admin' })`
- Admin route is gated in the UI

### Account deletion — comprehensive

`20260221005421_*.sql` soft-delete cascade covers all user-owned tables. `soft_delete_user()` RPC validates ownership before operating (`IF auth.uid() != target_user_id THEN RAISE EXCEPTION`).

### Gap — no per-user API quotas

Rate limiting exists only for internal debug logging (`src/lib/centralizedLogger.ts:297–316`). There are no per-user limits on:

- ATS analysis requests
- Experience enrichment requests
- LinkedIn profile ingestion

**Risk:** At scale, a single user can trigger unlimited OpenAI calls, incurring unbounded cost. A bad actor could exhaust the project's API budget.

**Recommended fix:** Add a daily-limit check in each edge function (or a shared middleware) before calling `callLLM()`:

```sql
-- Example: max 20 analyses per user per day
SELECT COUNT(*) FROM sats_analyses
WHERE user_id = auth.uid()
  AND created_at >= NOW() - INTERVAL '1 day'
```

Return HTTP `429 Too Many Requests` if the limit is exceeded.

### Multi-user readiness summary

| Layer                      | Status | Notes                                 |
| -------------------------- | ------ | ------------------------------------- |
| RLS on user-owned tables   | ✅     | All tables, `WITH CHECK` enforced     |
| Shared lookup tables       | ✅     | Correctly open to authenticated reads |
| Query-layer user filtering | ✅     | All hooks filter by `user.id`         |
| Authentication             | ✅     | Supabase Auth + `SATSUser` model      |
| Admin role separation      | ✅     | `has_role()` RPC, route-gated         |
| Account deletion cascade   | ✅     | Covers all user-owned tables          |
| Edge function CORS         | ✅     | `SATS_ALLOWED_ORIGINS` allowlist      |
| Per-user API quotas        | ❌     | Not implemented — abuse/cost risk     |
