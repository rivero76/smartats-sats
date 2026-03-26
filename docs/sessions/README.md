# Agent Continuity Checkpoints

> **Archive note (2026-03-26):** The checkpoint files in this folder were created during the OpenAI Codex era of this project. They are preserved as historical engineering records and should not be deleted.
>
> **Current toolchain:** Claude Code. Session continuity is now handled via two mechanisms:
> 1. **Project memory** (`.claude/projects/*/memory/`) — persistent cross-session context for preferences, decisions, and feedback. Managed automatically by Claude Code.
> 2. **Checkpoint files** (this folder) — optional explicit snapshots of branch state, progress, and next actions. Create with `make checkpoint` when mid-epic.
>
> See `docs/runbooks/SESSION_CONTINUITY.md` for the current continuity runbook.

---

Use this folder to keep resumable engineering checkpoints when a session spans multiple conversations.

## Create a checkpoint

```bash
make checkpoint
```

Optional note:

```bash
NOTE="what changed + what is next" make checkpoint
```

Optional custom file path:

```bash
SESSION_FILE="docs/sessions/p19-story-3.md" make checkpoint
```

Each checkpoint includes:

- reusable template sections
- branch and commit snapshot
- current `git status --short`
