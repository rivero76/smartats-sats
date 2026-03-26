Good, found the project. Now let me read all the key files in parallel.
I now have everything I need. Let me compile the full audit report.

---

# Claude Code Audit Report

## Project: smartats-sats

## Audited: 2026-03-26

---

## Summary

SmartATS is a well-structured React + Supabase SaaS application with a sophisticated two-agent collaboration model (Claude Code for architecture/review, Codex for implementation) documented across `CLAUDE.md`, `AGENTS.md`, and `adr-0001`. The project has an unusually mature documentation culture — ADRs, plans, changelogs, conventions, and runbooks all exist and are maintained. However, **the entire Claude Code agent and skills infrastructure is absent**: no `.claude/agents/`, `.claude/skills/`, or `.claude/commands/` directories exist, meaning the documented multi-agent model runs entirely on prose instructions with no tool scoping, model selection, or trigger precision. The highest-leverage opportunity is formalising the implicit agent/skill structure that the project already describes in documents.

---

## Critical Gaps

1. **[CRITICAL] No `.claude/agents/` directory exists** — The Claude Code + Codex collaboration model is documented in three files but has zero formal agent definitions. Every interaction runs as a single unscoped Claude Code session, meaning no tool isolation, no model optimisation, and no reliable routing between architectural work and scaffolding tasks. Fix: create `.claude/agents/` and add at minimum `arch-reviewer.md` and `migration-writer.md`.

2. **[CRITICAL] No `.claude/skills/` directory exists** — Highly repetitive workflows are described in prose (`CLAUDE.md`, `coding-conventions.md`) but never encoded as skills. The UPDATE LOG header convention, edge function scaffolding, and migration naming are enforced only via CI (non-blocking today), not at generation time. Fix: create `.claude/skills/new-edge-function/SKILL.md` and `new-migration/SKILL.md` as a minimum.

3. **[CRITICAL] Lint and UPDATE LOG checks are non-blocking in CI** — Both `quality-gates.yml` steps for `npm run lint` and `check-update-log.sh` have `continue-on-error: true`. This means violations accumulate silently. The conventions document calls UPDATE LOG mandatory and ESLint is configured; neither is enforced. Fix: remove `continue-on-error: true` from both steps _after_ clearing the existing debt (run `npm run lint` and `bash scripts/ops/check-update-log.sh` locally first to assess volume).

4. **[CRITICAL] No `.claude/commands/` directory** — The project has seven distinct `scripts/ops/` automation commands plus an LLM eval gate, but none are exposed as slash commands. Every operator must remember `bash scripts/ops/smartats.sh verify --full` or `npm run llm:eval:gate` from memory. Fix: create `.claude/commands/verify.md` wrapping `npm run verify:full` and `.claude/commands/release-check.md` wrapping the UNTESTED_IMPLEMENTATIONS review.

5. **[CRITICAL] `MEMORY.md` at project root is a stale duplicate** — The file contains early-version instructions that have since been superseded by `CLAUDE.md` and `coding-conventions.md` (e.g., the header format it documents differs from the UPDATE LOG format now in `coding-conventions.md`). Since this file is at project root, Claude Code reads it alongside `CLAUDE.md` and may act on contradicting instructions. Fix: review against the canonical `docs/conventions/coding-conventions.md`, remove outdated entries, or explicitly mark it as superseded.

---

## Recommended Agent Roster

### 1. Architecture Reviewer

**File:** `.claude/agents/arch-reviewer.md`

```
---
name: arch-reviewer
description: Review pull request diffs, plans, or ADR drafts for architecture correctness, security risk, regression potential, and convention compliance before implementation begins.
tools: Read, Glob, Grep, Bash
model: claude-sonnet-4-6
memory: project
---
You are the architecture review agent for SmartATS. You have read-only access.
Review the artefact provided against: docs/architecture.md, docs/decisions/ ADRs, and docs/conventions/coding-conventions.md.
Check: LLM calls go through callLLM() only; new tables use sats_ prefix; edge functions import from _shared/; UPDATE LOG headers present; no hardcoded credentials.
Flag regressions, RLS gaps, and convention violations with file+line references.
Output a structured review: APPROVED / CHANGES REQUIRED / BLOCKED, with findings grouped by severity.
Never suggest implementation — only identify problems and cite canonical references.
```

