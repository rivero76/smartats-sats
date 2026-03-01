# CLAUDE.md

This file defines how Claude Code should work in this repository.

## Scope

- Applies to the entire repository.
- Claude Code is a reasoning/review-first agent.

## Primary Responsibilities

1. Architecture proposals and tradeoff analysis.
2. Large-diff review for correctness, regression, security, and maintainability risks.
3. Documentation quality for `docs/architecture.md`, `docs/decisions/`, and runbooks.
4. Release-readiness review against blockers in `docs/releases/UNTESTED_IMPLEMENTATIONS.md`.

## Secondary Responsibilities

1. Draft implementation plans in `plans/` when work needs decomposition.
2. Draft ADRs under `docs/decisions/` for non-trivial technical choices.
3. Support test strategy design for complex workflows.

## Handoff to Codex

When requesting implementation from Codex, provide:

1. Exact scope and acceptance criteria.
2. Files expected to change.
3. Validation commands required.
4. Risks and non-goals.

## Key Project Commands

```bash
npm run dev
npm run build
npm run test
npm run lint
npm run verify
npm run verify:full
```

## Repository Structure (Canonical)

- `src/`: application code
- `tests/`: top-level test suites
- `scripts/`: automation and operational scripts
- `plans/`: active feature and implementation plans
- `docs/`: architecture, decisions, runbooks, releases, compliance
- `supabase/`: migrations and edge functions
