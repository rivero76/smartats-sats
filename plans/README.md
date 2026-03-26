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

## Active Plans

| File                     | Status                     |
| ------------------------ | -------------------------- |
| `p14.md`                 | IN PROGRESS — branch: p14  |
| `p19-uiux-excellence.md` | PLANNED — branch: p19-uiux |

## Archive (`plans/archive/`)

| File                              | Status                                                                                                                             |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `p13.md`                          | COMPLETED — merged to main (~2026-02-28)                                                                                           |
| `p15.md`                          | COMPLETED — merged to main (~2026-02-28)                                                                                           |
| `p10-p11-agent-prompts.md`        | Historical reference (agent prompt templates)                                                                                      |
| `product-improvements-history.md` | Archived god-doc (2026-03-18) — content decomposed into `docs/decisions/product-roadmap.md`, `docs/bugs/BACKLOG.md`, `docs/specs/` |

## Related Docs

- **Canonical roadmap (phase list + status):** `docs/decisions/product-roadmap.md`
- **Technical improvement backlog:** `docs/improvements/TECHNICAL_IMPROVEMENTS.md`
- **Bug backlog:** `docs/bugs/BACKLOG.md`
- **Incident post-mortems:** `docs/incidents/`
