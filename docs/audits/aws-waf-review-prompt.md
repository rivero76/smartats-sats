<!-- UPDATE LOG -->
<!-- 2026-03-31 | Initial creation — AWS Well-Architected Framework review prompt -->

# SmartATS — AWS Well-Architected Framework Review Prompt

<!--
  PURPOSE: Paste this prompt into Claude Code to run a full WAF architecture and code review.
  FREQUENCY: Run before any major release, after significant infrastructure changes, or quarterly.
  AGENTS: arch-reviewer (primary) + security-auditor (Security pillar deep-dive)
  LAST RUN: never
  HOW TO RUN: Open this repo in Claude Code and paste the prompt below.
-->

---

## Which Agents to Use

| Scope                                            | Agent                |
| ------------------------------------------------ | -------------------- |
| Full WAF review (all 6 pillars)                  | `arch-reviewer`      |
| Security pillar deep-dive (RLS, CORS, secrets)   | `security-auditor`   |
| Convention violations (UPDATE LOG, naming, CORS) | `convention-auditor` |
| Security + arch together                         | Run both in parallel |

---

## How to Run

1. Open this repository in Claude Code.
2. To run with `arch-reviewer` only, copy the prompt block below and paste it as a new message.
3. To run `arch-reviewer` + `security-auditor` in parallel, start your message with:
   > "Use the arch-reviewer and security-auditor agents in parallel to perform the following review:"
   > then paste the prompt block.
4. Save the findings report as `docs/audits/reports/YYYY-MM-DD_code-review.md`.
5. Update the `LAST RUN` date above.

---

--- PROMPT START ---

Use the arch-reviewer agent to perform a full architecture and code review of this codebase
through the lens of the AWS Well-Architected Framework (WAF).

Read actual files — do not guess. Be exhaustive. Evaluate all six pillars and produce
findings + recommendations for each.

---

## PILLAR 1 — Operational Excellence

Assess the ability to run, monitor, and continuously improve operations.

Key areas to review:

- **Observability:** centralized-logging edge function, `src/lib/centralizedLogger.ts`,
  `log_entries` table, `fetch-logs.sh`, `clean-logs.sh`
- **Runbooks and incident response:** `docs/runbooks/`, `docs/incidents/`
- **CI/CD quality gates:** `.github/workflows/quality-gates.yml`, `npm run verify`, `npm run verify:full`
- **Deployment automation:** `scripts/ops/smartats.sh`, Docker multi-stage build, Railway deployer
- **Operational scripts coverage:** `scripts/ops/` — are all critical ops tasks scripted?
- **Change management:** UPDATE LOG headers in modified files (enforced via pre-commit hook)
- **Help page parity:** Cross-check `src/data/helpContent.ts` against shipped features:
  - Read `docs/changelog/CHANGELOG.md` and `docs/releases/UNTESTED_IMPLEMENTATIONS.md`
  - For each shipped feature (including E2E-pending), verify a help topic exists
  - For each gap, report: feature name, help topic key that should be created, minimum content needed (2-3 sentence overview + 3-5 steps + 1 tip)
  - Also verify `HelpHub.tsx` renders all topics defined in `helpContent.ts` (no defined-but-unlinked topics)

For each finding, report:

- File path + line number
- Current state assessment: GOOD / NEEDS IMPROVEMENT / RISK
- Concrete recommendation
- Priority: HIGH / MEDIUM / LOW

---

## PILLAR 2 — Security

Assess the ability to protect data, systems, and assets.

Key areas to review:

- **RLS coverage:** every `sats_*` table in `supabase/migrations/` must have RLS policies;
  legacy exceptions: `SATS_resumes`, `document_extractions`, `error_logs`, `profiles`
- **CORS enforcement:** all edge functions must use `_shared/cors.ts` (`isOriginAllowed` +
  `buildCorsHeaders`) — flag any inline CORS logic
- **Auth flow:** `src/contexts/AuthContext.tsx` — `SATSUser` role check, session handling
- **Secret and env var hygiene:** no secrets in source; naming must follow `SATS_*` pattern
- **Provider payload forwarding:** edge functions must use `mapProviderError()` — never
  forward raw OpenAI/provider payloads to clients
- **Edge function config validation:** must return `503` on missing env vars (not `500`)
- **Tenant isolation:** confirm RLS prevents cross-user data access on all key tables

