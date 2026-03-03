# BUG: `railway up --path-as-root` times out due to node_modules upload

**Date:** 2026-03-02
**Last updated:** 2026-03-03
**Branch:** p14
**Commit:** 196615d (pushed to origin/p14)
**Severity:** High (blocks all Railway redeployment of the LinkedIn scraper)
**Component:** `scripts/playwright-linkedin/` — Railway deploy pipeline
**Reporter:** Claude Code (automated diagnosis during P14 plan execution)

---

## Summary

`railway up --service smartats-linkedin-scraper --path-as-root --detach scripts/playwright-linkedin` fails with a network timeout on every attempt. The root cause is that the Railway CLI v4.30.5 uploads `node_modules/` (46 MB) even though it is listed in the local `.gitignore`, because Railway CLI's `--path-as-root` mode does not honour `.gitignore` files located inside subdirectories — it only reads `.gitignore` at the git root. No `.railwayignore` file exists in `scripts/playwright-linkedin/`, which is Railway's own ignore mechanism.

---

## What Was Being Done

Executing the two-bug fix described in the P14 plan:

| # | Bug | Status |
|---|-----|--------|
| 1 | Replace `scrollPage()` `page.evaluate` loop with `page.keyboard.press('PageDown')` to survive LinkedIn SPA navigations | **DONE** — `scraper.ts` updated |
| 2 | Fix `railway up` timeout by using `--path-as-root` to upload only the subdirectory | **FAILED** — still times out |

---

## Exact Command That Failed

```bash
# Run from repo root
railway up \
  --service smartats-linkedin-scraper \
  --path-as-root \
  --detach \
  scripts/playwright-linkedin
```

**Railway CLI version:** 4.30.5

---

## Error Output (verbatim, occurred twice — CLI auto-retried)

```
Indexing...
Uploading...
error sending request for url (https://backboard.railway.com/project/26d21e72-14a7-4835-9b84-36827a1accfd/environment/05bc1225-5f20-4005-a5b9-1c51830e79bc/up?serviceId=3f5d8c8b-54eb-4a79-a06c-c7fdcf8604ae)

Caused by:
    operation timed out
```

---

## Root Cause Analysis

### Directory inventory at time of failure

```
scripts/playwright-linkedin/
├── .env.example          4 KB
├── .gitignore            31 B   ← contains "node_modules/" — but Railway ignores this
├── Dockerfile           791 B
├── node_modules/         46 MB  ← uploaded despite .gitignore
├── package-lock.json     43 KB
├── package.json         575 B
├── railway.json         318 B
├── src/                  32 KB  ← actual source
└── tsconfig.json        479 B
```

**Source-only size (excluding node_modules):** ~44 KB — trivially fast to upload.
**Actual upload size:** ~46 MB — causes timeout over the Railway upload endpoint.

### Why `--path-as-root` does not fix it

The Railway CLI resolves ignore rules from the **git root**, not from the `--path-as-root` argument. When `--path-as-root scripts/playwright-linkedin` is passed:

- It correctly restricts what it archives to that subtree.
- But it reads ignore patterns from `.gitignore` at the **git root** (`/`), not from `scripts/playwright-linkedin/.gitignore`.
- The git-root `.gitignore` does not have a `scripts/playwright-linkedin/node_modules/` rule.
- Result: `node_modules/` is included in the archive and uploaded.

### Why there is no `.railwayignore`

Railway's own ignore file (`.railwayignore`) was never created in `scripts/playwright-linkedin/`. This is the correct mechanism for per-service ignore rules when deploying a monorepo subdirectory. It takes precedence over `.gitignore` and is scoped to the directory it lives in.

---

## Impact

- Every `railway up` invocation for this service times out.
- The scraper code fix (Bug 1) cannot be deployed until this is resolved.
- The LinkedIn scraper endpoint (`/scrape-profile`) continues to fail with the execution-context error in production.

---

## Fix

Create `scripts/playwright-linkedin/.railwayignore` with:

```
node_modules/
dist/
*.log
.env
```

Then redeploy:

```bash
railway up \
  --service smartats-linkedin-scraper \
  --path-as-root \
  --detach \
  scripts/playwright-linkedin
```

The archive will shrink from ~46 MB to ~44 KB and the upload will succeed in seconds.

### Alternative fix (if `.railwayignore` still doesn't work)

Use the Railway dashboard's **GitHub integration** instead of CLI upload:
1. Connect the Railway service to the GitHub repo.
2. Set **Root Directory** to `scripts/playwright-linkedin`.
3. Railway will build directly from source using the Dockerfile, bypassing the CLI upload entirely.

---

## Verification (once fix is deployed)

```bash
# Confirm deploy succeeded
railway logs --service smartats-linkedin-scraper

# Test scraper endpoint (90-second timeout — Playwright is slow)
curl -X POST https://smartats-linkedin-scraper-production.up.railway.app/scrape-profile \
  -H "Authorization: Bearer 463a760bedb02688860f99831da81148ca9b47ff2f5905433b1522d8fa74f5c2" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.linkedin.com/in/ricardo-rivero/"}' \
  --max-time 90
```

Expected: `200 OK` with JSON profile data (name, headline, skills, experiences).
Previous failure: `page.evaluate: Execution context was destroyed` — this is fixed by the `scraper.ts` change already committed.

---

## Files Changed and Committed (commit 196615d, pushed to origin/p14)

| File | Change | Deploy status |
|------|--------|---------------|
| `scripts/playwright-linkedin/src/scraper.ts` | Replaced `scrollPage()` `page.evaluate` loop with `page.keyboard.press('PageDown')` × 8; added `waitForLoadState('networkidle')` after both `goto()` calls; wrapped `scrollPage()` call sites in `.catch()` | Pushed — NOT yet live on Railway |
| `scripts/playwright-linkedin/tsconfig.json` | Added `DOM` to `lib` so browser globals in `page.evaluate()` type-check | Pushed — NOT yet live on Railway |
| `docs/bugs/bug-railway-up-path-as-root-timeout.md` | This file — created to document the deploy failure | N/A |

---

## Files Still Needed

| File | Action | Reason |
|------|--------|--------|
| `scripts/playwright-linkedin/.railwayignore` | **Create** with `node_modules/`, `dist/`, `*.log`, `.env` | Required for Railway CLI to exclude `node_modules/` when using `--path-as-root` on a subdirectory |
