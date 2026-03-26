<!-- UPDATE LOG -->
<!-- 2026-03-26 20:15:00 | Created — incident index for SmartATS development environment -->

# SmartATS Incident Register

This index tracks all operational and development incidents for the SmartATS project.
Each incident has a dedicated document in `docs/incidents/`. Link new incidents here as they are created.

**Incident naming:** `incident-YYYY-MM-DD-<short-slug>.md`
**Incident ID:** Sequential — `INC-NNN`

---

## Active Incidents

| ID      | Date       | Severity | Status     | Summary                                          | Document |
| ------- | ---------- | -------- | ---------- | ------------------------------------------------ | -------- |
| INC-002 | 2026-03-26 | Medium   | **OPEN**   | Dev server (port 8080) taken offline by Claude Code during troubleshooting. Requires `npm run dev` in terminal to restore. | [incident-2026-03-26-dev-server-outage.md](incident-2026-03-26-dev-server-outage.md) |

---

## Resolved Incidents

| ID      | Date       | Severity | Resolved   | Summary                                          | Document |
| ------- | ---------- | -------- | ---------- | ------------------------------------------------ | -------- |
| INC-001 | 2026-03-02 | High     | 2026-03-03 | Railway deploy timeout — `node_modules/` (46 MB) uploaded due to Railway CLI ignoring subdirectory `.gitignore`. Fix: add `.railwayignore` to `scripts/playwright-linkedin/`. | [incident-2026-03-03-railway-deploy-timeout.md](incident-2026-03-03-railway-deploy-timeout.md) |

---

## Problem Records

Recurring patterns or systemic issues identified from incidents.

| ID    | Linked Incidents | Problem Description                                                                              | Status |
| ----- | ---------------- | ------------------------------------------------------------------------------------------------ | ------ |
| PRB-01 | INC-002         | Claude Code's Bash tool cannot reliably start or manage long-running background services (Vite, Docker). Background processes orphan when the transient shell exits. | Open — CA-02 in INC-002 |

---

## How to Create a New Incident Record

1. Create a file: `docs/incidents/incident-YYYY-MM-DD-<slug>.md`
2. Use the template below
3. Add a row to the **Active Incidents** table above
4. Move to **Resolved Incidents** when closed, updating the resolved date

### Incident Document Template

```markdown
<!-- UPDATE LOG -->
<!-- YYYY-MM-DD HH:MM:SS | Created — <brief description> -->

# INC-NNN — <Title>

| Field           | Value |
| --------------- | ----- |
| **Incident ID** | INC-NNN |
| **Date**        | YYYY-MM-DD |
| **Severity**    | Critical / High / Medium / Low |
| **Status**      | Open / Resolved |
| **Component**   | |
| **Environment** | Production / Staging / Local dev |
| **Reporter**    | |
| **Resolver**    | |

## 1. Incident Summary
## 2. Timeline
## 3. Root Cause Analysis
## 4. Impact
## 5. Actions Taken
## 6. Resolution
## 7. Corrective Actions / Problem Record
## 8. Lessons Learned
## 9. References
```

### Severity Definitions

| Level    | Definition |
| -------- | ---------- |
| Critical | Production fully unavailable or data loss |
| High     | Production degraded or deployment pipeline blocked |
| Medium   | Dev/staging environment down; prod unaffected |
| Low      | Minor degradation; workaround available |
