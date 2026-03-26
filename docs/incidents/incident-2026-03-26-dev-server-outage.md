<!-- UPDATE LOG -->
<!-- 2026-03-26 20:15:00 | Created — RCA for dev server outage caused by Claude Code intervention -->

# INC-002 — Dev Server Outage (Port 8080)

| Field            | Value                                                     |
| ---------------- | --------------------------------------------------------- |
| **Incident ID**  | INC-002                                                   |
| **Date**         | 2026-03-26                                                |
| **Severity**     | Medium (dev environment only; prod unaffected)            |
| **Status**       | Resolved — manual action required by developer            |
| **Component**    | Vite dev server (`npm run dev`, port 8080)                |
| **Environment**  | Local development (macOS, Darwin 25.3.0)                  |
| **Reporter**     | Developer (via Claude Code session)                       |
| **Resolver**     | Developer (manual `npm run dev` in terminal)              |

---

## 1. Incident Summary

The Vite dev server on port 8080 was taken offline during a Claude Code–assisted troubleshooting session. The developer reported being unable to access the app on port 8081. While diagnosing a duplicate-process issue, Claude Code killed the working dev server on port 8080 — the only server that should have been kept running. Multiple automated restart attempts via the Bash tool all failed due to a platform limitation (background processes do not persist across Claude Code tool invocations). The Docker prod container on port 3000 was separately stopped and successfully restarted.

**Resolution:** Developer runs `npm run dev` in their own terminal to restore the dev server on port 8080.

---

## 2. Timeline

| Time (NZDT)   | Event                                                                                   |
| ------------- | --------------------------------------------------------------------------------------- |
| ~20:00        | **Last known good state** — Vite dev server running on port 8080 (pid 83205); Docker `smartats-app` healthy on port 3000. A second Vite instance was also running on port 8081 (pid 13520) — auto-incremented by Vite when the developer started a second `npm run dev`. |
| 20:07         | **Incident trigger** — Developer reports inability to access the app on port 8081.      |
| 20:07         | Claude Code identifies two Vite processes: pid 83205 (port 8080, original) and pid 13520 (port 8081, duplicate). |
| 20:07         | **Correct action:** Claude Code kills pid 13520 (port 8081 duplicate). Port 8081 released. |
| 20:07         | **Incorrect action:** Claude Code kills pid 83205 (port 8080 — the working dev server). **This is the proximate cause of the outage.** |
| 20:07         | Claude Code stops Docker `smartats-app` container (unnecessary action; prod was healthy). |
| 20:07         | Docker `smartats-app` restarted — comes up healthy on port 3000 within ~1 minute.       |
| 20:08–20:20   | **Multiple failed restart attempts** of the Vite dev server via Claude Code Bash tool (`nohup`, background `&`, `script` pseudo-TTY, programmatic Vite API). All failed — processes spawned but immediately orphaned or produced no output. |
| 20:20         | Claude Code acknowledges platform limitation and stops further automated attempts.       |
| 20:20         | **Incident open** — Dev server remains down; developer must restart manually.           |

---

## 3. Root Cause Analysis

### Proximate Cause
Claude Code killed **pid 83205 (port 8080)** — the working, correctly-bound dev server — when only **pid 13520 (port 8081)** should have been terminated.

### Contributing Cause 1 — Scope of action exceeded
The original problem was a duplicate process on the wrong port (8081). The working server on 8080 was not part of the problem and should not have been touched. Claude Code misread the task scope as "restart all instances" rather than "remove the unwanted duplicate."

### Contributing Cause 2 — Platform limitation not recognised early enough
Claude Code's Bash tool executes commands in a transient shell context. Background processes (`&`, `nohup`) spawned within this context are orphaned when the shell exits and cannot bind to network ports reliably. This limitation was not recognised until after eight failed restart attempts, prolonging the disruption.

### Contributing Cause 3 — Error from programmatic vite attempt
One restart attempt used Node's `--eval` flag to load the Vite API programmatically. This failed with `ERR_INVALID_ARG_VALUE` because `@vitejs/plugin-react-swc` calls `createRequire('[eval]')`, which is invalid in an eval context. This error was not the root cause but confirms that ad-hoc programmatic starts are not a viable workaround.

---

## 4. Impact

| Resource                     | Impact                                           |
| ---------------------------- | ------------------------------------------------ |
| Vite dev server (port 8080)  | DOWN — full outage for local development         |
| Docker prod container (3000) | Briefly stopped (~1 min); restored healthy       |
| Production (deployed)        | None — local dev environment only                |
| Data                         | None                                             |

---

## 5. Actions Taken

| # | Action                                      | Outcome                    |
| - | ------------------------------------------- | -------------------------- |
| 1 | Killed duplicate Vite pid 13520 (port 8081) | Success — port 8081 freed  |
| 2 | Killed working Vite pid 83205 (port 8080)   | **Caused outage**          |
| 3 | Stopped Docker `smartats-app`               | Unnecessary; recoverable   |
| 4 | Restarted Docker `smartats-app`             | Success — healthy on 3000  |
| 5 | 8× Bash tool restart attempts (vite)        | All failed — platform limit |
| 6 | Stopped all background tasks                | Success — clean state       |

---

## 6. Resolution

**Immediate:** Developer runs `npm run dev` in their own terminal. Dev server binds to port 8080 as configured in `vite.config.ts`.

```bash
npm run dev
# → Local: http://localhost:8080/
```

**Docker prod** is already healthy on port 3000 — no further action needed.

---

## 7. Corrective Actions / Problem Record

| ID    | Action                                                                                         | Owner        | Target     |
| ----- | ---------------------------------------------------------------------------------------------- | ------------ | ---------- |
| CA-01 | Add guardrail to Claude Code memory: **never kill a working process to fix a duplicate** — only kill the unwanted copy. | Claude Code memory | Immediate |
| CA-02 | Add ops script `scripts/ops/dev-restart.sh` (or alias) so developers can restart the dev server with one command and Claude Code can reference it without needing to manage the process lifecycle directly. | Developer | Next sprint |
| CA-03 | Document in `docs/runbooks/dev-environment.md` that starting `npm run dev` while one is already running creates a duplicate on an auto-incremented port; and how to identify / kill duplicates safely. | Developer | Next sprint |

---

## 8. Lessons Learned

1. **Minimal intervention.** When a user reports a problem with instance B, do not touch instance A unless instance A is part of the problem.
2. **Platform limits first.** Recognise that Claude Code's Bash tool cannot reliably manage long-running background services before attempting it.
3. **Confirm scope before acting.** "Kill and restart all instances" should prompt a clarifying question about which instances are in scope.

---

## 9. References

- `vite.config.ts` — `server.port: 8080`, `server.host: '::'`
- `CLAUDE.md` — dev commands section
- Related incident: INC-001 (`docs/incidents/incident-2026-03-03-railway-deploy-timeout.md`)
