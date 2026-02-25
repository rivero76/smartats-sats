# Codex Session Continuity

Use this runbook to preserve work quality and velocity when implementation spans multiple Codex sessions.

## Objective

Maintain deterministic handoff between sessions by relying on repository artifacts, not chat memory.

## Start-of-Session Checklist

1. Sync local state:
   - `git checkout p14`
   - `git pull`
2. Open latest checkpoint file:
   - `ls -t docs/sessions | head -n 1`
3. Paste the checkpoint "Resume Prompt" in the new Codex session.
4. Create a new checkpoint baseline:
   - `NOTE="session start: <goal>" make checkpoint`

## During Session (Execution Loop)

Run work in short loops:

1. Implement one logical change.
2. Verify with targeted checks (build/test/sql validation as relevant).
3. Capture state:
   - `NOTE="<what changed + next>" make checkpoint`
4. Commit that slice.

Do not allow large sets of uncommitted changes to accumulate.

## End-of-Session Checklist

1. Update latest checkpoint sections:
   - `Completed`
   - `In Progress`
   - `Blockers`
   - `Next Actions` (top 3)
2. Ensure checkpoint reflects actual branch/SHA/status.
3. Commit and push all completed work.

## Commands

```bash
# standard checkpoint
make checkpoint

# checkpoint with note
NOTE="fixed RLS policy check + next: advisor rerun" make checkpoint

# checkpoint to custom file name
SESSION_FILE="docs/sessions/p15-story-2-handoff.md" make checkpoint
```

## Source-of-Truth Files for Handoff

- `docs/sessions/*.md` (latest checkpoint)
- `P14.md` / `P15.md` (story progress and constraints)
- `product/ROADMAP.md` and `product/VISION.md` (planned scope)
- `docs/security/*` for security-sensitive work

## Failure Modes to Avoid

- Relying on chat memory instead of repository artifacts.
- Large mixed commits without checkpoints.
- Ending session without explicit `Next Actions`.
