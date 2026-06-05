# SmartATS — Architecture Diagrams

Generated: 2026-06-05  
Format: Mermaid (compatible with Notion, mermaid.live, GitHub, and any Mermaid renderer)

---

## Diagram 1 — System Context (C4 Level 1)

Who it's for: stakeholders, new engineers, investors.  
Shows the product as a black box and all external systems it touches.

```mermaid
C4Context
  title SmartATS — System Context

  Person(user, "Job Seeker", "Uses SmartATS to optimise resumes, analyse ATS fit, and plan their job search")
  Person(admin, "Admin", "Manages users, feature flags, logs, and plan overrides")

  System(smartats, "SmartATS", "Web application for ATS scoring, career intelligence, resume enrichment, and job targeting")

  System_Ext(openai, "OpenAI API", "LLM inference — GPT-4.1 for scoring, GPT-4.1-mini for enrichment, roadmaps, interview prep")
  System_Ext(supabase, "Supabase", "Postgres database, Auth, Storage, and Deno Edge Functions runtime")
  System_Ext(linkedin, "LinkedIn", "Source of job postings and candidate profile data (scraper-gated)")
  System_Ext(railway, "Railway", "Hosts the Playwright LinkedIn scraper as a standalone service")
  System_Ext(postmark, "Postmark", "Inbound email webhook — receives forwarded job description emails")
  System_Ext(resend, "Resend", "Transactional email — upgrade request notifications to admin")
  System_Ext(adzuna, "Adzuna / RapidAPI", "External job board APIs for live job discovery")
  System_Ext(vercel, "Vercel", "Hosts the public marketing site (static)")

  Rel(user, smartats, "Uses", "HTTPS / browser")
  Rel(admin, smartats, "Manages", "HTTPS / browser")
  Rel(smartats, supabase, "Reads/writes data, invokes edge functions, authenticates users", "HTTPS / REST + WebSocket")
  Rel(supabase, openai, "Calls LLM inference via callLLM()", "HTTPS")
  Rel(smartats, railway, "Triggers LinkedIn scrape jobs", "HTTPS")
  Rel(railway, linkedin, "Scrapes public job and profile pages", "Playwright / HTTPS")
  Rel(postmark, supabase, "Delivers inbound email events", "HTTPS webhook")
  Rel(supabase, resend, "Sends upgrade notification emails", "HTTPS")
  Rel(supabase, adzuna, "Fetches live job listings", "HTTPS")
  Rel(vercel, user, "Serves marketing pages", "HTTPS")
```

---

## Diagram 2 — Container Diagram (C4 Level 2)

Who it's for: engineers, DevOps.  
Shows every deployed runtime unit and how data flows between them.

```mermaid
C4Container
  title SmartATS — Container Diagram

  Person(user, "Job Seeker / Admin", "Browser user")

  Container_Boundary(spa, "SmartATS Web App (Docker + nginx)") {
    Container(react, "React SPA", "React 18, Vite, TypeScript", "All UI pages, TanStack Query hooks, client-side PDF/DOCX parsing")
    Container(docparser, "Document Processor", "PDF.js, Mammoth (browser)", "Extracts text from PDF and DOCX client-side — no file upload to server")
  }

  Container_Boundary(supabase_boundary, "Supabase Platform") {
    Container(supabase_auth, "Supabase Auth", "GoTrue", "JWT-based authentication, session management, password reset")
    Container(supabase_db, "Postgres + RLS", "PostgreSQL 15", "All application data — resumes, jobs, analyses, profiles, logs")
    Container(supabase_storage, "Supabase Storage", "S3-compatible", "Resume file uploads")
    Container(edge_fns, "Edge Functions", "Deno runtime", "20 serverless functions — scoring, enrichment, ingestion, logging")
  }

  Container_Boundary(scraper, "LinkedIn Scraper (Railway)") {
    Container(playwright, "Playwright Scraper", "Node.js + Playwright", "Scrapes LinkedIn job pages and profile pages on demand")
  }

  Container_Boundary(marketing_boundary, "Marketing Site (Vercel)") {
    Container(marketing, "Static Marketing Site", "HTML/CSS (Vercel)", "index.html (EN), br.html (pt-BR), investor.html")
  }

  System_Ext(openai, "OpenAI API", "GPT-4.1, GPT-4.1-mini")
  System_Ext(postmark, "Postmark", "Inbound email webhook")
  System_Ext(resend, "Resend", "Transactional email")
  System_Ext(adzuna, "Adzuna / RapidAPI", "Job board APIs")
  System_Ext(linkedin_site, "LinkedIn.com", "Public job and profile pages")

  Rel(user, react, "Accesses via browser", "HTTPS")
  Rel(react, docparser, "Passes uploaded files to", "In-browser")
  Rel(react, supabase_auth, "Authenticates", "HTTPS / Supabase JS SDK")
  Rel(react, supabase_db, "CRUD operations via RLS", "HTTPS / PostgREST")
  Rel(react, supabase_storage, "Uploads resume files", "HTTPS")
  Rel(react, edge_fns, "Invokes functions", "HTTPS / supabase.functions.invoke()")
  Rel(edge_fns, supabase_db, "Reads and writes data", "Postgres direct")
  Rel(edge_fns, openai, "LLM calls via callLLM()", "HTTPS")
  Rel(edge_fns, resend, "Sends upgrade emails", "HTTPS")
  Rel(edge_fns, adzuna, "Fetches job listings", "HTTPS")
  Rel(react, playwright, "Triggers scrape requests", "HTTPS")
  Rel(playwright, linkedin_site, "Scrapes pages", "Playwright / HTTPS")
  Rel(playwright, supabase_db, "Writes scraped profile data", "HTTPS")
  Rel(postmark, edge_fns, "Delivers inbound email payload", "HTTPS webhook → inbound-email-ingest")
  Rel(user, marketing, "Visits marketing pages", "HTTPS")
```

