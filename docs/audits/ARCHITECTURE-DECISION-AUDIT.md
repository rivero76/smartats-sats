# SmartATS — Architecture Decision Audit

<!--
  PURPOSE: Run this prompt ONCE to determine whether to rebuild from scratch or refactor incrementally.
  CONTEXT: This is NOT a periodic quality check. It's a one-time strategic assessment
           designed to produce a GO / NO-GO decision on a full rewrite.
  PREREQUISITE: Run BEFORE committing to any rebuild effort.
  HOW TO RUN: Open this repo in Claude Code and paste everything inside the PROMPT START / PROMPT END block.
  OUTPUT: docs/architecture/ARCHITECTURE-AUDIT-YYYY-MM-DD.md
-->

---

## How to Run

1. Open this repository in Claude Code.
2. Copy everything inside the `--- PROMPT START ---` / `--- PROMPT END ---` block.
3. Paste it as a new message in Claude Code.
4. Save the findings as `docs/architecture/ARCHITECTURE-AUDIT-YYYY-MM-DD.md`.

---

--- PROMPT START ---

You are performing a one-time architecture audit to answer ONE question:
**Should this codebase be rebuilt from scratch, or incrementally refactored?**

Be exhaustive. Read actual files — do not guess or assume. Every claim must reference
a specific file path and line number. The output must give the founder enough evidence
to make a confident decision.

Work through all six dimensions below in order.

---

## DIMENSION 1 — Architecture Map (What Do We Actually Have?)

**1A — System topology**

Trace and document the full data flow for the THREE most critical user journeys:

1. User uploads a resume → it gets parsed → scored against a job description
2. User triggers LinkedIn enrichment or merge
3. User views their dashboard / analytics

For each journey, produce a numbered sequence:
`UI component → hook/service → edge function → database table(s) → response path back`

List every file touched in each journey. Flag any journey where the path is unclear,
where control flow branches in unexpected ways, or where you find dead-end code.

**1B — Dependency graph**

- Map which `src/` modules import from which other modules.
- Identify circular dependencies.
- Identify "god files" (files imported by more than 10 others).
- Identify orphan files (files that are never imported and not entry points).
- Count dead code: components, hooks, utilities, and edge functions that exist
  but are unreachable from any user-facing flow.

**1C — Third-party dependencies**

- Run or read `package.json` and list every dependency.
- Flag packages that are unused (not imported anywhere in `src/` or `supabase/`).
- Flag packages that are outdated by more than 2 major versions.
- Flag packages that are duplicating functionality (e.g., two HTTP clients, two date libraries).
- Estimate: what % of `node_modules` weight is actually used?

**Deliverable:** A text-based architecture diagram (Mermaid or ASCII)
showing all layers and their connections.

---

## DIMENSION 2 — Database Schema Health

**2A — Schema inventory**

- Read ALL files in `supabase/migrations/` in chronological order.
- Produce a complete list of current tables, their columns, types, and relationships.
- Flag tables with NO foreign key relationships (orphaned tables).
- Flag tables with no indexes beyond the primary key on columns used in WHERE/JOIN clauses.
- Flag columns that are `text` or `jsonb` but clearly should be a constrained type or a separate table.
- Flag any table that appears to be a duplicate or near-duplicate of another
  (e.g., leftover from Lovable scaffolding).

**2B — Migration quality**

- Are migrations idempotent (safe to re-run)?
- Do any migrations contain destructive operations without a rollback path?
- Are there migrations that contradict earlier migrations (schema ping-pong)?
- Count: how many migrations exist? What's the ratio of "add feature" vs "fix previous migration"?
  A high fix ratio signals unstable schema design.

**2C — RLS policy audit**

- List every RLS policy across all tables.
- For each policy, state: what it protects, whether it's correct, and whether it can be bypassed.
- Flag tables that SHOULD have RLS but don't.
- Flag overly permissive policies (e.g., `true` as the policy expression).
- Flag edge functions that use the `service_role` key — each one bypasses RLS entirely.
  Document whether that bypass is justified.

**2D — Data integrity**

