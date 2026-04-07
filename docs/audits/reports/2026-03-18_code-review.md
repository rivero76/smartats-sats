# Code Review Findings — 2026-03-18

<!--
  Source: Periodic code audit using docs/audits/code-review-prompt.md
  Branch: p14
  Product stage: Beta (phases P13–P18 active)
  Overall maturity score: 65/100
  Next review due: after P16 merges to main (~3-5 phases)
-->

---

## Summary

| Dimension            | Critical | Major  | Minor  | Open   |
| -------------------- | -------- | ------ | ------ | ------ |
| 1. Hard-coded values | 1        | 2      | 5      | 7      |
| 2. Naming standards  | 0        | 1      | 3      | 4      |
| 3. Help pages        | 0        | 4      | 0      | 4      |
| 4. SDLC practices    | 1        | 5      | 2      | 8      |
| **Total**            | **2**    | **12** | **10** | **23** |

---

## DIMENSION 1 — Hard-Coded Values

### CR1-1 · `async-ats-scorer` returns HTTP 500 for config errors

**Severity:** CRITICAL
**File:** `supabase/functions/async-ats-scorer/index.ts:425`
**Rule:** CLAUDE.md §3.2 — config errors must return `503`, not `500`.
**Fix:** Change `status: 500` → `status: 503` on the config validation error response. This allows clients to distinguish "misconfigured service" from "transient server error" and enables proper retry logic.

---

### CR1-2 · `DEFAULT_ALLOWED_ORIGINS` duplicated across 9 edge functions

**Severity:** MAJOR
**Files:** `supabase/functions/cors.ts` + 8 other function `index.ts` files
**Fix:** Add a `DEFAULT_ALLOWED_ORIGINS` constant to `supabase/functions/_shared/cors.ts` and import it in every function. Any production origin update currently requires touching 9 files.

---

### CR1-3 · Proactive match threshold `0.6` is a magic number

**Severity:** MAJOR
**File:** `supabase/functions/async-ats-scorer/index.ts:424,438,487`
**Fix:** Extract to `const DEFAULT_PROACTIVE_MATCH_THRESHOLD = 0.6` with a JSDoc comment explaining it is the minimum ATS score for triggering a user notification. Make it overridable via env var `SATS_PROACTIVE_MATCH_THRESHOLD`.

---

### CR1-4 · Skill fuzzy-dedup threshold `0.86` is a magic number

**Severity:** MINOR
**File:** `src/utils/linkedinImportMerge.ts:178`
**Fix:** Extract to `const SKILL_FUZZY_MATCH_THRESHOLD = 0.86` with a comment: "Levenshtein similarity cutoff — scores >= 0.86 are treated as the same skill to avoid near-duplicate entries (e.g. 'JavaScript' vs 'Javascript')."

---

### CR1-5 · Auto-apply confidence cutoff `0.78` is a magic number

**Severity:** MINOR
**File:** `src/components/JobDescriptionModal.tsx`
**Fix:** Extract to `const AUTO_APPLY_CONFIDENCE_THRESHOLD = 0.78` in `src/lib/constants.ts`.

---

### CR1-6 · Job extraction confidence weights `0.4, 0.35, 0.25` are undocumented

**Severity:** MINOR
**File:** `src/utils/contentExtraction.ts:54-56`
**Fix:** Add a block comment above the formula explaining the weighted scoring logic: title confidence (40%), company confidence (35%), location confidence (25%). Consider extracting weights to a named constant object.

---

### CR1-7 · ATS determinism seed `42` and temp `0` lack rationale comments

**Severity:** MINOR
**File:** `supabase/functions/ats-analysis-direct/index.ts:31-34`
**Fix:** Add inline comment: `// seed=42 + temperature=0 ensures deterministic output for regression testing and user-trust; same resume+JD pair always yields the same score.`

---

## DIMENSION 2 — Naming Standards

### CR2-1 · `SATS_analyses` (uppercase) coexists with `sats_analyses` (lowercase)

**Severity:** MAJOR
**Location:** Multiple migration files and edge function queries
**Risk:** FK constraints or RLS policies referencing the wrong name silently produce access errors or broken joins. This is already causing confusion in the codebase.
**Fix:** Audit all FK and RLS policy references. Decide canonical form (`sats_analyses` lowercase). Create migration to rename `SATS_analyses` if safe, or formally document it as a legacy exception in `docs/conventions/coding-conventions.md` with a "do not create new FKs to the UPPERCASE variant" note.

---

### CR2-2 · `src/utils/contentExtraction.ts` is not kebab-case