---

## Diagram 3 — Domain Module Map

Who it's for: product and engineering teams.  
Shows the 7 functional domains, each grouping its pages, TanStack Query hooks, and edge functions.

```mermaid
graph TD
  subgraph RI["Resume Intelligence"]
    RI_P1["/resumes — MyResumes"]
    RI_P2["/experiences — EnrichedExperiences"]
    RI_H1["useResumes"]
    RI_H2["useEnrichedExperiences"]
    RI_H3["useLinkedinScrape"]
    RI_H4["useSkillProfile"]
    RI_F1["enrich-experiences"]
    RI_F2["linkedin-profile-ingest"]
    RI_F3["classify-skill-profile"]
  end

  subgraph JT["Job Targeting"]
    JT_P1["/jobs — JobDescriptions"]
    JT_H1["useJobDescriptions"]
    JT_F1["job-description-url-ingest"]
    JT_F2["inbound-email-ingest"]
    JT_F3["fetch-market-jobs"]
  end

  subgraph AS["ATS Scoring"]
    AS_P1["/analyses — ATSAnalyses"]
    AS_H1["useATSAnalyses"]
    AS_H2["useDirectATSAnalysis"]
    AS_H3["useRetryATSAnalysis"]
    AS_F1["ats-analysis-direct"]
    AS_F2["async-ats-scorer"]
  end

  subgraph CI["Career Intelligence"]
    CI_P1["/gap — GapMatrix"]
    CI_P2["/roadmaps — UpskillingRoadmaps"]
    CI_P3["/profile-fit — ProfileFit"]
    CI_H1["useGapAnalysis"]
    CI_H2["useUpskillingRoadmaps"]
    CI_H3["useProfileFit"]
    CI_H4["useRoleFamilies"]
    CI_F1["generate-gap-matrix"]
    CI_F2["generate-upskill-roadmap"]
    CI_F3["analyze-profile-fit"]
    CI_F4["aggregate-market-signals"]
  end

  subgraph OE["Opportunity Engine"]
    OE_P1["/opportunities — ProactiveMatches"]
    OE_P2["/interview-prep — InterviewPrep"]
    OE_H1["useInterviewPrep"]
    OE_H2["useOutreachMessage"]
    OE_F1["generate-interview-prep"]
    OE_F2["generate-outreach-message"]
  end

  subgraph AP["Account & Plan"]
    AP_P1["/settings — Settings"]
    AP_P2["/auth — Auth"]
    AP_P3["/reset-password"]
    AP_H1["useProfile"]
    AP_H2["useUserRole"]
    AP_H3["useAccountDeletion"]
    AP_H4["useCareerDataReset"]
    AP_H5["useUpgradeRequests"]
    AP_H6["usePlanFeature"]
    AP_F1["delete-account"]
    AP_F2["cancel-account-deletion"]
    AP_F3["request-plan-upgrade"]
    AP_F4["reset-profile-data"]
  end

  subgraph OA["Ops & Admin"]
    OA_P1["/admin — AdminDashboard"]
    OA_P2["/pm — PMDashboard"]
    OA_H1["useFeatureFlags"]
    OA_H2["useLogSettings"]
    OA_F1["centralized-logging"]
  end
```

---

## Diagram 4 — Data Flow: Core ATS Scoring Pipeline

Who it's for: engineers debugging or extending the scoring pipeline.  
Traces a score from file upload to persisted result in full detail.