- Are there CHECK constraints where business rules demand them?
- Are `NOT NULL` constraints applied where data should never be absent?
- Are there any columns with default values that mask missing data
  (e.g., defaulting a score to 0 instead of NULL)?

**Verdict for Dimension 2:** Rate the schema as:
- **SOLID** — Needs cleanup but the model is sound. Refactor-safe.
- **FRAGILE** — Several structural problems but migrateable with effort.
- **BROKEN** — Fundamental modeling errors that would be cheaper to redesign than migrate.

---

## DIMENSION 3 — Security Assessment

**3A — Authentication and authorization**

- How is auth implemented? (Supabase Auth, custom, hybrid?)
- Trace the auth flow from login to first authenticated API call.
- Are there any edge functions that accept requests without verifying the JWT?
- Are there any client-side routes that render sensitive data without auth checks?
- Is there any role-based access control? If so, how is it enforced — RLS, middleware, or ad-hoc checks?

**3B — API surface exposure**

- List every Supabase edge function. For each:
  - Does it validate input (types, length, required fields)?
  - Does it sanitize input before using it in queries or LLM prompts?
  - Does it rate-limit or have any abuse prevention?
  - Does it return appropriate error codes (not raw stack traces)?
- Are there any endpoints that expose more data than the caller needs?

**3C — Secrets and credentials**

- Search the entire repo (including `.env.example`, `supabase/config.toml`,
  migration files, and frontend code) for hardcoded keys, tokens, or passwords.
- Check if any secrets are accessible from client-side code
  (anything in `src/` that references an API key directly).
