# ADR-0001: Codex and Claude Code Collaboration Model

<!-- UPDATE LOG -->
<!-- 2026-03-26 | MAINT-2: Status changed to Superseded. Claude Code is now the sole agentic toolchain. See ADR note below. -->

**Status:** Superseded — 2026-03-26
**Superseded by:** Claude Code as sole agentic toolchain (see note below)

---

## Context

The project uses two coding agents with different strengths. Without explicit ownership boundaries, implementation style and architectural direction can diverge.

## Decision (Original — now superseded)

1. Codex is the primary implementation agent.
2. Claude Code is the primary architecture and review agent.
3. Shared canonical references are:
   - `README.md` (onboarding + commands)
   - `docs/architecture.md` (system architecture)
   - `plans/` (execution plans)
   - `docs/decisions/` (approved decisions)

## Alternatives Considered

1. Single-agent ownership only.
2. No explicit ownership split.

## Consequences

1. Faster execution with clear handoffs.
2. Better consistency in architecture decisions.
3. Reduced conflict between suggested approaches.

---

## Supersession Note (2026-03-26)

OpenAI Codex is no longer used in this project. Claude Code is now the sole agentic development environment — it owns both implementation and architecture review.

The split-ownership model this ADR established was practical during the Codex era but is no longer applicable. The updated collaboration model is:

- **Claude Code** — owns architecture review, implementation, ADRs, risk/quality analysis, and documentation. Delegates to specialised sub-agents in `.claude/agents/` for specific tasks (see `CLAUDE.md`).
- **`AGENTS.md`** — retired; now a stub redirecting to `CLAUDE.md`.
- **`docs/runbooks/CODEX_SESSION_CONTINUITY.md`** — archived; patterns migrated to `docs/runbooks/SESSION_CONTINUITY.md`.