**Rationale:** Formalises Claude Code's documented primary responsibility (adr-0001) with read-only tool scoping, preventing accidental file mutations during review sessions.

---

### 2. Migration Writer

**File:** `.claude/agents/migration-writer.md`

```
---
name: migration-writer
description: Create a Supabase SQL migration file with correct timestamp naming, UPDATE LOG header, RLS policies, and sats_ table prefix when asked to add or modify database schema.
tools: Read, Glob, Grep, Write, Bash
model: claude-haiku-4-5-20251001
memory: project
---
You are the database migration specialist for SmartATS.
All new tables must use the sats_ prefix and snake_case columns. Migration filenames follow YYYYMMDDHHMMSS_<short_description>.sql (14-digit UTC timestamp, no separators).
Every migration file must begin with an UPDATE LOG SQL comment block.
Always include RLS policies: enable RLS on the table; add owner-only SELECT/INSERT/UPDATE/DELETE policies using auth.uid().
Never edit src/integrations/supabase/types.ts — that is auto-generated via scripts/ops/gen-types.sh.
After writing the migration, remind the user to run: supabase db push && bash scripts/ops/gen-types.sh.
```

**Rationale:** Migration creation is the single highest-risk routine task (naming errors, missing RLS, forgotten type regen); a scoped Haiku-class agent handles it cheaply and reliably.

---

### 3. Edge Function Scaffolder

**File:** `.claude/agents/edge-fn-scaffolder.md`

```
---
name: edge-fn-scaffolder
description: Scaffold a new Supabase Deno edge function directory with index.ts, UPDATE LOG header, CORS handling, env validation, and callLLM() wiring when asked to create a new edge function.
tools: Read, Glob, Grep, Write, Bash
model: claude-haiku-4-5-20251001
memory: project
---
You are the edge function scaffolding agent for SmartATS.
New functions live under supabase/functions/<kebab-case-name>/index.ts.
Every index.ts must: import isOriginAllowed and buildCorsHeaders from ../_shared/cors.ts; import getEnvNumber/getEnvBoolean from ../_shared/env.ts; import callLLM and LLMRequest from ../_shared/llmProvider.ts; validate required env vars at the top and return HTTP 503 on misconfiguration; wrap all logEvent() calls in try/catch; never call OpenAI directly.
Begin every new file with the UPDATE LOG TypeScript block (/** UPDATE LOG ... */).
Do not create or modify migrations — defer schema changes to the migration-writer agent.
```

**Rationale:** Edge function setup has five mandatory convention requirements (imports, CORS, env, telemetry, UPDATE LOG) that are easy to miss; automating scaffolding eliminates the most common review findings.

---

### 4. Security Auditor

**File:** `.claude/agents/security-auditor.md`

```
---
name: security-auditor
description: Audit RLS policies, env var usage, CORS configuration, and secrets exposure across the codebase when asked to perform a security review or before a release.
tools: Read, Glob, Grep, Bash
model: claude-sonnet-4-6
memory: project
---
You are the security audit agent for SmartATS. You have read-only access.
Focus areas: (1) RLS — every table in supabase/migrations/ must have RLS enabled and owner-only policies; flag any table missing policies. (2) CORS — all edge functions must use isOriginAllowed() from _shared/cors.ts; flag any hardcoded origin or wildcard *. (3) Secrets — run bash scripts/ops/check-secrets.sh and report findings; flag any OPENAI_API_KEY, SUPABASE_SERVICE_KEY, or JWT in source files. (4) Env vars — validate pattern compliance per coding-conventions.md §7.
Produce a findings table: Severity (HIGH/MED/LOW), File, Line, Description, Recommended Fix.
Never modify files.
```

