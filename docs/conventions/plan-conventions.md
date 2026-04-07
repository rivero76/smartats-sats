<!-- UPDATE LOG -->
<!-- 2026-04-07 | Created — professional plan format standard with agent references, saas-advisor integration, and lifecycle guidance -->

# Plan Conventions

Every feature plan in `plans/` follows this standard. This document is the single source of truth for plan format, required sections, agent references, and lifecycle rules.

**Related:** `docs/conventions/coding-conventions.md` · `plans/README.md` · `.claude/agents/`

---

## 1. When to Create a Plan

Create a plan file when:

- The work spans **more than one story** or touches **more than three files**
- The work requires a **database migration** or a **new edge function**
- The work involves a **user-facing feature** (not a refactor or bug fix)
- Any agent flags the work as needing decomposition

Skip a plan file for:

- Single-file bug fixes
- Refactors with no schema or UX changes
- Documentation-only changes

---

## 2. Plan File Location and Naming

```
plans/p<N>-<short-description>.md       # Feature phases
plans/fix-<short-description>.md        # Bug fix plans (complex only)
plans/infra-<short-description>.md      # Infrastructure plans
```

- Use the next available phase number `p<N>` for product features.
- Use kebab-case for the description slug.
- Never delete plan files — archive them to `plans/archive/` when complete.

---

## 3. Required Plan Header

Every plan file must begin with this block:

```markdown
<!--
  UPDATE LOG
  YYYY-MM-DD | Created — <one-line description> (<agent that created it>)
  YYYY-MM-DD | <change> (<agent or session>)
-->

# P<N> — <Feature Name>

<!-- Status: DRAFT | PLANNED | IN PROGRESS | BLOCKED | COMPLETED -->

| Field             | Value                                             |
| ----------------- | ------------------------------------------------- |
| **Phase**         | P<N>                                              |
| **Priority**      | HIGHEST \| HIGH \| MEDIUM \| LOW                  |
| **Tier gating**   | Free \| Pro+ \| Max+ \| Enterprise \| None        |
| **Branch**        | `p<N>-<slug>`                                     |
| **Plan file**     | `plans/p<N>-<name>.md`                            |
| **Spec file**     | `docs/specs/product/p<N>-<name>.md` (if exists)   |
| **Created by**    | `plan-decomposer` \| `product-analyst` \| founder |
| **Last reviewed** | YYYY-MM-DD                                        |
```

---

## 4. Required Plan Sections (in order)

### 4.1 Goal

**One paragraph.** State the problem, the proposed solution, and the done condition in plain language. No bullet lists. No technical jargon. If you cannot write this in one paragraph, the scope is too large — split the plan.

### 4.2 Advisory Checkpoint — saas-advisor

Before implementation begins, consult the `saas-advisor` agent with these standing questions (adapt to the specific plan):

```
Run saas-advisor: For [feature name], what have bootstrapped SaaS founders
on The SaaS Podcast learned about [specific concern]? Specifically:
1. Does this feature belong at my current stage (pre-commercial / soft launch / growth)?
2. Are there pricing or packaging implications I should resolve before building?
3. What activation or onboarding risk does this feature introduce?
4. Who specifically would pay for this — and who wouldn't?
```

**Record the saas-advisor findings** as a collapsed `<details>` block in this section before marking the plan IN PROGRESS. Do not start implementation until this is done for any user-facing feature.

### 4.3 Agent Execution Sequence

List which agents to run and in what order for this plan. Update checkboxes as work progresses.

```markdown
#### Before implementation

- [ ] `saas-advisor` — strategic validation (see §4.2)
- [ ] `product-analyst` — user stories + acceptance criteria (if not already done)
- [ ] `arch-reviewer` — review this plan before first commit
- [ ] `security-auditor` — if plan touches auth, RLS, or user data

#### During implementation

- [ ] `migration-writer` — for every new table or schema change
- [ ] `edge-fn-scaffolder` — for every new edge function
- [ ] `component-scaffolder` — for every new page or major component
- [ ] `test-writer` — for every new hook or utility function

#### After implementation

- [ ] `convention-auditor` — check UPDATE LOG headers and naming
- [ ] `test-runner` — run full test suite
- [ ] `help-content-writer` — update /help page (required for all user-facing features)
- [ ] `landing-page-writer` — update marketing pages (required if pricing or feature copy changes)
- [ ] `changelog-keeper` — update CHANGELOG.md
- [ ] `release-gatekeeper` — final release readiness check
```

