# Database Architecture Diagnostic — Project Scan Prompt

> **How to use this file:**  
> Place it in your Claude Code project folder, then run:  
> `claude "Follow the instructions in db_diagnostic_prompt.md and give me the full report"`  
> Claude Code will read your project files and return the structured report below.

---

## Context & Background

I am building an application designed to be **Enterprise-ready from MVP stage**.  
The architecture needs to support:

- **Multi-tenancy** (tenant isolation via Row-Level Security)
- **Full audit trail** (`created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at`, `deleted_by`, `version`)
- **Soft deletes** (`deleted_at` pattern, never hard-delete business data)
- **Role-Based Access Control** (users → roles → permissions)
- **RAG pipelines** (document chunks, vector embeddings via pgvector)
- **AI agent orchestration** (multi-agent tasks, handoffs, memory)
- **LLM observability** (prompt versioning, token cost tracking, eval scores)
- **Modern API patterns** (idempotency keys, transactional outbox, rate limiting)
- **Future enterprise features**: multi-currency, multi-language, HIPAA/GDPR compliance, SOC 2 audit logging

I had a detailed architecture conversation covering the recommended schema layers:

1. **Base enterprise layer** — tenants, users, roles, permissions, user_roles, role_permissions, plans, features, tenant_features, programs, storage_objects, videos, audit_logs, process_runs, notifications, api_keys, sessions, webhooks
2. **AI/RAG layer** — knowledge_sources, document_chunks (pgvector), rag_queries, ai_agents, ai_sessions, ai_messages, agent_tasks, agent_handoffs, agent_memory, prompt_templates, llm_call_logs, ai_evaluations
3. **Modern API layer** — idempotency_keys, outbox_events, rate_limit_counters

---

## Your Task — Project Scan & Diagnostic Report

Please **read all files in this project** (migrations, schema files, ORM models, config files, environment files, agent definitions, MCP configs, package.json / pyproject.toml / Cargo.toml, README files, and any infrastructure-as-code) and produce the structured report below.

Do not guess. Only report what you can confirm by reading actual project files. If something is not found, say "not found" rather than inferring.

---

## Report Structure Required

### 1. Project Overview

- Project name and primary language / framework
- Database engine(s) detected (PostgreSQL, MySQL, SQLite, etc.)
- ORM or query builder in use (Prisma, Drizzle, SQLAlchemy, Ecto, raw SQL, etc.)
- Migration tool in use (Flyway, Liquibase, Alembic, Prisma Migrate, etc.)
- Deployment environment clues (Docker, Supabase, Railway, AWS RDS, etc.)

---

### 2. Current Table Inventory

For **each table or model found**, report:

| Table / Model | Columns Present    | RLS Enabled?       | Soft Delete? | Audit Cols Present |
| ------------- | ------------------ | ------------------ | ------------ | ------------------ |
| (name)        | (list key columns) | yes / no / unknown | yes / no     | which ones exist   |

If migrations are present, report the **current migration version or timestamp**.

---

### 3. Audit Column Coverage

For each table, check which of these universal audit columns are present:

- [ ] `created_at`
- [ ] `updated_at`
- [ ] `created_by` (FK to users)
- [ ] `updated_by` (FK to users)
- [ ] `deleted_at` (soft delete)
- [ ] `deleted_by` (FK to users)
- [ ] `tenant_id` (RLS isolation key)
- [ ] `version` (optimistic lock)

Report which tables are **missing critical columns** and which are fully compliant.

---

### 4. Row-Level Security (RLS) Status

- Is RLS enabled on any tables? List them.
- Is there a session variable being set (e.g. `app.current_tenant_id`) in middleware or connection setup?
- Are RLS policies defined in migrations or separate SQL files? List policy names if found.
- Are there service-role bypass patterns in use?

---

### 5. AI & Agent Infrastructure

#### 5a. RAG / Embeddings