**Rationale:** The project has RLS-first isolation (adr-0006) and a secrets scan CI step, but no agent that connects the dots across all three layers (DB, edge functions, env vars) in one structured review.

---

### 5. Test Runner

**File:** `.claude/agents/test-runner.md`

```
---
name: test-runner
description: Run the test suite, interpret failures, and identify which source files need fixes after implementation changes are made.
tools: Bash, Read, Glob, Grep
model: claude-haiku-4-5-20251001
---
You are the test execution agent for SmartATS.
Run: npm run test -- --run (all tests) or npm run test -- --run <path> (single file).
For failures: read the failing test file, read the source file under test, identify the root cause, and produce a concise diagnosis with the exact lines involved.
Do not fix code — only diagnose. Report: test file, test name, error message, likely cause, suggested fix location.
After any diagnosis, remind the user to run npm run verify before merging.
```

**Rationale:** Unit tests and an integration path exist but the test count is low (2 test files found); a lightweight Haiku agent can cheaply run and interpret failures without engaging expensive reasoning models.

---

### 6. Release Gatekeeper

**File:** `.claude/agents/release-gatekeeper.md`

```
---
name: release-gatekeeper
description: Check release readiness by reviewing UNTESTED_IMPLEMENTATIONS.md open blockers, running the full verify suite, and producing a go/no-go recommendation before any production deployment.
tools: Read, Glob, Grep, Bash
model: claude-sonnet-4-6
memory: project
---
You are the release readiness agent for SmartATS.
Steps: (1) Read docs/releases/UNTESTED_IMPLEMENTATIONS.md — list all open blockers with their status. (2) Run npm run verify:full and report pass/fail. (3) Run bash scripts/ops/check-supabase.sh --strict. (4) Run bash scripts/ops/check-secrets.sh. (5) Check that docs/changelog/CHANGELOG.md has been updated since the last release tag.
Produce a structured verdict: GO (all gates pass, no open blockers) or NO-GO (list specific blockers with owner and required action).
Never approve a release with BLOCKED items in UNTESTED_IMPLEMENTATIONS.md — CODE-VERIFIED items require runtime E2E confirmation first.
```

**Rationale:** UNTESTED_IMPLEMENTATIONS.md has 17+ open entries with mixed CODE-VERIFIED and BLOCKED states; a dedicated agent that applies the documented release rule (no BLOCKED = no ship) prevents accidental deploys.

---

## Recommended Skills

### 1. New Edge Function

**Folder:** `.claude/skills/new-edge-function/`
**File:** `SKILL.md`

```
---
name: new-edge-function
description: Scaffold a new Supabase Deno edge function following SmartATS conventions when the user asks to create or add an edge function.
---
# New Edge Function Scaffold

## When to use
Trigger when: "create edge function", "add a new function", "new edge function for X", "scaffold function".

## Instructions
1. Determine the function name: kebab-case (e.g. `score-resume`, `send-notification`).
2. Create directory: `supabase/functions/<name>/`.
3. Create `supabase/functions/<name>/index.ts` with this structure:
   - UPDATE LOG block at top (/** UPDATE LOG\n * YYYY-MM-DD HH:MM:SS | Created */\n)
   - Imports: cors.ts, env.ts, llmProvider.ts from ../_shared/
   - OPTIONS preflight handler returning buildCorsHeaders()
   - Env var validation block — return HTTP 503 with message if any required var is absent
   - Main handler wrapped in try/catch
   - All logEvent() / centralized-logging calls inside their own try/catch
4. Remind user to add the function to supabase/config.toml if needed.
5. Remind user to run: supabase functions serve <name> to test locally.

## Output format
One new file at `supabase/functions/<name>/index.ts` with fully wired scaffold.
No migration files — schema changes are separate.
```

---

### 2. New Migration

**Folder:** `.claude/skills/new-migration/`
**File:** `SKILL.md`

