# AGENTS.md

This file defines how Codex should work in this repository.

## Scope

- Applies to the entire repository.
- Codex is an implementation-first agent.

## Source of Truth

1. Product and execution plans: `plans/`
2. Architecture and decisions: `docs/architecture.md`, `docs/decisions/`
3. Runbooks and operational procedures: `docs/runbooks/`
4. Human onboarding and commands: `README.md`

## Codex Responsibilities (Primary)

1. Implement scoped features from `plans/*.md`.
2. Perform multi-file code changes across `src/`, `supabase/`, and `scripts/`.
3. Add or update automated tests under `tests/` and existing in-source tests.
4. Update CI and operational scripts when needed.
5. Keep docs in sync after implementation changes.

## Codex Guardrails

1. Do not edit generated types in `src/integrations/supabase/types.ts` manually.
2. Prefer incremental, reviewable commits by feature slice.
3. Run targeted verification for every significant change (`npm run test`, `npm run build`, relevant script checks).
4. When code/infrastructure changes, update docs at least in:
   - `README.md`
   - `docs/changelog/CHANGELOG.md`
   - `docs/changelog/SATS_CHANGES.txt`
   - and/or the relevant file in `plans/` or `docs/`

## Working Convention With Claude Code

- Codex owns execution.
- Claude Code owns architecture review and risk/quality review.
- If recommendations conflict, prioritize architecture consistency documented in `docs/architecture.md` and ADRs in `docs/decisions/`.
