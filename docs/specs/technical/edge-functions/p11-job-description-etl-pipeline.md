# P11 Technical Spec: Job Description ETL Pipeline

## 1. Goal

Implement an ETL pipeline for job descriptions using text and URL ingestion, then produce structured analytics-ready records for reporting and dashboards.

## 2. Ingestion Entry Points

1. Text ingestion endpoint

- Input: raw job description text, optional metadata.
- Validation: minimum content length, tenant authorization.

2. URL ingestion endpoint

- Input: single URL.
- Behavior: fetch one page only, parse HTML to text, no crawling.
- Safeguards: domain allow/deny policy, rate limit, timeout, max response size.

## 2A. P11 Implementation Sequence

1. `P11.1` CSV/XLS bulk import endpoint

- Parse structured rows into ingestion events.
- Batch validation and per-row failure reporting.

2. `P11.2` PDF/DOC upload endpoint

- File upload handling, content extraction, and normalization.
- Reuse existing document extraction pipeline where possible.

3. `P11.3` Browser extension capture endpoint

- Accept clipped payload (text + URL + metadata).
- Validate origin metadata and tenant authorization.

4. `P11.4` Email forwarding parser

- Inbound email ingestion worker.
- Parse subject/body/links and emit ingestion events.

5. `P11.5` ATS export template importer

- Standardized parser for CSV/XML/JSON ATS export formats.
- Mapping layer for field aliases to canonical ingestion schema.

6. `P11.6` Secure dropbox/webhook ingestion

- Signed upload or authenticated webhook trigger.
- Batch event creation with idempotency keys and replay safety.

## 3. Proposed Data Flow

1. `ingest_received`

- Persist raw payload + metadata.
- Compute `content_hash` for dedupe checks.

2. `normalize`

- Remove boilerplate markup/noise.
- Produce normalized text and section blocks.

3. `extract`

- Rule-based extraction for deterministic fields.
- LLM extraction for nuanced fields.
- Validate output against schema contract.

4. `canonicalize`

- Map roles/seniority/skills to taxonomy tables.
- Store canonical IDs and original labels.

5. `publish`

- Upsert analytics fact rows.
- Refresh aggregate views/materialized views.

## 4. Suggested Schema (high-level)

1. `jd_ingestion_events`

- `id`, `tenant_id`, `source_type` (`text`|`url`), `source_url`, `content_hash`, `status`, `ingested_at`, `ingested_by`.

2. `jd_raw_documents`

- `ingestion_id`, `raw_payload`, `normalized_text`, `normalization_version`.

3. `jd_extracted_attributes`

- `ingestion_id`, `role`, `seniority`, `region`, `company_size`, `salary_min`, `salary_max`, `salary_currency`, `required_experience`, `confidence_json`, `extractor_version`.

4. `jd_required_skills`

- `ingestion_id`, `skill_name_raw`, `skill_id`, `confidence`, `is_required`.

5. `jd_extraction_reviews`

- `ingestion_id`, `review_status`, `review_reason`, `reviewed_by`, `reviewed_at`.

6. Aggregates/views

- demand by role/seniority/region/company size
- salary benchmarks
- skill frequency and trend deltas

## 5. Extraction Contract

Use strict schema for extractor output:

- `role`: string
- `seniority`: enum
- `region`: string
- `company_size`: enum
- `salary`: object (`min`, `max`, `currency`, `confidence`)
- `required_skills`: array of skill objects
- `required_experience`: array of experience requirement strings
- `confidence`: field-level confidence map

Reject or queue low-confidence records for review.

## 6. SaaS Access Model

1. Admin capabilities

- Source policy control (URL restrictions, throttles, retention).
- Taxonomy management.
- Review queue and quality dashboards.

2. User capabilities

- Submit text/URL ingestion.
- View plan-allowed reports and exports.
- No raw global corpus access by default.

## 7. Non-functional Requirements

- Idempotent ingestion via `content_hash`.
- End-to-end traceability via `request_id` and `ingestion_id`.
- Processing latency target for MVP: under 2 minutes for standard records.
- Privacy-safe logging; redact sensitive source payloads in logs.

## 8. Operational Controls

- Retry policy with bounded attempts.
- Dead-letter queue for failed extractions.
- Daily quality report (schema-valid rate, confidence distribution, review rate).
- Gate deployment changes with P10/P11 eval checks.

## 9. MVP Implementation Plan

1. Add two ingestion endpoints (text, URL).
2. Add ingestion/raw/extracted tables and indexes.
3. Implement normalization + extraction worker.
4. Add taxonomy mapping module.
5. Add first aggregate views for dashboards.
6. Add admin review UI + user report UI hooks.
