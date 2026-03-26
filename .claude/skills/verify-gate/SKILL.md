---
name: verify-gate
description: Run the full local verification suite and produce a go/no-go verdict before committing or deploying. Trigger when the user says "run verify", "check before merge", "is it ready", "run all checks", or "pre-deploy check".
---

# Verify and Gate

## Run all gates in order

Do not skip a gate even if an earlier one fails — collect all results before reporting.

### Gate 1 — Full verify suite

```bash
npm run verify:full
```

Runs: ESLint → TypeScript type-check → Vitest tests → Vite build. A non-zero exit is a hard FAIL.

### Gate 2 — Secrets scan

```bash
bash scripts/ops/check-secrets.sh
```

Scans staged/changed files for credential patterns. Non-zero exit is a hard FAIL.

### Gate 3 — Documentation check

```bash
bash scripts/ops/check-docs.sh
```

Verifies that `docs/changelog/CHANGELOG.md` has been updated. Non-zero exit is a soft WARN (not a hard FAIL unless a release is imminent).

### Gate 4 — UPDATE LOG compliance

```bash
bash scripts/ops/check-update-log.sh
```

Checks that modified TS/JS/SQL/HTML files have UPDATE LOG headers. Currently non-blocking in CI (P1-13 open), so treat as WARN.

### Gate 5 — Open release blockers

Read `docs/releases/UNTESTED_IMPLEMENTATIONS.md`. Count BLOCKED items.

- Any BLOCKED item = FAIL for a production release
- CODE-VERIFIED items = WARN (need E2E before closing, but do not block a dev merge)

## Output format

```
## Verify Gate Results

**Verdict:** ✅ PASS | ⚠️ PASS WITH WARNINGS | ❌ FAIL

| Gate | Status | Detail |
|---|---|---|
| npm run verify:full | ✅ / ❌ | Exit code N; N tests passed |
| check-secrets.sh | ✅ / ❌ | Clean / N findings |
| check-docs.sh | ✅ / ⚠️ | Up to date / changelog not updated |
| check-update-log.sh | ✅ / ⚠️ | N files missing headers |
| Release blockers | ✅ / ⚠️ / ❌ | N BLOCKED, N CODE-VERIFIED |

### Action items
<!-- List any FAIL or WARN items with the exact fix needed -->
```

## Verdict rules

- **✅ PASS** — all hard gates exit 0, zero BLOCKED release items
- **⚠️ PASS WITH WARNINGS** — hard gates pass but soft warnings exist; safe to merge to dev, not safe to deploy to production
- **❌ FAIL** — any hard gate non-zero, or BLOCKED release items exist when running a production release check
