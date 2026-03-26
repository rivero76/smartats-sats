<!-- Status: IN PROGRESS — branch: p19-uiux -->

# P19 — UI/UX Excellence Programme

**Created:** 2026-03-26
**Owner:** Claude Code
**Goal:** Elevate SmartATS from functional to delightful — modern motion, consistent typography, enforced accessibility, and visual quality gates — without breaking any existing features.

---

## Guiding Principles

1. **Safety first.** Each stage is independently shippable. A stage can be reverted without affecting others.
2. **Test before and after.** Run `npm run verify:full` before and after every story. Record the result.
3. **No core feature regressions.** ATS analysis, enrichment, LinkedIn import, roadmaps, auth — all must remain fully functional after every story.
4. **Progressive enhancement only.** Add richness on top; never replace working layout or interaction patterns without explicit validation.
5. **Measure.** Each stage defines explicit acceptance criteria and a validation record to fill in.

---

## Stage Overview

| Stage | Theme                                    | Stories          | Effort | Risk    |
| ----- | ---------------------------------------- | ---------------- | ------ | ------- |
| S1    | Foundation — Typography & Motion         | S1-1, S1-2       | 2–4 hr | Low     |
| S2    | Micro-interactions — Animate Existing UI | S2-1, S2-2, S2-3 | 4–6 hr | Low–Med |
| S3    | Quality Gates — a11y & Visual Regression | S3-1, S3-2       | 3–5 hr | Low     |
| S4    | Performance Gate                         | S4-1             | 2–3 hr | Low     |
| S5    | Design System Formalisation              | S5-1             | 4–8 hr | Med     |

---

## Stage 1 — Foundation: Typography & Motion

> **Goal:** Install the two missing pillars (typeface + animation library) as inert infrastructure. No visual changes to end-users yet — just libraries available for Stage 2.

### S1-1 · Install Geist font and define type scale in Tailwind

**Files to change:**

- `package.json` (add `geist` npm package, or use Google Fonts `@import`)
- `src/index.css` (add `@font-face` or `@import`, set `--font-sans` CSS var)
- `tailwind.config.ts` (add `fontFamily.sans: ['Geist', 'Inter', 'ui-sans-serif']`)

**Acceptance criteria:**

- [ ] `npm run build` passes — no new warnings
- [ ] `npm run verify` green
- [ ] App loads with Geist font visible in browser devtools (Network → Fonts)
- [ ] Existing layout is pixel-for-pixel identical (no text reflow on key pages: Dashboard, Analyses, Resume upload)
- [ ] Dark mode still correct

**Validation record:**

```
Date:
Before verify: PASS / FAIL
After verify:  PASS / FAIL
Font visible in devtools: YES / NO
Layout regression: YES / NO
Tester:
```

**Risks:** Font load FOUT (flash of unstyled text). Mitigate: add `font-display: swap` and preload `<link>` in `index.html`.

---

### S1-2 · Install Framer Motion and create animation presets

**Files to change:**

- `package.json` (add `framer-motion`)
- `src/lib/animations.ts` (NEW — named presets only, no component changes yet)

**`src/lib/animations.ts` content (presets only):**

```ts
// Reusable Framer Motion variants for consistent motion across the app
export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
}
export const slideUp = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
}
export const scaleIn = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: 'easeOut' } },
}
export const listItem = { hidden: { opacity: 0, x: -4 }, visible: { opacity: 1, x: 0 } }
export const staggerContainer = { visible: { transition: { staggerChildren: 0.05 } } }
```

**Acceptance criteria:**

- [ ] `npm run build` passes
- [ ] `npm run verify` green
- [ ] `src/lib/animations.ts` exists and exports named variants
- [ ] No components have been modified (presets only — Stage 2 applies them)
- [ ] Bundle size increase < 40 KB gzipped (Framer Motion tree-shakes well)

**Validation record:**

```
Date:
Before verify: PASS / FAIL
After verify:  PASS / FAIL
Bundle delta (npm run build output): __ KB
Tester:
```

---

## Stage 2 — Micro-interactions: Animate Existing UI

> **Goal:** Apply the presets from S1-2 to high-visibility interaction points. Three targeted stories — modals, page transitions, lists. Each story is independently testable and revertable.

### S2-1 · Animate modals and dialogs

**Scope:** All Dialog, Sheet, and Drawer components.

**Files to change:**

- `src/components/ui/dialog.tsx` — wrap `DialogContent` in `<motion.div>` with `scaleIn` variant
- `src/components/ui/sheet.tsx` — wrap `SheetContent` with `slideUp`
- `src/components/ui/drawer.tsx` — wrap `DrawerContent` with `slideUp`

**Do NOT change:** Any logic, state, form handlers, or close behaviour.

**Acceptance criteria:**

