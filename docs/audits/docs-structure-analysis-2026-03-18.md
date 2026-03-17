# Documentation & Plans Structure Analysis — 2026-03-18

## Why Roadmap, Incidents, and Logs Are Scattered

### Root Cause

The repo's documentation grew **organically**, not from a pre-designed structure. `plans/product-improvements.md` was created first as a single-purpose logging improvement plan (P0-P4). As the product evolved, new content was appended to it rather than routed to purpose-built locations. By P15, this single file contained: feature phases, bug reports, strategic direction, technical work packages, risk controls, and a data deletion analysis — things that now have dedicated homes but haven't been migrated there.

### What Lives Where (Current State)

| Content Type | Where It Is | Should Be |
|---|---|---|
| Product roadmap (phase list, status) | `docs/decisions/product-roadmap.md` ✓ | Here — correct |
| Phase execution plans (P13, P14, P15) | `plans/p13.md`, `plans/p14.md`, `plans/p15.md` ✓ | Here — correct |
| Phase specs (P0–P12 detail) | `plans/product-improvements.md` ← **old god-doc** | `docs/specs/` (partially there for P11, P12, P16) |
| Bug backlog (active defects) | `plans/product-improvements.md §1C` | `docs/bugs/` |
| Operational incidents (deploy failures) | `docs/bugs/bug-railway-up-path-as-root-timeout.md` | `docs/incidents/` (doesn't exist) |
| Strategic product direction | `plans/product-improvements.md §1A` | `docs/decisions/product-vision.md` (exists but not all content is there) |
| AI session continuity notes | `docs/sessions/` | OK, but purpose is unclear from the folder name |
| Technical improvement backlog | `docs/improvements/TECHNICAL_IMPROVEMENTS.md` ✓ | Here — correct |
| Runtime logs | Supabase `log_entries` table (not in repo) | Correct — should not be in repo |

### The Three Specific Problems You Asked About

**1. Roadmap split between two files**
`plans/product-improvements.md` has a full phase list (P0-P15) with execution detail, while `docs/decisions/product-roadmap.md` has the "official" clean roadmap. `product-roadmap.md` even references `plans/product-improvements.md` as its "Execution Source." This circular dependency means neither file is fully authoritative.

**2. Incidents have no home**
`docs/bugs/` is used for both code defects (e.g. enrichment modal scroll) and operational/deployment incidents (e.g. Railway deploy timeout). These are different in nature: bugs are tracked against code changes; incidents are post-mortems of runtime or deploy failures. Mixing them makes it hard to know what's a code issue vs an ops issue.

**3. `docs/sessions/` purpose is opaque**
The folder contains AI agent continuity checkpoints (session transcripts + resumable context). Named `sessions/`, it's easily confused with user sessions or auth sessions. It's really a developer tool — used to resume a Codex or Claude Code session after context window limits. The name doesn't communicate this.

---

## Proposed Information Architecture

### Guiding Principles
1. **One type of content, one canonical location** — no file should be authoritative for two content types
2. **`plans/`** = what we are building right now (active execution only)
3. **`docs/`** = stable knowledge, specs, decisions, and history
4. **Dead content** gets archived or deleted — not left in place to confuse

### Suggested Structure

```
plans/
  README.md                         ← explains archive convention
  p14.md                            ← IN PROGRESS (stays here)
  p16.md                            ← (new, when started)
  archive/
    p13.md                          ← COMPLETED — move here
    p15.md                          ← COMPLETED — move here
    p10-p11-agent-prompts.md        ← Historical — move here
    product-improvements-history.md ← Decomposed god-doc — archive here

docs/
  README.md
  architecture.md
  decisions/                        ← ADRs + product decisions
    product-roadmap.md              ← CANONICAL roadmap (already here ✓)
    product-vision.md               ← CANONICAL vision (already here ✓)
    product-docs-index.md
    adr-000X-*.md
  specs/                            ← Full phase specs (already partially here ✓)
    product/
    technical/
  improvements/                     ← Technical debt + quality backlog
    TECHNICAL_IMPROVEMENTS.md       ← Master backlog (already here ✓)
    CODE-REVIEW-YYYY-MM-DD.md       ← Per-review findings
  bugs/                             ← Active code defects only
    BACKLOG.md                      ← Bug list with status
    bug-*.md                        ← Individual bug reports
  incidents/                        ← NEW: Operational/deploy/runtime incidents
    incident-*.md
  audits/                           ← NEW: Periodic review prompts + findings
    code-review-prompt.md           ← Reusable audit prompt
    docs-structure-analysis-*.md
  runbooks/
  releases/
  changelog/
  sessions/                         ← Rename to: continuity/ (or add clear README)
  compliance/
  conventions/
  security/
  templates/
  help/
```

### Key Changes (delta from today)

| Action | From | To | Effort |
|---|---|---|---|
| Move completed plans to archive | `plans/p13.md`, `plans/p15.md`, `plans/p10-p11-agent-prompts.md` | `plans/archive/` | 5 min |
| Decompose god-doc | `plans/product-improvements.md` — bug backlog section | `docs/bugs/BACKLOG.md` | 30 min |
| Decompose god-doc | `plans/product-improvements.md` — phase specs P0-P12 | `docs/specs/` (some already exist) or archive | 1 hr |
| Archive remainder | `plans/product-improvements.md` | `plans/archive/product-improvements-history.md` | 5 min |
| Create incidents folder | — | `docs/incidents/` | 5 min |
| Move deploy incident | `docs/bugs/bug-railway-up-path-as-root-timeout.md` | `docs/incidents/incident-2026-03-03-railway-deploy-timeout.md` | 5 min |
| Clarify sessions folder | `docs/sessions/README.md` | Update README to say: "AI agent continuity checkpoints — used to resume Codex/Claude Code sessions after context window resets" | 5 min |
| Update `docs/README.md` | Add `incidents/` and `audits/` to the sections list | 10 min |
| Update `CLAUDE.md` source-of-truth table | Add `docs/incidents/` for "Operational incidents" and `docs/audits/` for "Periodic review prompts" | 10 min |

**Total estimated effort: ~2 hours**

---

## Why This Matters

At Beta stage with 5+ active phases and a growing team toolset (Codex + Claude Code), documentation debt compounds fast. The current mixed structure means:
- **A new team member** can't tell if `plans/product-improvements.md` or `docs/decisions/product-roadmap.md` is the authoritative roadmap
- **An agent (Codex or Claude Code)** asked to "check the roadmap" will find conflicting information in two places
- **Incidents have no home**, so they pile up in the wrong folders and become hard to retrieve during a real incident
- **The god-doc** is too long to read and too broad to update correctly — it will drift further out of sync

Fixing the structure now, before P16/P17 add more complexity, costs 2 hours. Fixing it after is harder because more content links to the wrong locations.
