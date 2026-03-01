Even though Phase P10 is marked as "Completed" in your roadmap, feeding its user stories into Codex alongside the pending Phase P11 is a brilliant move. It ensures the AI understands the exact strict JSON schema and evidence-based rules it must follow when building the new analytics engine. It creates a solid, unified context for your codebase.

Here is the structured Markdown prompt containing the epics for both phases. Copy everything between the lines and paste it directly into your VS Code AI chat:

Role: Act as a Senior Full-Stack Lead Developer and Data Architect.

Context: We are refining and building out two critical phases of our product roadmap.

Phase P10 (Evidence-Grounded ATS Scoring - Baseline): We have established a strict, trust-first AI architecture. Every ATS score or enrichment suggestion must be strictly validated against a JSON schema and explicitly linked to source_resume_evidence to prevent hallucinations.

Phase P11 (Market Intelligence Analytics - Pending): We are building an ETL pipeline to extract aggregate data from the job descriptions (JDs) users ingest. We will use this data to generate market intelligence dashboards (role demand, salary benchmarks, and skill heatmaps) so users can make data-driven upskilling decisions.

Our stack is React, Supabase (PostgreSQL), and Supabase Edge Functions.

Task: Please review the following Agile User Stories. For the P10 stories, ensure our current codebase adheres to these rules. For the P11 stories, generate the necessary Supabase database migrations (tables/views), Edge Function code (TypeScript), and React UI components. Let's tackle them one by one.

Epic 1: Evidence-Grounded ATS Controls (Phase P10 Baseline)
User Story 1: Strict LLM Schema Enforcement

As the backend system,

I need to enforce a strict JSON schema on all LLM responses for ATS scoring and profile enrichment,

So that the frontend never crashes from malformed data and we maintain a predictable data contract.

Acceptance Criteria:

Ensure the Edge Functions (ats-analysis-direct, enrich-experiences) use the response_format.json_schema parameter in the LLM API call.

Implement server-side validation (e.g., Zod) to verify the LLM output matches the expected TypeScript interfaces before saving to the database.

Implement a 1-attempt retry mechanism if the schema validation fails.

User Story 2: Anti-Hallucination Evidence Grounding

As a job applicant,

I want the AI to prove exactly where it found a skill on my resume,

So that I know the system isn't making things up and I can confidently defend my profile in an interview.

Acceptance Criteria:

Ensure the LLM prompt explicitly forbids fabricating skills.

Ensure the database schema and frontend UI enforce a source_resume_evidence field and a risk_flag (low, medium, high) for every extracted or enriched skill.

Display this evidence text directly next to the skill in the ATS match breakdown UI.

Epic 2: Market Intelligence & Heatmaps (Phase P11)
User Story 3: Job Description ETL & Normalization

As the data pipeline,

I need to extract structured metadata (role, seniority, salary, required skills) from every job description ingested by any user,

So that we can build an aggregate dataset of the current job market.

Acceptance Criteria:

Create a market_jobs_raw table and a market_jobs_normalized table.

Update the JD ingestion route to asynchronously trigger a normalization function.

Use a hybrid extraction approach (deterministic Regex for salaries/locations, LLM for nuanced skill extraction) to populate the normalized table.

Hash the normalized text and canonical URL to deduplicate postings.

User Story 4: Analytical Aggregation Views

As a database architect,

I need to create performant SQL views that aggregate the normalized market data,

So that the frontend dashboards can load complex statistics instantly without querying raw text.

Acceptance Criteria:

Create a PostgreSQL Materialized View (mv_skill_demand_heatmap) that counts the frequency of specific required skills grouped by role family and seniority.

Create a View (v_salary_benchmarks) calculating the min, max, and median salary ranges per role family.

Add a pg_cron job to refresh the Materialized View daily at midnight.

User Story 5: The Market Intelligence Dashboard

As a job applicant,

I want to view visual heatmaps and salary benchmarks for my target roles,

So that I know exactly which skills are most valuable to learn next.

Acceptance Criteria:

Create a new React dashboard component (MarketIntelligence.tsx).

Fetch data from the mv_skill_demand_heatmap and v_salary_benchmarks endpoints.

Render a visual Heatmap (using a library like Recharts, Chart.js, or Tailwind grids) showing the top 10 most requested skills for the user's target role.

Render a visual salary band chart showing where the user's target jobs sit in the market.

PM Strategy Note
For User Story 4, using Materialized Views in Supabase is the secret to making your dashboard load blazingly fast. Running heavy COUNT() and GROUP BY aggregations on thousands of job descriptions in real-time will bottleneck your app quickly. Materialized views pre-calculate the math overnight.
