# Session Continuity — Claude Code

<!-- UPDATE LOG -->
<!-- 2026-03-26 | MAINT-2: Created as Claude Code replacement for CODEX_SESSION_CONTINUITY.md. Migrated useful patterns from the Codex runbook. -->

Use this runbook to preserve work quality and velocity when implementation spans multiple Claude Code sessions.

## Objective

Maintain deterministic handoff between sessions by relying on repository artifacts and Claude Code's persistent project memory — not chat context.

## How Claude Code persists state

Claude Code uses two complementary mechanisms:

| Mechanism | Where | What it holds |
| --- | --- | --- |
| **Project memory** | `.claude/projects/*/memory/` | User preferences, feedback, project decisions, references — persists across all conversations |
| **Session checkpoints** | `docs/sessions/*.md` | Snapshot of branch state, what was done, what is next — written manually or via `make checkpoint` |

For short sessions where only code changes are made, project memory is sufficient. For multi-session epics (e.g. a full plan like P14 or P19), write an explicit checkpoint so the next session can resume without re-reading history.

## Start-of-Session Checklist

1. Sync local state:
   ```bash
   git checkout <branch>
   git pull
   ```
2. Check the latest checkpoint (if one exists for this work stream):
   ```bash
   ls -t docs/sessions | head -n 5
   ```
3. Open the checkpoint and read the `Next Actions` section.
4. Open the active plan file in `plans/` and confirm which stories are in progress.

## During a Session

Work in short, verifiable loops:

1. Implement one logical slice.
2. Verify with targeted checks:
   ```bash
   npm run test           # unit tests
   npm run lint           # lint
   npm run build          # type-check + build
   ```
3. Commit that slice with a descriptive message.
4. If the session is long or complex, capture a checkpoint:
   ```bash
   NOTE="what changed + what is next" make checkpoint
   ```

Do not allow large sets of uncommitted changes to accumulate.

## End-of-Session Checklist

1. Commit and push all completed work.
2. Write a checkpoint if the work is mid-story or mid-epic:
   ```bash
   make checkpoint
   ```
   Ensure the checkpoint captures:
   - `Completed` — what was done this session
   - `In Progress` — anything not yet merged
   - `Blockers` — what is stopping progress
   - `Next Actions` — top 3 actions for the next session
3. Update the plan file (`plans/<pN>.md`) to reflect completed stories.
4. Update `docs/releases/UNTESTED_IMPLEMENTATIONS.md` if new features need E2E validation.

## Checkpoint Commands

```bash
# Standard checkpoint
make checkpoint

# Checkpoint with context note
NOTE="fixed RLS policy + next: smoke test edge functions" make checkpoint

# Checkpoint to a named file
SESSION_FILE="docs/sessions/p19-story-3.md" make checkpoint
```

## Source-of-Truth Files for Handoff

- `docs/sessions/*.md` — latest checkpoint
- `plans/<pN>.md` — story progress and constraints
- `docs/releases/UNTESTED_IMPLEMENTATIONS.md` — open E2E validation blockers
- `docs/decisions/product-roadmap.md` — planned scope
- `.claude/projects/*/memory/MEMORY.md` — persistent cross-session context

## Failure Modes to Avoid

- Relying on chat context instead of repository artifacts or project memory.
- Large mixed commits without intermediate checkpoints.
- Ending a session without explicit `Next Actions`.
- Forgetting to update the plan file after completing a story.
