# ADR-0001: Codex and Claude Code Collaboration Model

## Context

The project uses two coding agents with different strengths. Without explicit ownership boundaries, implementation style and architectural direction can diverge.

## Decision

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