For each finding, report:

- File path + line number
- Violation type (RLS gap / inline CORS / raw payload / secret exposure / wrong status code)
- Severity: CRITICAL / MAJOR / MINOR
- Concrete fix

---

## PILLAR 3 — Reliability

Assess the ability to recover from failures and meet demand.

Key areas to review:

- **Error handling in edge functions:** config errors → `503`; telemetry must be
  non-blocking (all `logEvent()` / centralized-logging calls in `try/catch`)
- **Retry logic:** `callLLM()` `retryAttempts` field — is it set appropriately per task?
- **Async vs sync scoring:** `ats-analysis-direct` (sync) vs `async-ats-scorer` (async) —
  are the right workloads on the right path?
- **Fallback chain:** `OPENAI_MODEL_ATS_FALLBACK` / `gpt-4o-mini` — is it wired correctly
  in `supabase/functions/_shared/llmProvider.ts`?
- **Frontend resilience:** TanStack Query error states in `src/hooks/` — are loading/error
  states handled in components?
- **Graceful degradation:** what happens when an edge function is unreachable?

---

## PILLAR 4 — Performance Efficiency

Assess the ability to use resources efficiently.

Key areas to review:

- **LLM model tiering:** each task uses the appropriate model via `OPENAI_MODEL_<TASK>` env
  vars — verify in `supabase/functions/_shared/llmProvider.ts` and all edge functions
- **Token management:** `maxTokens` set per task; no unbounded requests
- **Async processing:** async-ats-scorer offloads heavy work — is the queue/callback
  pattern correct?
- **Client-side extraction:** `src/services/documentProcessor.ts` — are large files
  handled without blocking the UI thread?
- **TanStack Query caching:** `src/hooks/` — are stale times and cache keys appropriate?
- **Vite build:** `npm run build` output — check for large unoptimised chunks
- **Animation performance:** stagger animations capped at 10 items (`src/lib/animations.ts`);
  flag any ad-hoc Framer Motion values outside this file

---

## PILLAR 5 — Cost Optimization

Assess the ability to avoid unnecessary costs.

Key areas to review:

- **LLM cost tracking:** `costEstimateUsd` in `LLMResponse` — is it being logged/stored?
- **Model governance:** check `docs/specs/technical/llm-model-governance.md` — are
  model assignments aligned with task complexity (avoid over-engineering with heavy models)?
- **Unnecessary LLM calls:** are there any redundant or duplicate calls in the pipeline?
- **Supabase edge function invocation patterns:** are functions invoked only when needed,
  or on every render/navigation?
- **Railway scraper:** `scripts/playwright-linkedin/` — is the scraper triggered on demand
  only, or does it have idle compute?
- **Storage costs:** `STORE_LLM_*` flags — are LLM responses stored selectively?

---

## PILLAR 6 — Sustainability

Assess the minimisation of environmental impact.

Key areas to review:

- **Right-sized models per task:** heavier models (`gpt-4.1`) only for high-stakes tasks
  (ATS scoring); lighter models (`gpt-4.1-mini`) for enrichment, roadmaps, LinkedIn parse
- **Async offloading:** is sync compute minimised on the hot path?
- **Unnecessary re-computation:** are analyses re-run when inputs haven't changed?
- **Animation overhead:** stagger cap at 10 items prevents rendering waste on large lists
- **Dead code / unused imports:** spot-check 10 files in `src/` for unused imports or
  unreachable branches

---

## OUTPUT FORMAT

Return a structured Markdown report with:

1. **Executive summary** — one paragraph per pillar (current state + top gap)
2. **Detailed findings** — one section per pillar, each finding with:
   - File path + line number (where applicable)
   - Pillar and sub-category
   - Assessment: GOOD / NEEDS IMPROVEMENT / RISK
   - Severity: CRITICAL / MAJOR / MINOR
   - Concrete 1–2 sentence fix
3. **Summary findings table** at the end (pillar | finding | severity | fix)
4. **Prioritised action list:**
   - IMMEDIATE (this sprint) — CRITICAL items only
   - SHORT-TERM (next 2 sprints) — MAJOR items
   - BACKLOG — MINOR + sustainability items

Save the output as: `docs/audits/reports/YYYY-MM-DD_code-review.md`
Update `docs/improvements/TECHNICAL_IMPROVEMENTS.md` summary table with new items.

--- PROMPT END ---