- Is `pgvector` extension referenced anywhere?
- Are there any vector columns (`vector(N)`) in the schema?
- Are there tables for document chunks, embeddings, or knowledge bases?
- What embedding model(s) are referenced (e.g. `text-embedding-3-large`)?
- Is there an HNSW or IVFFlat index defined?

#### 5b. AI Agent Definitions

- Are there any agent configuration files? (e.g. `.claude/agents/`, `agents/`, `crews/`, `assistants/`)
- List each agent found with: name, type/role, model used, tools/MCP servers assigned
- Is there a multi-agent orchestration pattern in use? (LangChain, CrewAI, LlamaIndex, custom)
- Are there prompt template files? List them with version if present.

#### 5c. MCP (Model Context Protocol) Servers

- Is there a `.mcp.json`, `mcp_config.json`, `claude_desktop_config.json`, or equivalent?
- List all MCP servers configured with: name, URL or transport, tools exposed

#### 5d. LLM Observability

- Is there a logging/tracing setup for LLM calls? (Langfuse, Datadog, Helicone, custom)
- Are token counts or costs being tracked anywhere in the codebase?
- Are prompt versions being tracked?

---

### 6. Skills & Automation

- Are there any skill files? (e.g. `/mnt/skills/`, `skills/`, `.claude/skills/`)
- List each skill with: name, description, trigger condition
- Are there any workflow automation files? (n8n exports, Zapier configs, cron jobs, background workers)
- List background job queues or schedulers found (BullMQ, Celery, Oban, pg_cron, etc.)

---

### 7. Multi-Tenancy Assessment

- Is `tenant_id` present across data tables? What percentage of tables have it?
- Is there a `tenants` table? What columns does it have?
- What isolation model is in use: shared schema + tenant_id, separate schemas, separate databases?
- Are there subscription/plan tables (`plans`, `subscriptions`, `tenant_features`)?

---

### 8. Missing Tables — Gap Analysis

Compare the current schema against the recommended enterprise layers and list every **table that is missing** from the project, grouped by priority:

#### Critical gaps (block enterprise readiness)

- List tables from the base enterprise layer that are absent

#### AI/RAG gaps (needed for agent features)

- List tables from the AI layer that are absent

#### Nice-to-have gaps (can be deferred post-MVP)

- List tables from the modern API layer that are absent

---

### 9. Missing Columns — Gap Analysis

For tables that **do exist**, list columns that should be added:

| Table  | Missing Column | Priority              | Reason           |
| ------ | -------------- | --------------------- | ---------------- |
| (name) | (column)       | critical / high / low | (why it matters) |

---

### 10. Overall Readiness Score

Rate the project on each dimension (0–5):

| Dimension                       | Score | Notes |
| ------------------------------- | ----- | ----- |
| Audit trail coverage            | /5    |       |
| Multi-tenancy / RLS             | /5    |       |
| Soft delete pattern             | /5    |       |
| RBAC (roles + permissions)      | /5    |       |
| RAG / vector readiness          | /5    |       |
| Agent orchestration readiness   | /5    |       |
| LLM observability               | /5    |       |
| Enterprise compliance readiness | /5    |       |

---

### 11. Recommended Immediate Actions

List the **top 5 actions** to take right now, in priority order, with a one-line reason for each.

---

### 12. Raw Evidence

For every finding above, cite the **exact file path and line number** where the evidence was found.  
Example:

- `tenant_id` on `users` table → `prisma/schema.prisma:42`
- RLS policy → `supabase/migrations/20240301_rls.sql:18`
- Agent config → `.claude/agents/support_agent.json:1`

---

## Output Format

Return the complete report in **Markdown**. Be precise and factual. Do not add recommendations beyond what is asked in section 11. Do not fabricate findings — only report what is confirmed in project files.

Once this report is returned to me, I will share it with my architect to generate a complete migration plan from MVP to Enterprise stage, covering multi-currency, multi-language, auditing, AI agents, and compliance layers.