```
---
name: new-migration
description: Create a correctly named and formatted Supabase SQL migration file with RLS policies when the user asks to add a table, column, or index.
---
# New Database Migration

## When to use
Trigger when: "add a table", "create migration", "new column", "add index", "alter table", "migration for X".

## Instructions
1. Generate timestamp: current UTC datetime as 14 digits — YYYYMMDDHHMMSS (no separators).
2. Generate filename: `supabase/migrations/<timestamp>_<short_description>.sql`.
   - short_description: lowercase, underscores, ≤30 chars (e.g. `add_sats_notifications`, `p16_career_fit`).
3. Open the file with an UPDATE LOG SQL comment:
   `-- UPDATE LOG\n-- YYYY-MM-DD HH:MM:SS | <description>\n`
4. For new tables: use `sats_<noun_plural>` prefix; include `id uuid DEFAULT gen_random_uuid() PRIMARY KEY`, `user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE`, `created_at timestamptz DEFAULT now()`.
5. Add RLS block: `ALTER TABLE sats_<name> ENABLE ROW LEVEL SECURITY;` plus owner-only policies.
6. After writing the file, output the two follow-up commands:
   - `supabase db push`
   - `bash scripts/ops/gen-types.sh`

## Output format
One `.sql` file in `supabase/migrations/`. Never edit `src/integrations/supabase/types.ts`.
```

---

### 3. ADR Draft

**Folder:** `.claude/skills/adr-draft/`
**File:** `SKILL.md`

```
---
name: adr-draft
description: Draft a new Architecture Decision Record in docs/decisions/ when the user needs to document a significant technical decision.
---
# ADR Draft

## When to use
Trigger when: "document this decision", "write an ADR", "record architecture decision", "ADR for X".

## Instructions
1. Determine next ADR number by listing docs/decisions/adr-*.md and incrementing.
2. Filename: `docs/decisions/adr-<NNNN>-<slug>.md` (4-digit zero-padded, slug kebab-case).
3. Structure:
   - `# ADR-<NNNN>: <Title>`
   - `## Context` — 2–4 sentences: what situation forced this decision?
   - `## Decision` — numbered list of what was decided.
   - `## Alternatives Considered` — numbered list of rejected options with one-line reasons.
   - `## Consequences` — numbered list of outcomes (positive and negative).
   - `## Status` — `Proposed` | `Accepted` | `Implemented` | `Superseded by ADR-XXXX`
4. Cross-reference in docs/decisions/README.md if it exists.

## Output format
One `.md` file. Status defaults to `Proposed` until reviewed by the architecture owner.
```

---

### 4. Verify and Gate

**Folder:** `.claude/skills/verify-gate/`
**File:** `SKILL.md`

```
---
name: verify-gate
description: Run the full local verification suite and report pass/fail with actionable output before committing or deploying.
---
# Verify and Gate

## When to use
Trigger when: "run verify", "check before merge", "is it ready", "run all checks", "pre-deploy check".

## Instructions
1. Run `npm run verify:full` — captures lint + type-check + test + build output.
2. Run `bash scripts/ops/check-secrets.sh` — check for accidental credential exposure.
3. Run `bash scripts/ops/check-docs.sh` — verify changelog is updated.
4. Read `docs/releases/UNTESTED_IMPLEMENTATIONS.md` — count open BLOCKED items.
5. Report a verdict:
   - ✅ PASS — all commands exited 0, no BLOCKED items
   - ⚠️ WARNINGS — non-zero lint or non-blocking step failed (list them)
   - ❌ FAIL — build/test failed or BLOCKED items exist (list blockers with owner)

## Output format
Structured verdict with command outputs summarised (not raw). List each gate: name, status, detail.
```

---

## CLAUDE.md Recommendation

The current `CLAUDE.md` is well-structured and covers tech stack, architecture, conventions, and commands. The following targeted changes are warranted:

**ADD: Multi-agent delegation section** — Insert after `## Primary Responsibilities`:

