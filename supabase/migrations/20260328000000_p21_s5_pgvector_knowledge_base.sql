-- UPDATE LOG
-- 2026-03-28 00:00:00 | P21 Stage 5 — pgvector extension + RAG knowledge base.
--                       Creates sats_knowledge_sources, sats_document_chunks (HNSW index),
--                       sats_rag_queries, and sats_search_document_chunks() search function.
--                       session_id FK on sats_rag_queries is added in 20260328010000 after
--                       sats_ai_sessions exists. All table refs use sats_ prefix.

-- -----------------------------------------------------------------------
-- pgvector extension (Supabase Cloud supports natively)
-- -----------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS vector;

-- -----------------------------------------------------------------------
-- sats_knowledge_sources — registry of indexed content sources
-- -----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sats_knowledge_sources (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID        REFERENCES public.sats_tenants(id)
                        DEFAULT '00000000-0000-0000-0000-000000000001',
  name                  TEXT        NOT NULL,
  type                  TEXT        NOT NULL
                        CHECK (type IN ('pdf','url','database','api','upload','crawl')),
  status                TEXT        NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','indexing','ready','failed','stale')),
  -- Embedding config — record which model produced these vectors
  embedding_model       TEXT        NOT NULL DEFAULT 'text-embedding-3-small',
  embedding_dimensions  INT         NOT NULL DEFAULT 1536,
  -- Chunking strategy
  chunk_strategy        TEXT        NOT NULL DEFAULT 'recursive'
                        CHECK (chunk_strategy IN ('fixed','semantic','recursive')),
  chunk_size_tokens     INT         NOT NULL DEFAULT 512,
  chunk_overlap_tokens  INT         NOT NULL DEFAULT 64,
  total_chunks          INT,
  config                JSONB       NOT NULL DEFAULT '{}',
  -- Audit
  last_indexed_at       TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID        REFERENCES auth.users(id),
  updated_by            UUID        REFERENCES auth.users(id),
  deleted_at            TIMESTAMPTZ,
  deleted_by            UUID        REFERENCES auth.users(id)
);

-- -----------------------------------------------------------------------
-- sats_document_chunks — content chunks with pgvector embeddings
-- -----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sats_document_chunks (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID        REFERENCES public.sats_tenants(id)
                      DEFAULT '00000000-0000-0000-0000-000000000001',
  source_id           UUID        NOT NULL
                      REFERENCES public.sats_knowledge_sources(id) ON DELETE CASCADE,
  -- Content
  content             TEXT        NOT NULL,
  embedding           VECTOR(1536),               -- pgvector column
  -- Position metadata
  chunk_index         INT         NOT NULL,
  token_count         INT,
  page_number         INT,
  section_heading     TEXT,
  -- Enrichment
  language            CHAR(5)     NOT NULL DEFAULT 'en-US',
  metadata            JSONB       NOT NULL DEFAULT '{}',
  -- Model snapshot (critical — never mix embedding models in one source)
  embedding_model     TEXT        NOT NULL DEFAULT 'text-embedding-3-small',
  -- Timestamps
  indexed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HNSW index for approximate nearest-neighbour cosine search.
-- m=16, ef_construction=64 is a well-tested starting point.
-- Tune m/ef_construction upward for higher recall at the cost of build time.
CREATE INDEX IF NOT EXISTS idx_sats_document_chunks_embedding
  ON public.sats_document_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_sats_document_chunks_source
  ON public.sats_document_chunks (source_id, chunk_index);

CREATE INDEX IF NOT EXISTS idx_sats_document_chunks_tenant
  ON public.sats_document_chunks (tenant_id);

-- -----------------------------------------------------------------------
-- sats_rag_queries — empirical retrieval log for optimisation
-- -----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sats_rag_queries (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID        REFERENCES public.sats_tenants(id),
  user_id             UUID        REFERENCES auth.users(id),
  session_id          UUID,       -- FK to sats_ai_sessions added in 20260328010000
  query_text          TEXT        NOT NULL,
  query_embedding     VECTOR(1536),
  retrieved_chunk_ids UUID[]      NOT NULL DEFAULT '{}',
  similarity_scores   FLOAT[]     NOT NULL DEFAULT '{}',
  retrieval_strategy  TEXT        NOT NULL DEFAULT 'semantic'
                      CHECK (retrieval_strategy IN ('semantic','hybrid','keyword')),
  top_k               INT         NOT NULL DEFAULT 5,
  latency_ms          INT,
  feedback_score      SMALLINT    CHECK (feedback_score BETWEEN 1 AND 5),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sats_rag_queries_user
  ON public.sats_rag_queries (user_id, created_at DESC);

-- -----------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------

ALTER TABLE public.sats_knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sats_document_chunks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sats_rag_queries       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access their own knowledge sources"
  ON public.sats_knowledge_sources FOR ALL
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users access chunks from their sources"
  ON public.sats_document_chunks FOR SELECT
  USING (
    source_id IN (
      SELECT id FROM public.sats_knowledge_sources
      WHERE created_by = auth.uid() AND deleted_at IS NULL
    )
  );

CREATE POLICY "Users access their own RAG queries"
  ON public.sats_rag_queries FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------
-- sats_search_document_chunks() — semantic search entry point
-- Used by edge functions after generating a query embedding.
-- -----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION sats_search_document_chunks(
  query_embedding     VECTOR(1536),
  match_threshold     FLOAT   DEFAULT 0.7,
  match_count         INT     DEFAULT 5,
  p_tenant_id         UUID    DEFAULT NULL
)
RETURNS TABLE (
  id              UUID,
  content         TEXT,
  similarity      FLOAT,
  source_id       UUID,
  section_heading TEXT,
  metadata        JSONB
)
LANGUAGE sql STABLE AS $$
  SELECT
    dc.id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity,
    dc.source_id,
    dc.section_heading,
    dc.metadata
  FROM public.sats_document_chunks dc
  WHERE
    (p_tenant_id IS NULL OR dc.tenant_id = p_tenant_id)
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- -----------------------------------------------------------------------
-- Verification
-- -----------------------------------------------------------------------
-- SELECT extname FROM pg_extension WHERE extname = 'vector';
-- Expected: 1 row
--
-- SELECT tablename FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN ('sats_knowledge_sources','sats_document_chunks','sats_rag_queries')
-- ORDER BY tablename;
-- Expected: 3 rows

-- NOTE: Run scripts/ops/gen-types.sh after applying all Stage 5 migrations.
