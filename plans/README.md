# Plans

This directory stores execution plans and feature phase documents used by both coding agents.

## Usage

1. Create one plan file per feature or phase.
2. Include acceptance criteria and validation commands.
3. Mark status in-file when work is done or blocked.

## Active / Archive Convention

- **Active plans** live directly in `plans/`. Add a `<!-- Status: IN PROGRESS ... -->` block at the top.
- **Completed plans** are moved to `plans/archive/` after their last story merges to main. Add a `<!-- Status: COMPLETED ... -->` block before moving.
- This keeps the root of `plans/` scannable — only in-progress work appears here.

## Current Files

| File | Status |
|---|---|
| `p10-p11-agent-prompts.md` | Reference / historical |
| `p13.md` | COMPLETED — merged to main (~2026-02-28) |
| `p14.md` | IN PROGRESS — branch: p14, blocked on Railway deploy |
| `p15.md` | COMPLETED — merged to main (~2026-02-28) |
| `product-improvements.md` | Living document |

## Archive

Completed plans: `plans/archive/` (directory to be created when first plan is archived)
