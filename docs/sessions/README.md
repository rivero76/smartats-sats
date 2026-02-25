# Sessions

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
