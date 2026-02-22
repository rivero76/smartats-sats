# P11 Product Spec: Job Description ETL and Market Intelligence

## 1. Objective

Add a market intelligence capability to Smart ATS that ingests job descriptions at scale and generates analytics/reporting across:

- role
- seniority
- company size
- region
- estimated salary
- required skills
- required experience

Initial release must support **text** and **URL** ingestion, without dependency on third-party job APIs.

## 2. Business Context

From a SaaS subscription model perspective, this feature is best delivered as:

- **Admin-governed intelligence layer** (data quality, controls, compliance, taxonomy).
- **User-facing analytics products** (benchmarks and insights gated by subscription tier).

This protects quality/compliance while maximizing recurring value for paid plans.

## 3. Personas and Access

1. Admin

- Define ingestion policies and source controls.
- Curate taxonomy mappings and review low-confidence extracts.
- Manage platform-level dashboards and quality metrics.

2. User (tenant customer)

- Submit job descriptions via text or URL.
- View benchmark reports and dashboards allowed by plan.
- Export approved analytics outputs per entitlement.

## 4. Ingestion Scope (Phase 1)

1. Text ingestion (copy/paste)

- User pastes full job description text.
- System stores raw text and normalized text.

2. URL ingestion (user-provided single URL)

- System fetches one page only.
- No recursive crawling, no link-following.
- If fetch/parse fails, prompt user to use text ingestion fallback.

## 4A. P11 Rollout Sequence (Documented)

1. `P11.1` CSV/XLS bulk import ingestion

- Upload hundreds of job descriptions at once using structured files.
- Supports fields such as title, location, company, URL, and JD text.

2. `P11.2` PDF/DOC file upload ingestion

- Ingest recruiter/HR-provided job description documents.
- Parse document content into normalized text for extraction.

3. `P11.3` Browser extension clipper ingestion

- Save currently viewed job posting content to Smart ATS in one click.
- Capture page text + source metadata without crawler behavior.

4. `P11.4` Email forwarding ingestion

- Forward job alert emails/newsletters into a dedicated ingestion inbox.
- Parse email body and links into ingestion queue.

5. `P11.5` ATS export template ingestion

- Accept exported files from ATS systems in CSV/XML/JSON template formats.
- No direct third-party API integration required in initial release.

6. `P11.6` Feed/webhook-style secure dropbox ingestion

- Allow batch push into secure upload endpoint or storage dropbox.
- Suitable for scheduled tenant-side automation.

## 5. Required Outputs

For each ingested JD, system produces structured fields:

- role
- seniority
- region
- company size (inferred/known)
- estimated salary band (min/max/currency/confidence)
- required skills (canonicalized)
- required experience requirements
- extraction confidence by field

## 6. Product Capabilities

1. Analytics and Reports

- Role demand by region and seniority.
- Skills heatmap by role and market segment.
- Salary benchmarks by role/seniority/region/company size.
- Experience requirement benchmarks and trend deltas.

2. Dashboards

- Executive view: demand, compensation, skills trends.
- Operations view: extraction quality, ingestion throughput, source mix.
- Product view: adoption, report usage, export usage.

3. Exports

- CSV export for allowed plans.
- Report snapshot downloads.

## 7. Subscription Model (suggested)

1. Starter

- Basic role/skill summaries.
- Limited monthly ingestions and exports.

2. Pro

- Full benchmark dashboards and trend lines.
- Higher ingestion caps and advanced filters.

3. Enterprise

- Custom taxonomy mapping, priority support, audit features.
- Advanced exports and SLA-backed processing.

## 8. Compliance and Safety Requirements

- Respect source terms and legal restrictions.
- Record ingestion provenance and timestamps.
- Apply retention policy and delete controls.
- Restrict raw-source visibility; default to analytics-only exposure.

## 9. Success Metrics

- Structured extraction success rate.
- Schema-valid extraction rate.
- Median extraction confidence.
- Dashboard/report usage per active tenant.
- Time-to-insight from ingestion to report availability.

## 10. Phased Delivery

1. MVP

- Text + URL ingestion.
- Core extraction fields and confidence scoring.
- Initial benchmark dashboards.

2. Phase 2

- Review queue and taxonomy governance tools.
- Improved salary estimation quality and trend intelligence.

3. Phase 3

- Forecasting, alerts, and deeper segmentation analytics.