Omit agents that are not applicable to this plan. Add specialist agents as they are created (e.g., `performance-auditor`, `a11y-checker`). The agent list in this section is the authority for this plan — it overrides the global flow in `CLAUDE.md` for plan-specific edge cases.

### 4.4 Success Metrics

Define measurable outcomes. At least one metric must be quantitative.

```markdown
| Metric           | Target                                                         | How to measure                               |
| ---------------- | -------------------------------------------------------------- | -------------------------------------------- |
| Activation rate  | ≥ 60% of new Pro users complete first full cycle within 7 days | Supabase query on sats_analyses + created_at |
| Churn impact     | No increase in month-1 churn after feature launch              | Compare cohorts in Stripe                    |
| Feature adoption | ≥ 30% of eligible tier users trigger feature within 30 days    | Event log in log_entries                     |
```

If success metrics cannot be defined, the scope is unclear — clarify with `product-analyst` before writing stories.

### 4.5 Stories

Each story follows this structure:

````markdown
### Story <N> — <Title>

**User story:**
As a <persona>, I want <capability>, so that <benefit>.

**Acceptance criteria:**

1. Given <context>, when <action>, then <outcome>.
2. ...

**Files expected to change:**

- `path/to/file.ts` — reason
- `supabase/migrations/<timestamp>_<name>.sql` — new migration

**Validation commands:**

```bash
npm run verify:full
bash scripts/ops/gen-types.sh   # if migration included
npm run test -- tests/unit/...  # specific test file
```
````

**Risks / non-goals:**

- Do not build X — out of scope for this story.
- Risk: Y could break if Z — mitigation: ...

````

### 4.6 Technical Risks

A bulleted list of risks that apply to the **entire plan** (not story-specific):

- **Schema risk** — migrations that cannot be rolled back
- **LLM cost risk** — new prompts that may increase token usage significantly
- **RLS risk** — new tables or policies that could expose cross-tenant data
- **Regression risk** — pages or hooks likely to break from shared dependency changes

### 4.7 Out of Scope

An explicit list of what this plan does NOT deliver. This prevents scope creep and gives implementation agents a clear fence.

### 4.8 References

All external references relevant to this plan:

```markdown
#### SaaS Podcast advisory
- Advisory guide: `docs/advisory/2026-04-07_saas-podcast-advisory-guide.md`
- Relevant phase: Phase <N> — <name>
- Key episode: Ep. <N> — <Guest>, <Company> — [link](<url>)

#### Internal references
- Roadmap entry: `docs/decisions/product-roadmap.md` → Phase P<N>
- Vision: `docs/decisions/product-vision.md`
- Related plan: `plans/<related>.md`
- Spec: `docs/specs/product/p<N>-<name>.md`
- ADR: `docs/decisions/adr-NNNN-<name>.md` (if a significant technical decision was made)

#### External references
- Competitor: [Name] — [specific feature or behavior being referenced]
- Article / research: [Title] — [URL]
````

---

## 5. Plan Status Lifecycle

```
DRAFT → PLANNED → IN PROGRESS → (BLOCKED) → COMPLETED
```

| Status        | Meaning                                           | Who sets it        |
| ------------- | ------------------------------------------------- | ------------------ |
| `DRAFT`       | Being written — not yet reviewed                  | Author             |
| `PLANNED`     | arch-reviewer approved — ready to start           | `arch-reviewer`    |
| `IN PROGRESS` | Active development                                | Implementing agent |
| `BLOCKED`     | Waiting on dependency — note the blocker inline   | Implementing agent |
| `COMPLETED`   | All acceptance criteria met, `verify:full` passes | Implementing agent |

- Update the `<!-- Status: ... -->` comment at the top of the file.
- `release-gatekeeper` moves `COMPLETED` plans to `plans/archive/`.
- Never change a plan's status to `COMPLETED` until `npm run verify:full` passes and the `help-content-writer` agent has run (for user-facing features).

---

## 6. Plan Review Cadence

| Trigger               | Action                                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| New plan created      | `arch-reviewer` must approve before implementation begins                                                     |
| Plan blocked > 7 days | Founder reviews and either unblocks or deprioritises                                                          |
| Monthly sweep         | Claude Code scans `plans/` for stale IN PROGRESS plans and flags them                                         |
| Post-launch           | `saas-advisor` consulted to validate whether the shipped feature is working as expected given market patterns |

---

## 7. saas-advisor Integration Rules

The `saas-advisor` agent must be consulted **before implementation begins** for any plan that:

- Introduces a new pricing tier, feature gate, or paywall
- Adds a new user-facing flow (onboarding, activation, upgrade CTA)
- Changes how the product is positioned or described to users
- Addresses churn, retention, or re-engagement
- Targets a new buyer persona (e.g., career coaches, university career centers)

It is **optional but recommended** for:

- Internal/admin features with no direct user impact
- Pure infrastructure or performance work
- Bug fixes in existing flows

To invoke: ask the `saas-advisor` agent the questions in §4.2, adapted to your specific plan. Record findings in the Advisory Checkpoint section.

---

## 8. Future Agent Slots

When new agents are created, add them to the agent execution sequence in §4.3 of all **active** plans. Use this placeholder pattern in plans to make additions easy:

```markdown
#### Future agents (add here as created)