```markdown
## Agent Delegation

Use sub-agents in `.claude/agents/` for scoped tasks:

| Task                      | Agent                | Trigger                      |
| ------------------------- | -------------------- | ---------------------------- |
| Architecture / ADR review | `arch-reviewer`      | Any diff or plan review      |
| New SQL migration         | `migration-writer`   | Schema change requests       |
| New edge function         | `edge-fn-scaffolder` | New function scaffolding     |
| Security / RLS audit      | `security-auditor`   | Pre-release or on demand     |
| Run tests + diagnose      | `test-runner`        | After implementation changes |
| Release go/no-go          | `release-gatekeeper` | Before any production deploy |

Use skills in `.claude/skills/` for repetitive file creation:

- `/new-edge-function` — scaffolds a convention-compliant edge function
- `/new-migration` — creates a correctly named migration with RLS
- `/adr-draft` — drafts an ADR in docs/decisions/
- `/verify-gate` — runs all local quality gates
```

**ADD: Test coverage expectations** — Append to the `## Key Commands` section:

```markdown
# Test coverage expectations

# Unit tests: src/**/\*.test.ts and tests/unit/**/\*.test.ts

# E2E tests: manual validation documented in docs/releases/UNTESTED_IMPLEMENTATIONS.md

# New features: at minimum one unit test per utility/hook added; E2E test session required before removing from UNTESTED_IMPLEMENTATIONS.md
```

**CHANGE: Codex handoff section** — The current "Handoff to Codex" section is accurate but doesn't tell Claude Code to _formally record_ the handoff. Add one line:

```markdown
# After creating a handoff, add a session checkpoint via: make checkpoint
```

**REMOVE: Do not remove anything from CLAUDE.md itself**, but in `MEMORY.md` at project root — the file duplicates conventions now fully covered by `CLAUDE.md` and `coding-conventions.md`. Its header format (`YYYY-MM-DD HH24:MM:SS`) conflicts with the UPDATE LOG format (`YYYY-MM-DD HH:MM:SS`). Consider replacing its content with a single redirect line pointing to the canonical files.

---

## Quick Wins

**1. Create the agents directory with one file (< 3 minutes)**

```bash
mkdir -p .claude/agents
```

Then create `.claude/agents/arch-reviewer.md` with the block above. This immediately scopes review sessions to read-only tools and prevents accidental file writes during architecture discussions.

**2. Make lint blocking in CI — remove one line (< 1 minute)**
In `.github/workflows/quality-gates.yml`, line 47 — delete:

```yaml
continue-on-error: true # ← DELETE THIS LINE
```

First run `npm run lint` locally and fix any errors (`@typescript-eslint/no-unused-vars` is currently `off` — leave that rule off to avoid churn, but surface the remaining violations before flipping the gate).

**3. Add `.railwayignore` to unblock the P14 deploy (< 2 minutes)**
Create `scripts/playwright-linkedin/.railwayignore`:

```
node_modules/
dist/
*.log
.env
```

This is already documented as a P0 blocker in `docs/improvements/TECHNICAL_IMPROVEMENTS.md` and the incident post-mortem. It directly unblocks the Railway deployment that has been pending since 2026-03-03.

---

## Decisions Not to Make

1. **Do not replace `CLAUDE.md` + `AGENTS.md` with a single monolithic agent system prompt.** The current split — `CLAUDE.md` for Claude Code, `AGENTS.md` for Codex — maps precisely to a real two-agent workflow. Merging them would destroy the intentional ownership boundary documented in adr-0001 and make the file unreadable for both agents.

2. **Do not add a dedicated frontend component agent.** The React/TSX frontend follows clear shadcn/ui patterns and the existing naming convention (`PascalCase.tsx`, `kebab-case` filenames) is simple. A scoped frontend agent would add overhead without meaningfully reducing errors — the current work there is straightforward enough that a well-prompted main session handles it fine.

3. **Do not introduce a memory/vector store agent for session continuity.** The project already has `docs/sessions/` with a checkpoint script (`make checkpoint`), `MEMORY.md`, and the auto-memory system prompt. Adding another layer would create a third source of truth for session state on top of two that already partially conflict with each other. Fix the duplication between `MEMORY.md` and the auto-memory file first.