**Severity:** MINOR
**Fix:** Rename to `content-extraction.ts` and update all imports. (`camelCase` is only for hooks; utility files in `src/utils/` must be kebab-case per CLAUDE.md.)

---

### CR2-3 · `src/utils/linkedinImportMerge.ts` is not kebab-case

**Severity:** MINOR
**Fix:** Rename to `linkedin-import-merge.ts` and update all imports.

---

### CR2-4 · `ALLOWED_ORIGINS` env var is not `SATS_`-prefixed

**Severity:** MINOR
**File:** All edge functions reading `Deno.env.get('ALLOWED_ORIGINS')`
**Fix:** Rename to `SATS_ALLOWED_ORIGINS` in env var documentation and all function reads. This aligns with the `SATS_<NOUN>` pattern for global config.

---

## DIMENSION 3 — Help Pages

### CR3-1 · LinkedIn Profile Import has no help topic

**Severity:** MAJOR
**Feature:** P13 Stories 1-2 (backend + merge layer complete); Story 3 HITL Review UI exists in code
**Missing topic key:** `linkedinProfileImport`
**Minimum content:**

- Overview: "Import your LinkedIn profile to automatically populate your skills and experience. SmartATS matches imported data against your existing records and lets you review before saving."
- Steps: (1) Go to Profile Settings, (2) Enter your LinkedIn profile URL, (3) SmartATS fetches and parses your profile, (4) Review suggested additions in the confirmation modal, (5) Approve or reject each item.
- Tip: "Importing your LinkedIn profile works best when your profile is public. Private profiles may return partial results."

---

### CR3-2 · Resume Personas has no help topic

**Severity:** MAJOR
**Feature:** P16 Story 1 — `PersonaManager` component, `sats_resume_personas` table
**Missing topic key:** `resumePersonas`
**Minimum content:**

- Overview: "Personas let you maintain separate resume profiles for different role types (e.g. 'Engineering Manager' vs 'Senior Engineer'). Each ATS analysis runs against the active persona."
- Steps: (1) Go to Profile Settings → Personas, (2) Create a persona with a name and role focus, (3) Upload or select the resume for that persona, (4) Activate a persona before running ATS analysis.
- Tip: "Use personas to prevent your 'Management' resume from skewing scores when applying to individual contributor roles."

---

### CR3-3 · Admin Logging Panel has no help topic

**Severity:** MAJOR
**Feature:** `src/components/admin/LoggingControlPanel.tsx`, `LogViewer.tsx`
**Missing topic key:** `adminLogging`
**Minimum content:**

- Overview: "The Admin Logging Panel lets authorized users view application logs, control logging levels per script, and manage log retention."
- Steps: (1) Go to Admin → Logging Control, (2) Use the Log Viewer to filter by level and time window, (3) Toggle logging on/off per script in the control panel, (4) Set retention policies to manage storage.
- Tip: "Set the default view to ERROR + Last 1 hour for fast incident triage."

---

### CR3-4 · Account Deletion Workflow has no help topic

**Severity:** MAJOR
**Feature:** `supabase/functions/delete-account`, `cancel-account-deletion`
**Missing topic key:** `accountDeletion`
**Minimum content:**

- Overview: "You can request permanent deletion of your SmartATS account and all associated data. Deletion is processed within 30 days and cannot be undone."
- Steps: (1) Go to Profile Settings → Account, (2) Click 'Delete Account', (3) Confirm with your password, (4) A deletion request is queued, (5) To cancel, return to Account Settings within the 30-day window.
- Tip: "Export your ATS analysis history before requesting deletion — data cannot be recovered after the window closes."

---

## DIMENSION 4 — SDLC Practices

### CR4-1 · 60% of `src/` files are missing mandatory UPDATE LOG headers

**Severity:** CRITICAL (process enforcement gap)
**Scope:** ~45 of ~75 sampled TypeScript files in `src/` — including pages, hooks, and components — have no UPDATE LOG block.
**Rule:** CLAUDE.md §6.2 — every created or modified TS/JS/SQL/HTML file must have an UPDATE LOG at the top.
**Fix (immediate):** Add a pre-commit hook at `scripts/ops/check-update-log.sh` that rejects commits to `src/`, `supabase/functions/`, or `supabase/migrations/` where the modified file lacks an UPDATE LOG in its first 20 lines. See enforcement section below.

---

### CR4-2 · `job-description-url-ingest` has zero UPDATE LOG entries

**Severity:** MAJOR
**File:** `supabase/functions/job-description-url-ingest/index.ts`
**Fix:** Add UPDATE LOG header. Codex/implementation agent must add it on next edit.