- [ ] `npm run verify` green
- [ ] ATS Analysis modal opens/closes with scale animation — no jank
- [ ] Enrich Experience modal opens/closes correctly — form still submits
- [ ] Sheet (sidebar on mobile) animates in from correct direction
- [ ] ESC key and backdrop click still close all modals
- [ ] Reduced-motion respected (`@media (prefers-reduced-motion)` → `transition: none`)

**Validation record:**

```
Date:
Before verify: PASS / FAIL
After verify:  PASS / FAIL
ATS modal: PASS / FAIL
Enrich modal: PASS / FAIL
ESC close: PASS / FAIL
Reduced-motion: PASS / FAIL
Tester:
```

---

### S2-2 · Animate page transitions

**Scope:** Route-level page mounts only.

**Files to change:**

- `src/App.tsx` (or wherever `<Outlet />` lives) — wrap outlet with `<AnimatePresence>` + `<motion.div variants={fadeIn}>`

**Acceptance criteria:**

- [ ] `npm run verify` green
- [ ] Each route change has a 200ms fade-in (not slide, to avoid content jump)
- [ ] No double-render or flash on initial load
- [ ] Back-button navigation works correctly
- [ ] Auth redirect (`/auth` → `/`) still works without animation stutter

**Validation record:**

```
Date:
Before verify: PASS / FAIL
After verify:  PASS / FAIL
Route transitions: PASS / FAIL
Back button: PASS / FAIL
Auth redirect: PASS / FAIL
Tester:
```

---

### S2-3 · Animate list renders (analyses, resumes, jobs)

**Scope:** The three primary data list pages.

**Files to change:**

- `src/pages/ATSAnalyses.tsx` — wrap list container in `staggerContainer`, each card in `listItem`
- `src/pages/Resumes.tsx` — same pattern
- `src/pages/JobDescriptions.tsx` — same pattern

**Acceptance criteria:**

- [ ] `npm run verify` green
- [ ] Lists stagger in on first load (50ms between items, max 10 items animated to avoid delay)
- [ ] Adding a new item (after form submit) animates in without reanimating the whole list
- [ ] Deleting an item has an exit animation (`AnimatePresence` with `exit` variant)
- [ ] Loading skeleton states are unaffected

**Validation record:**

```
Date:
Before verify: PASS / FAIL
After verify:  PASS / FAIL
Initial stagger: PASS / FAIL
New item animation: PASS / FAIL
Delete animation: PASS / FAIL
Skeletons unaffected: PASS / FAIL
Tester:
```

---

## Stage 3 — Quality Gates: Accessibility & Visual Regression

> **Goal:** Catch regressions automatically. Add axe-core to the test suite (fail PRs on a11y violations) and set up Playwright screenshot baselines for the 5 main pages.

### S3-1 · Add axe-core accessibility tests to Vitest

**Files to change:**

- `package.json` (add `@axe-core/react`, `vitest-axe` or `jest-axe` as devDependency)
- `tests/unit/a11y/` (NEW directory — one test file per page component)
- `.github/workflows/quality-gates.yml` (ensure a11y test step is blocking)

**Test pattern (per page):**

```ts
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { Dashboard } from '@/pages/Dashboard'

expect.extend(toHaveNoViolations)

it('Dashboard has no a11y violations', async () => {
  const { container } = render(<Dashboard />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

**Pages to cover (minimum viable set):** Dashboard, Resumes, JobDescriptions, ATSAnalyses, Settings.

**Acceptance criteria:**

- [ ] `npm run test` green with new a11y tests
- [ ] All 5 page tests pass with zero violations
- [ ] CI `quality-gates.yml` runs a11y tests in a blocking step
- [ ] If a violation is introduced, the test fails with a specific description (not a generic error)

**Validation record:**

```
Date:
Before verify: PASS / FAIL
After verify:  PASS / FAIL
All 5 page a11y tests: PASS / FAIL
CI blocking: YES / NO
Tester:
```

---

### S3-2 · Add Playwright visual screenshot baselines

**Files to change:**

- `playwright.config.ts` (NEW or update if partial config exists)
- `tests/e2e/visual/` (NEW — one spec per main page)
- `.github/workflows/quality-gates.yml` (add visual regression job, non-blocking initially)

**Test pattern:**

```ts
test('Dashboard visual baseline', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveScreenshot('dashboard.png', { maxDiffPixelRatio: 0.02 })
})
```

**Pages to baseline:** Dashboard, Resumes, ATSAnalyses, Experiences, Settings.

**Note:** Start with `--update-snapshots` to create baselines. After baseline is committed, the CI step compares against it. Set `maxDiffPixelRatio: 0.02` (2% pixel diff tolerance) to avoid flakiness from anti-aliasing.

**Acceptance criteria:**

- [ ] Baselines generated and committed for all 5 pages
- [ ] `npx playwright test tests/e2e/visual/` passes locally
- [ ] CI runs visual tests — non-blocking initially (tolerance for CI vs local rendering differences)
- [ ] Promotion path documented: when CI screenshots are stable for 2 sprints, flip to blocking

**Validation record:**

```
Date: 2026-03-26
Implementation: COMPLETE
Baselines committed: NO — run `npm run test:visual:update` with credentials to generate and commit
Local run: PENDING (requires PLAYWRIGHT_TEST_EMAIL + PLAYWRIGHT_TEST_PASSWORD + built app)
CI run: PENDING (non-blocking job added to quality-gates.yml; will skip without secrets)
Tester: Claude Code (S3-2 scaffold)
Notes: Auth setup uses #signin-email / #signin-password selectors from Auth.tsx.
       To generate baselines: npm run build && PLAYWRIGHT_TEST_EMAIL=... PLAYWRIGHT_TEST_PASSWORD=... npm run test:visual:update
