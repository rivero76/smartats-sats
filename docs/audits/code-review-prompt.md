# SmartATS — Periodic Code Review Prompt

<!--
  PURPOSE: Paste this prompt into Claude Code to run a full quality audit.
  FREQUENCY: Run after every 3-5 phases, or before any major release.
  LAST RUN: 2026-03-18 — findings saved in docs/improvements/CODE-REVIEW-2026-03-18.md
  HOW TO RUN: Open this repo in Claude Code and paste the prompt below.
-->

---

## How to Run

1. Open this repository in Claude Code.
2. Copy everything inside the `--- PROMPT START ---` / `--- PROMPT END ---` block.
3. Paste it as a new message in Claude Code.
4. Save the findings report as `docs/improvements/CODE-REVIEW-YYYY-MM-DD.md`.
5. Update the `LAST RUN` date above.

---

--- PROMPT START ---

Perform a thorough code audit of this codebase across four quality dimensions.
Be exhaustive — read actual files, don't guess. Return a structured findings report.

---

## DIMENSION 1 — Hard-Coded Values

Search for magic strings/numbers in `src/` and `supabase/functions/`:
- Score/confidence thresholds (e.g. `0.6`, `0.78`, `0.86`)
- Model names, API endpoint URLs, bucket names, table names used as literals
- Token limits, temperature values, retry counts with no explanatory comment
- Repeated string/number literals that belong in a named constant or env var
- Check `supabase/functions/_shared/llmProvider.ts` for pricing tables and model lists
- Compare what is used via `import.meta.env` vs `process.env` vs hardcoded in `.env`

For each finding, report:
- File path + line number
- Current value
- Recommended fix (named constant, env var, or comment explaining rationale)
- Severity: CRITICAL / MAJOR / MINOR

---

## DIMENSION 2 — Naming Standards

Read `CLAUDE.md` and `docs/conventions/coding-conventions.md` first, then audit:

**File names in `src/`:**
- Components must be `PascalCase.tsx`
- Hooks must be `camelCase` with `use` prefix
- All other files must be `kebab-case`

**Database table names in `supabase/migrations/`:**
- New tables: `sats_<noun_plural>` (lowercase snake_case)
- Documented legacy exceptions (do NOT rename): `SATS_resumes`, `document_extractions`, `error_logs`, `profiles`
- Flag any inconsistency between old and new naming for the same logical table (e.g. `SATS_analyses` vs `sats_analyses`)

**Environment variables:**
- Global config: `SATS_<NOUN>`
- Task-specific model: `OPENAI_MODEL_<TASK>`
- Feature flags: `SATS_<FEATURE>_ENABLED`
- Storage flags: `STORE_LLM_<NOUN>`
- Flag any vars that don't follow these patterns

**Migration file names:** must be `YYYYMMDDHHMMSS_<description>.sql`
**Edge function folders:** must be `kebab-case`

List ALL violations with file path and recommended rename.

---

## DIMENSION 3 — Help Pages vs Implemented Features

**Step 1:** Read `src/data/helpContent.ts` — list every topic currently documented.

**Step 2:** Read these files to understand what features exist:
- `docs/changelog/CHANGELOG.md` (recent additions)
- `docs/changelog/SATS_CHANGES.txt`
- `docs/releases/UNTESTED_IMPLEMENTATIONS.md` (features code-complete but E2E-pending)
- `docs/decisions/product-roadmap.md` (phase status)

**Step 3:** Audit every shipped feature (even E2E-pending ones) against the help topics.

For each **gap** (feature exists, no help topic), report:
- Feature name and phase
- Help topic key that should be created
- Minimum content needed: overview (2-3 sentences), step-by-step guide (3-5 steps), at least one tip

**Also answer:** Is `HelpHub.tsx` rendering all topics from `helpContent.ts`? Are any topics defined but not linked in the UI?

---

## DIMENSION 4 — SDLC Best Practices

**4A — UPDATE LOG headers (mandatory per CLAUDE.md):**
- Sample 20+ files across `src/`, `supabase/functions/`, `supabase/migrations/`
- Report: what % have UPDATE LOG? Which files are missing it?

**4B — Inline comments:**
- Check core business logic files (ATS scoring, enrichment, LinkedIn merge, contentExtraction)
- Report: are the *why* decisions commented, or only the *what*?
- Flag any complex algorithm or threshold with no rationale comment

**4C — ADR coverage:**
- List all ADRs in `docs/decisions/`
- Identify major technical decisions in the code that have NO corresponding ADR:
  - LLM call patterns, RLS policy model, async vs direct scoring, skill dedup strategy
  - For each missing ADR, write a one-paragraph description of the decision that needs recording

**4D — Edge function error handling (rules from CLAUDE.md §3.2):**
- Config errors must return HTTP `503` (not `500`)
- Never forward raw provider payloads — use `mapProviderError()`
- All `logEvent()` / centralized-logging calls must be wrapped in `try/catch`
- Check every function in `supabase/functions/` and report violations

**4E — Product maturity alignment (AWS Well-Architected Framework):**
At the current Beta stage, assess each pillar:
- Operational Excellence: logging, runbooks, CI/CD, deployment automation
- Security: RLS, CORS, secrets management, tenant isolation
- Reliability: error handling, retries, fallbacks, graceful degradation
- Performance Efficiency: model tiering, token management, async patterns
- Cost Optimization: pricing tracking, model selection, unnecessary calls
For each pillar: current state (one sentence) + top gap (one sentence) + one concrete fix.

---

## OUTPUT FORMAT

Return a structured report with:
1. One section per dimension
2. All findings with: file path + line number, severity (CRITICAL/MAJOR/MINOR), and a concrete 1-2 sentence fix
3. A summary table of all findings at the end
4. A prioritized action list: IMMEDIATE (this sprint) / SHORT-TERM (next 2 sprints) / BACKLOG

Save the output as: `docs/improvements/CODE-REVIEW-YYYY-MM-DD.md`
Update `docs/improvements/TECHNICAL_IMPROVEMENTS.md` summary table with new items.

--- PROMPT END ---