```mermaid
sequenceDiagram
  actor User
  participant Browser as React SPA (Browser)
  participant DocProc as documentProcessor.ts
  participant TQ as TanStack Query
  participant DB as Supabase Postgres
  participant EdgeDirect as ats-analysis-direct (Edge Fn)
  participant EdgeAsync as async-ats-scorer (Edge Fn)
  participant LLM as callLLM() → OpenAI GPT-4.1
  participant Logger as centralized-logging (Edge Fn)

  User->>Browser: Upload resume (PDF/DOCX)
  Browser->>DocProc: Extract text client-side
  DocProc-->>Browser: Plain text content
  Browser->>DB: INSERT sats_resumes (+ text)
  Browser->>DB: SELECT sats_job_descriptions

  User->>Browser: Click "Run ATS Analysis"

  alt Synchronous path (useDirectATSAnalysis)
    Browser->>EdgeDirect: POST {resume_id, job_id}
    EdgeDirect->>DB: SELECT resume text + job description
    EdgeDirect->>LLM: Score request (systemPrompt + userPrompt)
    LLM-->>EdgeDirect: JSON score response
    EdgeDirect->>DB: INSERT sats_analyses (score, findings, derivatives)
    EdgeDirect->>Logger: logEvent(scoring_complete) [non-blocking]
    EdgeDirect-->>Browser: {success, analysis_id, score}
  else Async path (useATSAnalyses queue)
    Browser->>DB: INSERT sats_analyses (status: queued)
    DB->>EdgeAsync: Trigger via pg_cron / realtime
    EdgeAsync->>LLM: Score request
    LLM-->>EdgeAsync: JSON score response
    EdgeAsync->>DB: UPDATE sats_analyses (status: complete, score)
    Browser->>DB: Realtime subscription fires
  end

  Browser->>TQ: Invalidate analyses query
  TQ->>DB: SELECT sats_analyses (fresh)
  DB-->>TQ: Updated analysis rows
  TQ-->>Browser: Re-render ATSAnalyses page with score
```

---

## Diagram 5 — Database Entity Diagram (Core Domains)

Who it's for: engineers adding features or writing migrations.  
Groups key tables by domain with foreign key relationships. Legacy tables shown without `sats_` prefix.

```mermaid
erDiagram

  %% ── Auth (Supabase managed) ──────────────────────────────
  auth_users {
    uuid id PK
  }

  profiles {
    uuid id PK
    text role
    text plan_tier
    bool plan_override
    timestamptz created_at
  }

  auth_users ||--|| profiles : "id → id"

  %% ── Scoring Core ─────────────────────────────────────────
  sats_resumes {
    uuid id PK
    uuid user_id FK
    text title
    text content
    text file_url
    bool is_deleted
    timestamptz created_at
  }

  sats_job_descriptions {
    uuid id PK
    uuid user_id FK
    text title
    text company
    text location
    text content
    timestamptz created_at
  }

  sats_analyses {
    uuid id PK
    uuid user_id FK
    uuid resume_id FK
    uuid job_id FK
    int score
    text status
    jsonb findings
    jsonb derivatives
    timestamptz created_at
  }

  profiles ||--o{ sats_resumes : "user_id"
  profiles ||--o{ sats_job_descriptions : "user_id"
  profiles ||--o{ sats_analyses : "user_id"
  sats_resumes ||--o{ sats_analyses : "resume_id"
  sats_job_descriptions ||--o{ sats_analyses : "job_id"

  %% ── Career Intelligence ──────────────────────────────────
  sats_skill_profiles {
    uuid id PK
    uuid user_id FK
    jsonb skills
    text target_role
    timestamptz updated_at
  }

  sats_gap_snapshots {
    uuid id PK
    uuid user_id FK
    text target_role
    timestamptz created_at
  }

  sats_gap_items {
    uuid id PK
    uuid snapshot_id FK
    text skill
    text gap_level
  }

  sats_learning_roadmaps {
    uuid id PK
    uuid user_id FK
    text target_role
    text status
    timestamptz created_at
  }

  sats_roadmap_milestones {
    uuid id PK
    uuid roadmap_id FK
    text title
    text status
    int order
  }

  sats_profile_fit_reports {
    uuid id PK
    uuid user_id FK
    text target_role
    int fit_score
    jsonb signal_breakdown
    timestamptz created_at
  }

  profiles ||--o{ sats_skill_profiles : "user_id"
  profiles ||--o{ sats_gap_snapshots : "user_id"
  sats_gap_snapshots ||--o{ sats_gap_items : "snapshot_id"
  profiles ||--o{ sats_learning_roadmaps : "user_id"
  sats_learning_roadmaps ||--o{ sats_roadmap_milestones : "roadmap_id"
  profiles ||--o{ sats_profile_fit_reports : "user_id"

  %% ── Account & Plan ───────────────────────────────────────
  sats_feature_flags {
    uuid id PK
    text feature_key
    text plan_tier
    bool enabled
  }

  sats_upgrade_requests {
    uuid id PK
    uuid user_id FK
    text requested_tier
    text status
    timestamptz created_at
  }

  profiles ||--o{ sats_upgrade_requests : "user_id"

  %% ── Logging ──────────────────────────────────────────────
  log_events {
    uuid id PK
    uuid user_id FK
    text event_type
    jsonb payload
    timestamptz created_at
  }

  profiles ||--o{ log_events : "user_id"
```