- [ ] _new agent placeholder_
```

Known agent slots to fill when built:

- `performance-auditor` — after any change to edge functions or DB queries
- `a11y-checker` — after any new page or component
- `seo-auditor` — after any change to public-facing pages
- `pricing-auditor` — before any pricing page change

---

## 9. Template: Minimal Viable Plan File

Copy this to start a new plan:

````markdown
<!--
  UPDATE LOG
  YYYY-MM-DD | Created — <description> (plan-decomposer)
-->

# P<N> — <Feature Name>

<!-- Status: DRAFT -->

| Field             | Value           |
| ----------------- | --------------- |
| **Phase**         | P<N>            |
| **Priority**      | HIGH            |
| **Tier gating**   | Pro+            |
| **Branch**        | `p<N>-<slug>`   |
| **Created by**    | plan-decomposer |
| **Last reviewed** | YYYY-MM-DD      |

## Goal

<One paragraph: problem → solution → done condition.>

## Advisory Checkpoint — saas-advisor

> Run `saas-advisor` before starting implementation. Paste findings below.

<details>
<summary>saas-advisor findings — YYYY-MM-DD</summary>

_Pending._

</details>

## Agent Execution Sequence

#### Before implementation

- [ ] `saas-advisor` — strategic validation
- [ ] `arch-reviewer` — plan review

#### During implementation

- [ ] `migration-writer` — schema changes
- [ ] `component-scaffolder` — new UI
- [ ] `test-writer` — new hooks/utilities

#### After implementation

- [ ] `convention-auditor`
- [ ] `test-runner`
- [ ] `help-content-writer`
- [ ] `changelog-keeper`
- [ ] `release-gatekeeper`

#### Future agents (add here as created)

- [ ] _new agent placeholder_

## Success Metrics

| Metric | Target | How to measure |
| ------ | ------ | -------------- |
|        |        |                |

## Stories

### Story 1 — <Title>

**User story:**
As a <persona>, I want <capability>, so that <benefit>.

**Acceptance criteria:**

1. Given ..., when ..., then ...

**Files expected to change:**

- `src/...` — reason

**Validation commands:**

```bash
npm run verify:full
```
````

**Risks / non-goals:**

- ...

## Technical Risks

- ...

## Out of Scope

- ...

## References

#### SaaS Podcast advisory

- Advisory guide: `docs/advisory/2026-04-07_saas-podcast-advisory-guide.md`
- Relevant phase: Phase <N>

#### Internal references

- Roadmap: `docs/decisions/product-roadmap.md`
- Vision: `docs/decisions/product-vision.md`

```

```
