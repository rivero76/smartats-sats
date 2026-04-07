# INCIDENT: OneDrive fileproviderd overload — node_modules in synced directory

**Date:** 2026-03-26
**Severity:** Medium (laptop performance degraded; dev work slowed but not blocked)
**Component:** macOS OneDrive File Provider (`fileproviderd`) / `smartats-sats` project directory
**Reporter:** Ricardo Rivero (observed during Claude Code `/init` session)

---

## Summary

`fileproviderd` (pid 694) consumed excessive CPU and I/O resources while Claude Code performed rapid file reads across the `smartats-sats` project. The project is stored inside a OneDrive-synced directory (`~/Library/CloudStorage/OneDrive-Personal/eIT/Git_Projects/smartats-sats/`), causing OneDrive's File Provider daemon to track every file access through a SQLite metadata database. The burst of reads during codebase exploration overwhelmed the sync tracking queue.

---

## Root Cause

The `node_modules/` directory (289 MB, tens of thousands of files) was present inside the OneDrive-synced project folder. Every file read by Claude Code triggered a SQLite index lookup in `fileproviderd`. The `sample` analysis confirmed the hot thread was:

```
DispatchQueue: com.microsoft.OneDrive-mac.FileProvider — database
  → sqlite3BtreeTableMoveto / sqlite3BtreeIndexMoveto
    → pread  (1361/2065 samples blocked on disk reads)
```

OneDrive has no special-case exclusion for `node_modules/`, so it attempts to sync and track all 289 MB of dependency files.

---

## Impact

- Laptop fan spin-up and CPU saturation during `/init` and other codebase exploration tasks.
- `fileproviderd` physical footprint: 29 MB, with thousands of SQLite reads per second.
- No data loss. No service outage. Dev environment remained functional.

---

## Remediation

### Immediate (2026-03-26)

Remove `node_modules/` from the OneDrive-synced project directory:

```bash
rm -rf ~/Library/CloudStorage/OneDrive-Personal/eIT/Git_Projects/smartats-sats/node_modules
```

Restore dependencies at any time with:

```bash
npm install
```

### Follow-up (recommended)

1. **Exclude `node_modules/` from OneDrive sync permanently** — use OneDrive's selective sync or add a `.nosync` marker so it is never re-uploaded.
2. **Long-term:** Move active development projects out of OneDrive and into a non-synced directory (e.g. `~/Developer/`). Use git remotes for backup instead of cloud file sync.

---

## Timeline

| Time (NZDT) | Event                                                        |
| ----------- | ------------------------------------------------------------ |
| ~20:26      | `fileproviderd` launched (normal startup)                    |
| ~20:58      | High resource usage observed; `sample` diagnostic captured   |
| 20:58       | Root cause identified: OneDrive + node_modules burst reads   |
| 2026-03-26  | `node_modules` removed; `npm install` to restore when needed |

---

## Prevention

- Add `node_modules/` to `.nosync` or OneDrive exclusion list for all projects in the OneDrive path.
- Consider repo-level `.onedriveignore` or moving dev projects outside OneDrive entirely.
