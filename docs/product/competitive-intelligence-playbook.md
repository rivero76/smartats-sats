# Competitive Intelligence Playbook

> **Purpose:** Repeatable process to audit SmartATS features, research the competitive market, and identify strategic opportunities.
> Run this playbook periodically (recommended: quarterly) to track how the product and market evolve over time.

---

## The Request (Canonical Prompt)

> *"Acting as a product manager: collect all current and future features of the product from internal documentation (markdown files, app pages, help pages). Record these in a features inventory file. Then search the internet for similar products in the market and record competitor profiles in a separate file. Finally, perform a structured comparison covering features, advantages, disadvantages, monetization, and opportunities not yet identified for the product."*

---

## Process Steps

### Step 1 — Feature Inventory (Internal Research)

**Goal:** Capture every current and planned feature from authoritative internal sources.

**Inputs to read:**
| Source | What to extract |
|---|---|
| `docs/decisions/product-roadmap.md` | Overall feature vision, phased plan, priority order |
| `docs/specs/` | Per-feature specs and acceptance criteria |
| `plans/` and `plans/archive/` | Active and completed implementation plans (Px stories) |
| `src/pages/*.tsx` | Page-level features; look for "Coming Soon", "Upcoming", placeholder panels |
| `src/components/` | Feature components; help content; admin panels |
| `docs/changelog/CHANGELOG.md` | Recently shipped features (implementation evidence) |
| `README.md` | Product overview and stack |
| `docs/help/` | In-app help documentation (reflects what users see) |

**What to classify per feature:**
- Name and description
- Status: `Live` / `In Progress` / `Planned` / `Placeholder`
- Source file reference
- Tier hint (Free / Pro / Enterprise) if mentioned

**Output file:** `docs/product/runs/YYYY-MM-DD_features-inventory.md`

---

### Step 2 — Competitor Research (External Research)

**Goal:** Profile at least 8–12 competitor products in the job-seeker AI/ATS optimization space.

**Search queries to use:**
```
AI resume optimizer ATS checker tool 2025 2026
resume scoring AI job seeker tool pricing
ATS resume checker competitors Jobscan Resumeworded
AI career coaching resume optimization SaaS
resume optimization tool BYOK AI model
career intelligence platform job seeker AI
best AI tools for job seekers comparison
resume builder market alternatives pricing tiers
```

**For each competitor, capture:**
| Field | Description |
|---|---|
| Product name + URL | Official product page |
| Core features | What it does, 5–10 bullet points |
| Pricing | All tiers: Free / Entry / Mid / Premium / Lifetime |
| Key differentiators | What makes it stand out vs. the field |
| Known weaknesses | Common complaints, review site findings |
| Target audience | Who it is designed for |
| Business model | Freemium / SaaS / trial-to-paid / lifetime / B2B |
| Market position | Brand recognition, user base size, reviews |

**Minimum competitor set to research:**
Jobscan, Resume Worded, Teal, Rezi, Kickresume, Enhancv, Careerflow, Huntr, Jobright.ai, SkillSyncer, Novoresume, Zety

**Output file:** `docs/product/runs/YYYY-MM-DD_competitor-analysis.md`

---

### Step 3 — Comparative Analysis & Opportunities

**Goal:** Compare SmartATS against the competitive landscape; identify strategic gaps and opportunities.

**Analysis dimensions:**
1. **Feature comparison matrix** — SmartATS vs. all competitors, feature-by-feature
2. **Where SmartATS wins** — genuine competitive advantages (with evidence)
3. **Where SmartATS loses** — gaps, table-stakes features missing, moats to close
4. **Monetization analysis** — current market pricing models; recommended SmartATS tier structure
5. **Untapped opportunities** — whitespace the product does not yet address
6. **Strategic risks** — competitive threats, dependency risks, timing risks
7. **Priority PM recommendations** — ranked action items

**Output file:** `docs/product/runs/YYYY-MM-DD_competitive-comparison.md`

---

## Output File Structure

All run outputs are stored in `docs/product/runs/` with the execution date in the filename:

```
docs/product/runs/
  YYYY-MM-DD_features-inventory.md
  YYYY-MM-DD_competitor-analysis.md
  YYYY-MM-DD_competitive-comparison.md
```

