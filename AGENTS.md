# AGENTS.md

<!-- UPDATE LOG -->
<!-- 2026-03-26 | MAINT-2: Retired — Codex is no longer the implementation agent. Claude Code is the sole agentic toolchain. -->

> **This file is archived.** OpenAI Codex is no longer used in this project.
> All agent behaviour, responsibilities, and guardrails are now defined in **[CLAUDE.md](CLAUDE.md)**.

## What this file was

`AGENTS.md` defined how OpenAI Codex should operate in this repository: scope, responsibilities, guardrails, and the working convention with Claude Code (which owned architecture and review while Codex owned implementation).

## Current toolchain

Claude Code is the sole agentic development environment. It owns both implementation and architecture review, using specialised sub-agents in `.claude/agents/` for delegation.

See `CLAUDE.md` for:

- Agent responsibilities and delegation model
- Key commands
- Coding conventions and guardrails
- Source-of-truth file index