---

### CR4-3 · Missing ADR: Two-call isolation for CV Optimisation (P18)

**Severity:** MAJOR
**Decision:** P18 uses two separate LLM calls (ATS score + CV Optimisation projection) specifically to prevent contamination between the base score and the enrichment projection. This is a significant architectural choice.
**Fix:** Create `docs/decisions/adr-0003-two-call-ats-cv-optimisation-isolation.md`. Content should explain: why a single combined call was rejected, what contamination risk means in this context, and how the two-call pattern is enforced.

---

### CR4-4 · Missing ADR: Async-scorer vs direct-analysis dual paths

**Severity:** MAJOR
**Decision:** Two separate code paths exist for ATS scoring (`async-ats-scorer` cron-triggered vs `ats-analysis-direct` user-triggered). No document explains when each is used, why both exist, or the intended long-term direction.
**Fix:** Create `docs/decisions/adr-0004-async-vs-direct-ats-scoring.md`.

---

### CR4-5 · Missing ADR: Skill dedup / Levenshtein fuzzy matching strategy

**Severity:** MAJOR
**Decision:** The 0.86 Levenshtein threshold for skill deduplication was chosen without a documented rationale. No comparison to alternatives (exact match, phonetic, embedding similarity) exists.
**Fix:** Create `docs/decisions/adr-0005-skill-dedup-fuzzy-matching.md`.

---

### CR4-6 · Missing ADR: RLS-first tenant isolation model (P8)

**Severity:** MAJOR
**Decision:** All multi-tenant isolation is enforced at the RLS layer, not the application layer. This is a deliberate security architecture choice.
**Fix:** Create `docs/decisions/adr-0006-rls-first-tenant-isolation.md` covering: why application-layer isolation was rejected, how RLS WITH CHECK enforces ownership, and the P8 migration evidence.

---

### CR4-7 · `async-ats-scorer` and `job-description-url-ingest` missing env validation

**Severity:** MAJOR
**Rule:** CLAUDE.md §3.2 — validate env vars at function top, return 503 for misconfiguration.
**Fix:**

- `async-ats-scorer/index.ts:425` — change `500` to `503`
- `job-description-url-ingest/index.ts` — add explicit env var validation block at top of handler with `503` response on missing config

---

### CR4-8 · Architecture.md does not reflect P18, P16 career-fit flow, or P14 async pipeline

**Severity:** MINOR
**File:** `docs/architecture.md` (last updated 2026-03-01)
**Fix:** Add sections for: (1) P18 CV Optimisation two-call pattern, (2) P16 Resume Personas + Career Fit flow, (3) P14 async proactive scoring pipeline. Assign architecture doc update as part of each phase's Definition of Done going forward.

---

### CR4-9 · Inline comments sparse in hooks and components

**Severity:** MINOR
**Scope:** Most hooks in `src/hooks/` have 1-2 comments per 100 LOC. Complex logic like the enrichment suggestion flow, LinkedIn merge fingerprinting, and ATS retry logic has no "why" comments.
**Fix:** When editing these files, add a comment above non-obvious logic blocks explaining the intent, not just the mechanism.

---

## Enforcement Recommendations

### Pre-commit hook: enforce UPDATE LOG

Add `scripts/ops/check-update-log.sh`:

```bash
#!/bin/bash
# Reject commits to src/, supabase/functions/, supabase/migrations/
# if modified files lack UPDATE LOG header in first 20 lines.
for file in $(git diff --cached --name-only --diff-filter=ACM); do
  if [[ "$file" =~ ^(src|supabase/functions|supabase/migrations)/ ]]; then
    if ! head -20 "$file" | grep -qE "UPDATE LOG|-- UPDATE LOG|<!-- UPDATE LOG"; then
      echo "ERROR: Missing UPDATE LOG header in $file"
      exit 1
    fi
  fi
done
```

### PR template: enforce help topic parity

Add to `.github/PULL_REQUEST_TEMPLATE.md`:

```
## Checklist
- [ ] UPDATE LOG header added/updated in all modified files
- [ ] `helpContent.ts` updated, OR this PR contains no user-facing feature changes (explain: ___)
- [ ] `docs/changelog/CHANGELOG.md` and `SATS_CHANGES.txt` updated
- [ ] ADR created if this PR makes a non-trivial architectural decision
```

### Quality gate enhancement

Add to `.github/workflows/quality-gates.yml` a docs-parity step:

- If any file in `src/components/` or `supabase/functions/` is added → require `helpContent.ts` to be modified in the same PR, or require a `[skip-help]` comment in the PR body with justification.