The latest run is also symlinked (or manually copied) to the top-level files for easy access:

```
docs/product/
  features-inventory.md       ← latest run
  competitor-analysis.md      ← latest run
  competitive-comparison.md   ← latest run
  competitive-intelligence-playbook.md  ← this file
  runs/                       ← all historical runs
```

---

## How to Compare Across Runs

When a new run is completed, compare against the previous run on these dimensions:

### Feature Delta
- New features that moved from `Planned` → `Live`
- New features added to the roadmap since last run
- Features that were removed or de-prioritized

### Competitor Delta
- New competitors that entered the market
- Pricing changes at existing competitors
- Competitors that shut down or pivoted
- New features launched by competitors

### Opportunity Delta
- Opportunities from the previous run that have now been addressed
- New opportunities identified in this run
- Opportunities that are now less relevant (market moved)

---

## Run Log

| Run Date | Features Inventory | Competitor Analysis | Comparison Report | Notes |
|---|---|---|---|---|
| [2026-03-27](#run-2026-03-27) | [2026-03-27_features-inventory.md](runs/2026-03-27_features-inventory.md) | [2026-03-27_competitor-analysis.md](runs/2026-03-27_competitor-analysis.md) | [2026-03-27_competitive-comparison.md](runs/2026-03-27_competitive-comparison.md) | Initial run — baseline |

---

## Run Archive

---

### Run: 2026-03-27

**Executed by:** Claude Code (claude-sonnet-4-6) acting as Product Manager
**Trigger:** Manual request from product owner

#### Inputs Used

| Source | Key findings |
|---|---|
| `docs/decisions/product-roadmap.md` | Master feature roadmap across P7–P21 |
| `plans/` (p14, p19, sats_migration_plan) | Active implementation plans |
| `src/pages/Dashboard.tsx` | Dashboard placeholders: Advanced Reports, Email Notifications, Data Export, Analytics, 2FA, API Access |
| `src/pages/Settings.tsx` | Settings placeholders: Notification prefs, Update Password (Coming Soon), 2FA (Coming Soon), Data Export, API Key Generation |
| `src/pages/ATSAnalyses.tsx` | ATS analysis UI and feature surface |
| `src/pages/MyResumes.tsx` | Resume management features |
| `src/pages/JobDescriptions.tsx` | JD management features |
| `src/components/PersonaManager.tsx` | Multi-persona feature |
| `src/components/help/HelpButton.tsx` | In-app Help Hub |
| `src/components/admin/` | Admin observability panels (LogCleanupManager, LogViewer, ObservabilityPanel, LoggingControlPanel) |
| `src/components/ResumePreview.tsx` | Resume preview component |
| `supabase/functions/_shared/llmProvider.ts` | LLM abstraction, deterministic scoring config |
| `supabase/functions/ats-analysis-direct/` | ATS scoring edge function |
| `docs/changelog/CHANGELOG.md` | Recently shipped features evidence |
| `README.md` | Product and stack overview |

#### Features Snapshot (2026-03-27)

**Live Feature Count:** 18 major feature sets
**In-Progress Features:** P13 (66%), P14 (80%), P15 (100% dev / pending E2E), P18 (100% dev / pending E2E), P19 (25%)
**Planned Features:** P16, P17, P20, P21 (0% started)
**UI Placeholders:** 10 visible-but-unimplemented features across Dashboard and Settings

Key live features:
- ATS Scoring & Analysis (deterministic, seed=42, temperature=0, schema-locked)
- Experience Enrichment (evidence-grounded, risk-flagged AI suggestions)
- Resume Personas (named persona strategy with AI-tailored content)
- Upskilling Roadmaps with milestones and progress tracking (Beta, P15)
- Proactive Job Discovery with async ATS scoring (P14, 80%)
- LinkedIn Profile Import via Playwright scraper (P13, 66%)
- CV Optimisation Score / projected improvement (P18, 100% dev)
- LLM Provider Abstraction (environment-driven, switchable)
- Admin Observability Dashboard (logging, cost anomaly detection)
- Help Hub (in-app searchable documentation)

#### Competitors Researched (2026-03-27)

12 competitors profiled with pricing, features, differentiators, and weaknesses:

| Competitor | Category | Price Range | Key Differentiator |
|---|---|---|---|
| Jobscan | ATS Optimization Leader | $15–$50/mo | Multi-ATS platform simulation (unique) |
| Resume Worded | Resume Scoring | ~$19/mo | Smart keyword weighting; highest Trustpilot trust |
| Teal | All-in-one Career OS | Free–$29/mo | Most generous free tier; 4M+ users |
| Rezi | Resume Builder + ATS | $29/mo or $149 lifetime | Lifetime deal pricing |
| Kickresume | AI Builder + Career Intel | $8–$24/mo | Career Map (free); lowest annual price |
| Enhancv | Human + ATS Builder | $13–$25/mo | Creative sections; design-first philosophy |
| Careerflow | LinkedIn-first Platform | $14–$24/mo | Best free LinkedIn optimizer |
| Huntr | Premium Job Tracker | $27–$40/mo | Best application lifecycle management |
| Jobright.ai | AI Job Matching | $15–$30/mo | Proactive job discovery (400K+ postings/day) |
| SkillSyncer | Budget ATS Scanner | Free–$15/mo | Most generous free ATS matching |
| Novoresume | Design-focused Builder | $20/mo or $100/yr | Multi-language support (5 languages) |
| Zety | Beginner Resume Wizard | $6–$26/mo | Best beginner wizard UX |

#### Key Findings (2026-03-27)

**SmartATS unique advantages (no competitor matches all of these simultaneously):**
1. Deterministic AI scoring (seed=42, temperature=0) — unique in market
2. Evidence-grounded enrichment (cites resume evidence, flags unsupported claims) — unique
3. Upskilling roadmaps tied to skill-gap origin with milestones — only Kickresume's Career Map is directional, with no resources/milestones
4. Proactive job discovery + ATS scoring in a single platform — Jobright does discovery, Jobscan does scoring; nobody does both
5. Named persona management strategy — not just "multiple resumes"

**Most critical gaps vs. competitors:**
1. No published pricing — blocking every marketing and growth effort
2. Free tier undefined — Teal and Kickresume offer very generous free tiers; SmartATS has no clear answer
3. LinkedIn profile optimizer missing — Careerflow (free), Jobscan, Resume Worded all have this
4. No multi-ATS simulation — Jobscan's sole unambiguous technical moat ($49.95/mo)
5. Resume template library limited — most competitors have 40–100+ templates

**Top 8 untapped opportunities identified:**
1. **"Career Intelligence Platform" category positioning** — no competitor has claimed this label
2. **BYOK viral channel** — unique in market; zero COGS on free tier; developer/power-user acquisition
3. **B2B recruiter/hiring manager side** — invert the scoring engine for SMB ATS use case
4. **Multi-ATS simulation** — close Jobscan's moat; start with Workday
5. **Community/cohort benchmarking** — anonymized insights creating network effects
6. **Course/certification affiliate integrations** — close the gap-to-learning loop; affiliate revenue from Coursera/Udemy/etc.
7. **Outplacement / HR B2B channel** — white-label to outplacement firms; bypass B2C CAC entirely
8. **Scoring API for job boards** — embedded SmartATS scoring sold per-call or per-seat to third parties

**Recommended pricing model:**
| Tier | Features | Price |
|---|---|---|
| Free | 3 ATS analyses/month, 1 active persona, 1 roadmap | $0 |
| Pro | Unlimited analyses, personas, enrichment, job discovery | $19–24/month |
| BYOK | Same as Pro, user provides API key | $0 COGS to platform |
| Enterprise | Multi-tenancy, RBAC, API access, SSO, audit logs | Custom |

#### Output Files (2026-03-27)

- [docs/product/runs/2026-03-27_features-inventory.md](runs/2026-03-27_features-inventory.md)
- [docs/product/runs/2026-03-27_competitor-analysis.md](runs/2026-03-27_competitor-analysis.md)
- [docs/product/runs/2026-03-27_competitive-comparison.md](runs/2026-03-27_competitive-comparison.md)

---

*Next recommended run: 2026-06-27 (quarterly cadence)*