- Verify that `.env` is in `.gitignore`.
- Check git history: have secrets ever been committed? (Even if removed later, they're in history.)

**3D — Prompt injection and LLM security**

- For every edge function that sends data to an LLM:
  - Is user-supplied content (resume text, job descriptions) injected directly into prompts?
  - Is there any input sanitization or prompt boundary enforcement?
  - Could a malicious resume or job description alter the system prompt's behavior?

**Verdict for Dimension 3:** Rate as:
- **ACCEPTABLE for beta** — No critical vulnerabilities. Known gaps have mitigations.
- **NEEDS IMMEDIATE FIXES** — Critical vulnerabilities exist but are fixable without a rebuild.
- **FUNDAMENTALLY INSECURE** — Auth model or data exposure patterns require redesign.

---

## DIMENSION 4 — Feature Inventory and Health

**4A — Complete feature census**

Read these sources to build the inventory:
- `docs/changelog/CHANGELOG.md`
- `docs/releases/UNTESTED_IMPLEMENTATIONS.md`
- `docs/decisions/product-roadmap.md`
- All route definitions and page components in `src/`

For EVERY feature, record:

| Feature | Status | Core files | Has tests? | Has error handling? | User-visible bugs? |
|---------|--------|-----------|------------|--------------------|--------------------|
| ...     | ...    | ...       | ...        | ...                | ...                |

Status should be one of: WORKING / PARTIAL / BROKEN / DEAD CODE

**4B — Feature coupling assessment**

For each feature rated WORKING:
- Could it be extracted and moved to a new codebase independently?
- What would break if you removed it? (List the dependencies)
- Estimate: how many hours to reimplement this feature from scratch in a clean codebase,
  given that the business logic is already known?

**4C — What users actually touch**

If analytics or logging exists:
- Which features are actually used?
- Which features were built but have zero or near-zero usage?
- This matters: don't rebuild features nobody uses.

---

## DIMENSION 5 — Codebase Maintainability Score

**5A — Consistency index**

Sample 30 files across the codebase and score each on a 1-5 scale for:
- Consistent formatting (indentation, naming, structure)
- Meaningful variable/function names
- Separation of concerns (UI logic vs business logic vs data access)
- Error handling present and consistent

Compute an average. Report the distribution (how many 1s, 2s, etc.).

**5B — Lovable/AI-generated code footprint**

- Identify files or patterns that appear to be auto-generated
  (boilerplate components, repetitive CRUD, generic names like `Component1.tsx`).
- Estimate: what % of the codebase is AI-generated scaffolding that was never customized?
- Is this scaffolding actively harmful (wrong patterns, misleading abstractions)
  or just unnecessary (dead weight that can be deleted)?

**5C — Test coverage**

- Do any tests exist? Where?
- What % of edge functions have test coverage?
- What % of critical business logic (scoring, parsing, enrichment) has test coverage?
- Are the tests that exist actually meaningful, or are they superficial?

**5D — Build and deploy pipeline**

- Is there a CI/CD pipeline? What does it do?
- Can the app be deployed from a fresh clone with documented steps?
- Are there environment-specific configs that only exist on one developer's machine?

---

## DIMENSION 6 — The Rebuild vs. Refactor Decision Matrix

Using findings from Dimensions 1-5, fill out this decision matrix:

### 6A — Structural Assessment

| Area                    | Salvageable? | Effort to fix | Effort to rebuild | Verdict         |
|-------------------------|-------------|---------------|-------------------|-----------------|
| Database schema         | YES/NO      | S/M/L/XL      | S/M/L/XL          | FIX / REBUILD   |
| Auth & security         | YES/NO      | S/M/L/XL      | S/M/L/XL          | FIX / REBUILD   |
| API layer (edge funcs)  | YES/NO      | S/M/L/XL      | S/M/L/XL          | FIX / REBUILD   |
| Frontend architecture   | YES/NO      | S/M/L/XL      | S/M/L/XL          | FIX / REBUILD   |
| LLM integration         | YES/NO      | S/M/L/XL      | S/M/L/XL          | FIX / REBUILD   |
| CI/CD & DevOps          | YES/NO      | S/M/L/XL      | S/M/L/XL          | FIX / REBUILD   |

(S = under 1 week, M = 1-3 weeks, L = 1-2 months, XL = 2+ months)

### 6B — Risk Assessment

Answer each question with evidence:

1. **Is the database schema fundamentally broken, or just messy?**
   (If broken → strongest argument for rebuild)

2. **Are there security vulnerabilities that can't be patched incrementally?**
   (If yes → rebuild. If patchable → refactor)

3. **Is the code so coupled that changing one feature breaks others?**
   (If yes → rebuild may be faster. If modular enough → refactor)

4. **Do you have paying users or validated demand?**
   (If yes → refactor to avoid downtime. If no → rebuild is lower risk)

5. **How long would a rebuild realistically take?**
   (Use the feature reimplement estimates from 4B. Add 2x for the unknown unknowns)

6. **Can you ship new features while refactoring?**
   (If the codebase allows parallel work → refactor. If every change is a minefield → rebuild)

### 6C — Final Recommendation

Based on all evidence, provide ONE of these recommendations:

**OPTION A — INCREMENTAL REFACTOR**
If chosen: provide a prioritized 6-phase refactoring roadmap:
1. What to fix first (security, schema, or architecture)
2. What to fix second
3. ...and so on
4. Estimated total timeline
5. Key milestones where you should re-evaluate

**OPTION B — STRATEGIC REBUILD (Strangler Fig)**
If chosen: provide a migration plan:
1. Which component to rebuild first (and why)
2. How to run old and new systems in parallel
3. Data migration strategy
4. Feature parity checklist
5. Estimated total timeline
6. Point of no return (when do you cut over?)

**OPTION C — SHIP AS-IS WITH GUARDRAILS**
If chosen (when the product needs market validation first):
1. Minimum security fixes required before any user exposure
2. Monitoring and alerting to add immediately
3. Features to disable/hide until hardened
4. Timeline to revisit the rebuild question (after N users or $X revenue)

---

## OUTPUT FORMAT

Return the full report with:
1. One section per dimension, with all findings citing file paths and line numbers
2. Every finding rated: CRITICAL / MAJOR / MINOR
3. The completed decision matrix from Dimension 6
4. A clear, single-sentence final recommendation at the top of the document
  (before all the evidence), so the founder can see the answer immediately

Save as: `docs/architecture/ARCHITECTURE-AUDIT-YYYY-MM-DD.md`

--- PROMPT END ---
