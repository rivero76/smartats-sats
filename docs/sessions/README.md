# Agent Continuity Checkpoints

> **Note:** These are AI agent (Codex / Claude Code) continuity files, not user sessions or auth sessions.
> Use this folder to snapshot engineering context so a new agent conversation can resume exactly where the previous one left off — branch state, uncommitted changes, what was done, what is next.

Use this folder to keep resumable engineering checkpoints when conversation context grows.

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
SESSION_FILE="docs/sessions/p15-story-3.md" make checkpoint
```

Each checkpoint includes:

- reusable template sections
- branch and commit snapshot
- current `git status --short`
