# /release-check

Run the full SmartATS release readiness check and produce a GO / NO-GO verdict.

## Steps

**1. Open release blockers**

Read `docs/releases/UNTESTED_IMPLEMENTATIONS.md` and count:

- BLOCKED items (hard blockers — no release until resolved)
- CODE-VERIFIED items (soft blockers — need E2E before closing)

**2. Supabase health**

```bash
bash scripts/ops/check-supabase.sh --strict
```

**3. Secrets scan**

```bash
bash scripts/ops/check-secrets.sh
```

**4. Full verify suite**

```bash
npm run verify:full
```

**5. Changelog check**

```bash
bash scripts/ops/check-docs.sh
```

## Output

Produce a structured verdict table:

```
## Release Check — YYYY-MM-DD

**Verdict:** ✅ GO | ❌ NO-GO

| Gate | Status | Notes |
|---|---|---|
| BLOCKED items | ✅ / ❌ | Count: N |
| CODE-VERIFIED items | ⚠️ | Count: N (need E2E) |
| check-supabase.sh | ✅ / ❌ | |
| check-secrets.sh | ✅ / ❌ | |
| npm run verify:full | ✅ / ❌ | |
| check-docs.sh | ✅ / ⚠️ | |

### Blockers to resolve before GO
<!-- list each one with owner from UNTESTED_IMPLEMENTATIONS.md -->
```

**GO** requires: all script gates pass AND zero BLOCKED items in UNTESTED_IMPLEMENTATIONS.md.
