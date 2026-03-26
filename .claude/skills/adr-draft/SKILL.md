---
name: adr-draft
description: Draft a new Architecture Decision Record in docs/decisions/. Trigger when the user says "write an ADR", "document this decision", "record architecture decision", or "ADR for X".
---

# ADR Draft

## Step 1 — Find the next ADR number

List files in `docs/decisions/adr-*.md`. Find the highest 4-digit number and increment by 1.

Current ADRs for reference:

- `adr-0001` — Agent collaboration model
- `adr-0002` — LLM provider abstraction
- `adr-0003` — Two-call ATS/CV optimisation isolation
- `adr-0004` — Async vs direct ATS scoring
- `adr-0005` — Skill dedup fuzzy matching
- `adr-0006` — RLS-first tenant isolation

Next number: check the directory to confirm, do not assume it is `0007`.

## Step 2 — Determine the slug

Kebab-case, ≤40 characters, descriptive (e.g. `per-user-api-quotas`, `i18n-library-choice`).

## Step 3 — Create the file

Path: `docs/decisions/adr-<NNNN>-<slug>.md`

## Step 4 — Write the ADR using this exact structure

```markdown
# ADR-<NNNN>: <Title>

**Status:** Proposed
**Date:** YYYY-MM-DD
**Deciders:** Architecture (Claude Code)

## Context

2–4 sentences. What situation, constraint, or incident forces this decision?
Name specific files, functions, or prior ADRs where relevant.

## Decision

1. <Concrete, implementable statement of what was decided>
2. <Additional decision points if applicable>

## Alternatives Considered

1. **<Option name>** — <what it is>. Rejected because: <one sentence>.
2. **<Option name>** — <what it is>. Rejected because: <one sentence>.

## Consequences

**Positive:**

- <Benefit>

**Negative / trade-offs:**

- <Cost or constraint introduced>

## Cross-references

- Related ADRs: <!-- list by number and title, or "None" -->
- Related plans: <!-- e.g. plans/p19.md, or "None" -->
- Related specs: <!-- e.g. docs/specs/technical/llm-model-governance.md, or "None" -->
```

## Rules

- Status starts as `Proposed`. Only the human owner changes it to `Accepted`.
- If this supersedes an existing ADR, add `**Supersedes:** ADR-XXXX` below the Status line, and update the old ADR's Status to `Superseded by ADR-<NNNN>`.
- Do not invent alternatives — only include options that were genuinely considered.
- Do not write implementation code in an ADR — only the decision and its rationale.
- After writing, remind the user to update `docs/decisions/README.md` if it exists.