```

---

## Stage 4 — Performance Gate

> **Goal:** Prevent bundle size regressions and catch Core Web Vitals degradations in CI.

### S4-1 · Add bundle analyser + Lighthouse CI gate

**Files to change:**

- `package.json` (add `rollup-plugin-visualizer` as devDependency; add `lighthouse` + `@lhci/cli`)
- `vite.config.ts` (add `visualizer()` plugin under `build.rollupOptions.plugins`)
- `lighthouserc.json` (NEW — thresholds: performance ≥ 80, a11y ≥ 90, best-practices ≥ 90)
- `.github/workflows/quality-gates.yml` (add Lighthouse CI job against built app)

**Acceptance criteria:**

- [ ] `npm run build` generates `dist/stats.html` (bundle treemap)
- [ ] Bundle size baseline recorded: `__ KB` gzipped (document after first run)
- [ ] Lighthouse CI score: performance ≥ 80, a11y ≥ 90 on Dashboard
- [ ] If a future PR drops performance below threshold, CI fails with score report

**Validation record:**

```
Date:
Bundle size (gzipped total): __ KB
Lighthouse performance: __
Lighthouse a11y: __
Lighthouse best-practices: __
CI gate: PASS / FAIL
Tester:
```

---

## Stage 5 — Design System Formalisation

> **Goal:** Document components in Storybook so the design system is visible, consistent, and catches drift. This is the highest-effort stage and is optional for v1 production.

### S5-1 · Bootstrap Storybook with existing shadcn/ui components

**Files to change:**

- `.storybook/` directory (NEW — `main.ts`, `preview.ts`, Tailwind/dark-mode setup)
- `src/stories/` (NEW — one `.stories.tsx` per core component: Button, Card, Badge, Input, Dialog, Table)
- `package.json` (add `@storybook/react-vite`, `@storybook/addon-a11y`)

**Story minimum (per component):**

- Default state
- All variants (destructive, outline, ghost, etc.)
- Dark mode (using Storybook dark background parameter)
- a11y addon panel enabled

**Acceptance criteria:**

- [ ] `npx storybook dev` starts without errors
- [ ] 6 core component stories render correctly
- [ ] Dark mode toggle works in Storybook
- [ ] `@storybook/addon-a11y` panel shows zero violations for all stories
- [ ] `npm run build` still passes (Storybook is dev-only, not in production bundle)
- [ ] `npm run verify` still green

**Validation record:**

```
Date:
Storybook dev start: PASS / FAIL
Stories rendering: __ / 6
Dark mode: PASS / FAIL
a11y violations: __
Build unaffected: PASS / FAIL
Verify: PASS / FAIL
Tester:
```

---

## Non-Goals (Out of Scope for P19)

- Custom design token pipeline (Figma → Tokens Studio → JSON → CSS) — high effort, requires Figma licence
- GSAP or complex sequenced animations — Framer Motion covers 95% of use cases
- Full i18n (tracked separately as P3-1)
- Component library publishing / Chromatic cloud hosting
- Replacing any existing shadcn/ui component with a custom implementation

---

## Regression Checklist (run after every story)

Before merging any story, manually verify:

| Flow                    | Expected                                    | Pass? |
| ----------------------- | ------------------------------------------- | ----- |
| Sign in / Sign out      | Auth works, redirect correct                |       |
| Upload resume (PDF)     | Extraction succeeds, resume visible in list |       |
| Create job description  | Saved, appears in list                      |       |
| Run ATS analysis        | Score returned, modal opens                 |       |
| Enrich experience       | Suggestions generated, save works           |       |
| Generate roadmap        | Milestones render                           |       |
| Admin → Log viewer      | Logs load, filter works                     |       |
| Dark mode toggle        | All pages correct                           |       |
| Mobile viewport (375px) | No overflow, sidebar accessible             |       |

---

## References

- Gap analysis: conversation 2026-03-26 (Claude Code UI/UX comparison)
- Backlog entries: `docs/improvements/TECHNICAL_IMPROVEMENTS.md` § UIUX-1 through UIUX-7
- Framer Motion docs: https://www.framer.com/motion/
- shadcn/ui theming: `src/index.css`, `tailwind.config.ts`
- axe-core: https://github.com/dequelabs/axe-core
- Lighthouse CI: https://github.com/GoogleChrome/lighthouse-ci