---

## Prioritized Action List

### Immediate (this sprint)

| ID    | Fix                                                  | Effort | Status                                                                                                                                                                                                                                                                                                              |
| ----- | ---------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CR1-1 | `async-ats-scorer` 500 → 503                         | 5 min  | **Done 2026-03-18**                                                                                                                                                                                                                                                                                                 |
| CR4-1 | Add `check-update-log.sh` pre-commit hook            | 2 hrs  | **Done 2026-03-18** — `scripts/ops/check-update-log.sh` + `install-hooks.sh`; CI step added (non-blocking until existing debt cleared)                                                                                                                                                                              |
| CR2-1 | Audit `SATS_analyses` vs `sats_analyses` FK/RLS refs | 2 hrs  | **Resolved 2026-03-18 — no action needed.** PostgreSQL normalizes unquoted identifiers to lowercase; `CREATE TABLE public.SATS_analyses` creates a table named `sats_analyses` at the DB level. Generated `types.ts` confirms only `sats_analyses` exists. The uppercase in early migration files is cosmetic only. |

### Short-term (next 1-2 sprints)

| ID    | Fix                                                       | Effort | Status                                                                                                                                                                                                             |
| ----- | --------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CR3-1 | Add `linkedinProfileImport` help topic                    | 1 hr   | **Done 2026-03-18**                                                                                                                                                                                                |
| CR3-2 | Add `resumePersonas` help topic                           | 1 hr   | **Done 2026-03-18**                                                                                                                                                                                                |
| CR3-3 | Add `adminLogging` help topic                             | 30 min | **Done 2026-03-18**                                                                                                                                                                                                |
| CR3-4 | Add `accountDeletion` help topic                          | 30 min | **Done 2026-03-18**                                                                                                                                                                                                |
| CR1-2 | Centralize `DEFAULT_ALLOWED_ORIGINS` in `_shared/cors.ts` | 1 hr   | **Done 2026-03-18** — replaced inline CORS block in 6 functions with `import { isOriginAllowed, buildCorsHeaders } from '../_shared/cors.ts'`; also fixed CR4-2 (UPDATE LOG added to `job-description-url-ingest`) |
| CR4-3 | ADR: two-call CV Optimisation isolation                   | 1 hr   | **Done 2026-03-18** — `docs/decisions/adr-0003-two-call-ats-cv-optimisation-isolation.md`                                                                                                                          |
| CR4-4 | ADR: async vs direct ATS scoring                          | 1 hr   | **Done 2026-03-18** — `docs/decisions/adr-0004-async-vs-direct-ats-scoring.md`                                                                                                                                     |

### Backlog

| ID           | Fix                                               | Effort  |
| ------------ | ------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CR1-3–CR1-7  | Extract threshold constants + rationale comments  | 2 hrs   | **Done 2026-03-18**                                                                                                                                                                                                                                                                                            |
| CR2-2, CR2-3 | Rename kebab-case utils files                     | 30 min  | **Done 2026-03-18** — `contentExtraction.ts` → `content-extraction.ts`; `linkedinImportMerge.ts` → `linkedin-import-merge.ts`; all imports updated                                                                                                                                                             |
| CR2-4        | Rename `ALLOWED_ORIGINS` → `SATS_ALLOWED_ORIGINS` | 30 min  | **Done 2026-03-18** — `_shared/cors.ts` reads `SATS_ALLOWED_ORIGINS` with fallback to `ALLOWED_ORIGINS`; `.env.example` and `CLAUDE.md` updated                                                                                                                                                                |
| CR4-5, CR4-6 | ADRs: skill dedup, RLS tenant isolation           | 2 hrs   | **Done 2026-03-18** — `adr-0005-skill-dedup-fuzzy-matching.md`; `adr-0006-rls-first-tenant-isolation.md`                                                                                                                                                                                                       |
| CR4-8        | Update `docs/architecture.md` for P18/P16/P14     | 2 hrs   | **Done 2026-03-18** — Added P14 proactive matching flow, P16 Resume Personas flow, P18 two-call CV Optimisation; expanded LLM schemas table; added ADR links                                                                                                                                                   |
| CR4-9        | Inline comments in hooks/components               | Ongoing | **Done 2026-03-18** — Added "why" comments to: real-time+polling dual strategy (`useATSAnalyses`), N+1 user fetch rationale, retry reset-then-reinvoke pattern (`useRetryATSAnalysis`), edge function error body parsing (`useEnrichedExperiences`), PostgREST FK join syntax (`useLinkedinImportPreparation`) |
