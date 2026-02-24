# P12 Technical Spec: Cloud, Globalization, and Enterprise Architecture

## 1. Scope

Define implementation architecture for:

1. Multi-language runtime support.
2. Cloud deployment migration path (AWS/Azure).
3. Scalability and reliability controls.
4. Enterprise security and tenant governance.

## 2. Target Architecture (Reference)

### Frontend

- Static SPA hosted via edge CDN:
  - AWS: S3 + CloudFront
  - Azure: Storage Static Website + Front Door/CDN
- Runtime config injected via environment-specific build/release metadata.

### Backend

- Supabase as managed data/auth/edge-function platform for current phase.
- Optional future split:
  - Retain Supabase for auth/storage/postgres.
  - Add dedicated worker runtime for heavy ETL queues.

### Async Processing

- Introduce ingestion/processing queue with idempotent worker contracts:
  - Job key: `ingestion_id` + `content_hash`
  - Retry policy with exponential backoff
  - Dead-letter handling and operator replay tooling.

## 3. Multi-language Technical Plan

1. Adopt i18n runtime:
- `react-i18next` or equivalent.
- Namespace strategy by domain (`dashboard`, `jobs`, `ats`, `settings`, `help`).

2. String extraction:
- Move literal strings into locale dictionaries.
- Add lint/check that blocks newly added unlocalized literal UI copy in target surfaces.

3. Locale handling:
- Persist locale preference by user profile + browser fallback.
- Apply `Intl` formatters for date/number/currency based on locale.

## 4. Cloud Migration Technical Plan

1. Infrastructure-as-Code:
- Define modules/stacks for:
  - web hosting + CDN
  - DNS + TLS
  - observability sinks
  - secrets and environment configuration

2. Environment model:
- `dev`, `stage`, `prod` with strict promotion flow.
- Drift detection comparing desired IaC state and actual deployed resources.

3. Release controls:
- Immutable artifact references.
- Deployment manifest containing:
  - commit SHA
  - build artifact checksum
  - migration head
  - runtime config checksum

## 5. Scalability and SRE Controls

1. SLI/SLO definitions:
- auth success rate
- ingestion success rate
- ATS completion latency
- enrichment completion latency
- dashboard API p95 latency

2. Capacity protections:
- request throttling by user/org/plan
- queue depth alarms
- worker concurrency caps
- timeout/retry caps per workflow

3. Reliability verification:
- synthetic probes for critical flows
- load tests for concurrent ingestion + analysis
- chaos/failure injection for queue and function dependencies

## 6. Enterprise Security and Tenant Isolation

1. Identity:
- SSO/SAML-ready auth abstraction.
- SCIM-compatible user/org lifecycle mapping.

2. Authorization:
- Tenant-scoped RBAC checks in all read/write/report endpoints.
- Entitlement checks for plan features and report export limits.

3. Auditability:
- Immutable admin/runtime change events.
- Correlation IDs across user action -> edge function -> DB mutation.

## 7. Minimum Technical Deliverables

1. i18n framework integrated with one non-English locale in production path.
2. IaC baseline deployed to at least one cloud provider stage environment.
3. Queue-backed ingestion worker with retry + dead-letter controls.
4. SLO dashboards and alert rules for top 5 user journeys.
5. Tenant-aware entitlement middleware and audit event capture.

