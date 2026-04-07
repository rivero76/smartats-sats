# SmartATS — Product & Project Management Audit

<!--
  PURPOSE: Evaluate how product and project management artifacts are organized
           across this codebase. Identify what exists, what's missing, what's
           scattered, and produce a consolidated PM/PgM framework the founder
           can reuse for this and future SaaS projects.
  CONTEXT: This project grew through Lovable → Cursor → Claude Code.
           PM artifacts were created ad-hoc and are spread across the repo.
           A Product Management Dashboard exists at /pm but its relationship
           to the scattered docs is unclear.
  HOW TO RUN: Open this repo in Claude Code and paste everything inside
              the PROMPT START / PROMPT END block.
  OUTPUT: docs/audits/reports/YYYY-MM-DD_pm-pgm-audit.md
-->

---

## How to Run

1. Open this repository in Claude Code.
2. Copy everything inside the `--- PROMPT START ---` / `--- PROMPT END ---` block.
3. Paste it as a new message in Claude Code.
4. Save the findings as `docs/audits/reports/YYYY-MM-DD_pm-pgm-audit.md`.

---

--- PROMPT START ---

You are performing a one-time Product Management and Project Management audit
of this SaaS codebase. The goal is threefold:

1. **Map** every PM/PgM artifact that exists and where it lives.
2. **Assess** whether the current system is functional or just scattered noise.
3. **Recommend** a lean PM/PgM framework the founder can adopt for this project
   and reuse as a template for future SaaS builds.

Be exhaustive. Read actual files — do not guess. Every claim must reference
a specific file path. Work through all seven dimensions below in order.

---

## DIMENSION 1 — Artifact Discovery (What Exists and Where)

**1A — Full-repo scan for PM artifacts**

Search the ENTIRE repository for files that serve a product or project
management purpose. This includes but is not limited to:

- Changelogs, release notes, version histories
- Roadmaps, phase definitions, milestone documents
- Feature specs, user stories, acceptance criteria
- Bug reports, incident logs, problem statements
- Backlog files (tech debt, feature requests, improvements)
- Decision records (ADRs, RFCs, design docs)
- Meeting notes, sprint retrospectives, standups
- Status dashboards or tracker definitions
- TODO/FIXME comments scattered in source code (run a grep)
- Any markdown file with keywords: "blocker", "priority", "epic",
  "sprint", "release", "phase", "milestone", "story", "incident"

For EVERY artifact found, record:

| File path | Type | Last modified | Format | Scope |
| --------- | ---- | ------------- | ------ | ----- |
| ...       | ...  | ...           | ...    | ...   |

Type = one of: CHANGELOG, ROADMAP, FEATURE_SPEC, BUG_REPORT, INCIDENT,
BACKLOG, DECISION_RECORD, MEETING_NOTES, STATUS_TRACKER, IMPROVEMENT_LOG, OTHER

Format = MARKDOWN / JSON / YAML / DATABASE_TABLE / UI_COMPONENT / CODE_COMMENT

Scope = PROJECT_WIDE / PHASE_SPECIFIC / FEATURE_SPECIFIC / ONE-OFF

**1B — Source of truth conflicts**

Identify cases where the SAME information lives in multiple places:

- Is the feature list in the roadmap doc also duplicated in the dashboard DB?
- Are bugs tracked in markdown files AND in a database table?
- Are changelogs maintained in more than one file?
- Does the PM dashboard (`/pm`) display data that contradicts the markdown files?

For each conflict, state: which source is more current, which is stale,
and what the risk is of someone trusting the wrong one.

**1C — In-code PM artifacts**

Search all source files for:

- `// TODO`, `// FIXME`, `// HACK`, `// BUG`, `// REVIEW`
- Comments referencing phases, sprints, tickets, or deadlines
- Commented-out feature flags or conditional blocks tied to releases

Count them. List the 10 most critical ones. Assess: are these being tracked
anywhere outside the code, or are they invisible to project planning?

---

## DIMENSION 2 — Product Management Maturity

**2A — Roadmap clarity**

Find and read every roadmap-related file. Then answer:

- Is there ONE clear roadmap, or multiple competing versions?
- Does the roadmap define phases with explicit scope (what's IN vs OUT)?
- Are phases tied to measurable outcomes (user count, revenue, feature completion)
  or just vague groupings of features?
- Is there a visible "current phase" indicator?
- Does the roadmap distinguish between MVP-critical and nice-to-have?
- How far ahead does the roadmap plan? Is that appropriate for the stage?

Rate the roadmap: CLEAR / FRAGMENTED / ABSENT

**2B — Feature lifecycle tracking**

For the product's features, trace whether a consistent lifecycle exists:

`Idea → Spec → Approved → In Progress → Code Complete → Tested → Shipped → Documented`

- Do features have written specs before implementation starts?
- Is there a way to know which features are in progress vs shipped vs abandoned?
- Are features linked to their implementing code (file references, PRs)?
- Is there a definition of "done" for features?
- Are untested or partially shipped features clearly marked?
  (Check `UNTESTED_IMPLEMENTATIONS.md` and similar files)

Rate the lifecycle: DEFINED / AD-HOC / ABSENT

**2C — User story and requirement quality**

Find any user stories, feature requests, or requirements documents. Assess:

- Do they follow a consistent format (e.g., "As a [user], I want [X] so that [Y]")?
- Do they include acceptance criteria?
- Are they prioritized (MoSCoW, RICE, numbered, or any system)?
- Are they linked to the roadmap phases they belong to?
- Are edge cases and error scenarios documented?

Rate: STRUCTURED / INFORMAL / ABSENT

**2D — Product Management Dashboard audit**

Read the source code for the PM dashboard at `/pm`:

- What data does it display? (List every entity: features, bugs, phases, etc.)
- Where does the data come from? (Database tables, markdown parsing, hardcoded?)
- Is the dashboard the source of truth, or a view of data stored elsewhere?
- Can the team manage work FROM the dashboard (create/update/close items)?
- Does the dashboard match reality? (Cross-reference 3-5 items against the actual code state)

Rate: FUNCTIONAL / DECORATIVE / BROKEN

---

## DIMENSION 3 — Project Management Maturity

**3A — Work tracking and execution**

Assess how work gets planned and tracked:

- Is there a backlog? Where does it live? Is it prioritized?
- Are tasks broken into actionable items with owners and deadlines?
- Is there a sprint/cycle/iteration structure, or is work continuous and unstructured?
- Can you tell, right now, what the "next 3 things to build" are? Where is that written?
- Are blockers tracked? Is there a process to escalate or resolve them?

Rate: STRUCTURED / INFORMAL / CHAOTIC

**3B — Incident and bug management**

Find every bug report, incident log, and error tracking artifact. Assess:

- Is there a single place to report and track bugs?
- Do bug reports include: reproduction steps, severity, affected feature, status?
- Are incidents (production issues) tracked differently from bugs (code defects)?
- Is there a triage process (who decides priority and when to fix)?
- Are resolved bugs linked to the fix (commit, PR, migration)?
- Are recurring bugs identified and linked to root causes?

Rate: SYSTEMATIC / REACTIVE / ABSENT

**3C — Technical debt tracking**

Find every tech debt / improvement artifact. Assess:

- Is tech debt inventoried in one place?
- Is each item sized (effort estimate) and prioritized?
- Is tech debt regularly scheduled into sprints, or does it only accumulate?
- Is there a threshold or policy for when tech debt becomes blocking?
- Does the `TECHNICAL_IMPROVEMENTS.md` file (or equivalent) stay current?

Rate: MANAGED / ACKNOWLEDGED / INVISIBLE

**3D — Release management**

Assess how releases are planned and executed:

- Is there a release process? (Even informal: "merge to main and deploy")
- Are releases versioned? What scheme? (semver, dates, phase names?)
- Is there a pre-release checklist (tests, security review, migration, rollback)?
- Are releases announced or documented anywhere?
- Can you roll back a bad release? How?

Rate: DEFINED / AD-HOC / NONEXISTENT

---

## DIMENSION 4 — Information Architecture (How PM Artifacts Are Organized)

**4A — Folder structure analysis**

Map the current directory structure for all PM-related content:

```
docs/
├── changelog/
├── decisions/
├── improvements/
├── releases/
├── ...
```

- Is the structure intuitive? Could a new team member find things?
- Are there PM artifacts OUTSIDE `docs/` that should be inside it?
- Are there empty or near-empty directories that suggest abandoned organization attempts?
- Is there a README or index file that explains the structure?

**4B — Naming conventions**

- Are PM file names consistent? (e.g., all dates formatted the same way?)
- Can you tell a file's purpose from its name alone?
- Are there files with generic names like `notes.md`, `temp.md`, `old-stuff.md`?

**4C — Cross-referencing**

- Do documents link to each other? (e.g., does a feature spec link to its ADR?)
- Can you navigate from a roadmap phase to its feature specs to its implementation files?
- Is there a master index or table of contents for all documentation?
- Are orphan documents (referenced by nothing, linking to nothing) common?

**4D — Dashboard vs. docs alignment**

- Does the PM dashboard (`/pm`) reflect the same taxonomy as the markdown files?
- If you add a feature in the dashboard, does it appear in the roadmap doc?
- If you log a bug in a markdown file, does it appear in the dashboard?
- Is there one system that's "ahead" and another that's always stale?

Rate the overall information architecture: NAVIGABLE / SCATTERED / LABYRINTHINE

---

## DIMENSION 5 — Gap Analysis (What's Missing)

Based on industry standards for a solo-founder / small-team SaaS at pre-launch stage,
identify what PM/PgM artifacts or processes are MISSING:

**5A — Essential artifacts not found**

Check for the presence or absence of each. For each missing item,
note whether it's critical at this stage or can wait:

| Artifact                           | Exists? | Critical now? | Notes |
| ---------------------------------- | ------- | ------------- | ----- |
| Product vision / mission statement | ...     | ...           | ...   |
| Target user personas               | ...     | ...           | ...   |
| Competitive analysis               | ...     | ...           | ...   |
| Pricing strategy document          | ...     | ...           | ...   |
| Success metrics / KPIs definition  | ...     | ...           | ...   |
| User feedback collection process   | ...     | ...           | ...   |
| Onboarding flow documentation      | ...     | ...           | ...   |
| Feature flag inventory             | ...     | ...           | ...   |
| Runbook for common operations      | ...     | ...           | ...   |
| Rollback / disaster recovery plan  | ...     | ...           | ...   |
| Data retention / privacy policy    | ...     | ...           | ...   |
| Terms of service (draft)           | ...     | ...           | ...   |
| Go-to-market plan                  | ...     | ...           | ...   |
| Beta testing plan                  | ...     | ...           | ...   |
| Support / escalation process       | ...     | ...           | ...   |

**5B — Process gaps**

Identify missing processes that would reduce chaos:

- Is there a defined workflow for "I found a bug" → "it's fixed and verified"?
- Is there a defined workflow for "I have a feature idea" → "it's shipped"?
- Is there a process for deciding what NOT to build (saying no to scope creep)?
- Is there a regular review cadence (weekly, biweekly) for roadmap progress?
- Is there a process for updating documentation when code changes?

---

## DIMENSION 6 — Lessons Learned (What to Do Differently Next Time)

Based on everything you've found, answer these questions specifically:

**6A — What worked**

- Which PM/PgM artifacts or practices in this project were actually useful?
- What should the founder carry forward to the next project?
- Were there any surprisingly good practices despite the overall chaos?

**6B — What failed**

- Which artifacts were created but never maintained? (Effort wasted)
- Which processes were defined but never followed?
- What was the root cause of the scatter? (No convention, too many conventions,
  tools changed, priorities shifted, solo-founder bandwidth?)

**6C — Stage-appropriate PM**

Many of the "missing" items above would be overkill for a solo founder.
Provide an honest assessment:

- At this product stage, what's the MINIMUM viable PM setup?
- What's the ideal PM setup that balances rigor with solo-founder speed?
- What should wait until there are 2-3 team members?
- What should wait until there are paying users?

---

## DIMENSION 7 — Recommended PM/PgM Framework

Produce a CONCRETE, REUSABLE framework the founder can adopt for this project
and template for future SaaS builds.

**7A — Recommended folder structure**

Provide an exact directory tree with explanations:

```
docs/
├── product/
│   ├── ...
├── project/
│   ├── ...
├── engineering/
│   ├── ...
```

**7B — Recommended artifact templates**

For each essential artifact type, provide a minimal template:

1. Feature spec template (what fields, what sections)
2. Bug report template
3. Incident report template
4. ADR (Architecture Decision Record) template
5. Sprint/cycle planning template
6. Release checklist template
7. Changelog entry format

Keep templates SHORT. A template nobody uses because it's 50 fields long
is worse than no template at all.

**7C — Recommended workflows**

Define lightweight workflows for a solo founder:

1. **New feature workflow:** Idea → where to write it → how to prioritize → when to build → how to mark done
2. **Bug workflow:** Discovery → where to log → severity rules → fix → verify → close
3. **Release workflow:** Code complete → checklist → deploy → announce → monitor
4. **Tech debt workflow:** Identify → log → prioritize → schedule → resolve
5. **Documentation workflow:** When to update docs → who triggers it → minimum standard

**7D — Recommended tool consolidation**

Based on what's scattered across this project:

- What should live in the database (and be managed via the `/pm` dashboard)?
- What should live in markdown files (and be version-controlled with git)?
- What should live in neither (and instead use a lightweight external tool)?
- Where is the single source of truth for each type of information?

Provide a clear mapping:

| Information type | Source of truth | Why |
| ---------------- | --------------- | --- |
| Feature backlog  | ...             | ... |
| Bug tracking     | ...             | ... |
| Roadmap          | ...             | ... |
| Changelogs       | ...             | ... |
| Decisions (ADRs) | ...             | ... |
| Tech debt        | ...             | ... |
| Incidents        | ...             | ... |

**7E — PM dashboard recommendations**

Given that a PM dashboard already exists at `/pm`:

- What should it track? (Be specific — list the entities and their fields)
- What should it NOT track? (Things better left in markdown or external tools)
- Should it be the primary interface for managing work, or a read-only status view?
- What's the minimum set of views: backlog, current sprint, roadmap, bugs, metrics?

---

## OUTPUT FORMAT

Return the full report with:

1. An EXECUTIVE SUMMARY at the top (10 lines max) with:
   - Overall PM maturity rating: STRUCTURED / EMERGING / CHAOTIC
   - Overall PgM maturity rating: STRUCTURED / EMERGING / CHAOTIC
   - The #1 thing to fix immediately
   - The #1 thing that's actually working well
2. One section per dimension, with all findings citing file paths
3. The complete framework from Dimension 7 as a standalone, copy-pasteable section
4. A prioritized action list:
   - BEFORE LAUNCH (do these or don't ship)
   - FIRST MONTH (do these while onboarding early users)
   - WHEN YOU HIRE (do these when you're no longer solo)

Save as: `docs/audits/reports/YYYY-MM-DD_pm-pgm-audit.md`

--- PROMPT END ---
