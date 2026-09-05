-- ==============================================================================
-- Wren VibeScan: Cross-Scan Agent Memory Schema (Supabase pgvector)
-- ==============================================================================

-- 1. Enable the pgvector extension to work with embedding vectors
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Table to store reasoned vulnerability patterns and their verdicts
CREATE TABLE IF NOT EXISTS agent_pattern_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NULL,                       -- NULL for cross-user global patterns, specific ID for project memory
  is_global BOOLEAN NOT NULL DEFAULT false,   -- true if sanitized for cross-project matching
  rule_id TEXT NOT NULL,                      -- e.g. "AUTH_UNPROTECTED_ROUTE"
  category TEXT NOT NULL,                     -- e.g. "auth", "database"
  code_hash TEXT NOT NULL,                    -- SHA-256 of normalized AST snippet for instant exact match
  code_snippet TEXT NOT NULL,                 -- Scrubbed code excerpt
  verdict TEXT NOT NULL,                      -- "CONFIRMED" | "FALSE_POSITIVE" | "SEVERITY_ADJUSTED"
  confidence FLOAT NOT NULL DEFAULT 1.0,
  rationale TEXT NOT NULL,                    -- Reasoning behind the verdict
  suggested_fix JSONB NULL,                   -- Cached fix recommendation
  embedding VECTOR(1536) NOT NULL,            -- OpenAI text-embedding-3-small vector
  hit_count INT NOT NULL DEFAULT 1,           -- Usage frequency tracker
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. HNSW index for sub-10ms vector cosine similarity search
CREATE INDEX IF NOT EXISTS agent_pattern_memory_embedding_idx
  ON agent_pattern_memory
  USING hnsw (embedding vector_cosine_ops);

-- 4. B-tree index for instant exact Tier 1 hash matching
CREATE INDEX IF NOT EXISTS agent_pattern_memory_code_hash_idx
  ON agent_pattern_memory (code_hash);

-- 5. Match RPC function: Prioritizes project memory, then global memory
CREATE OR REPLACE FUNCTION match_pattern_memory(
  query_embedding VECTOR(1536),
  target_rule_id TEXT,
  match_threshold FLOAT DEFAULT 0.80,
  match_limit INT DEFAULT 5,
  target_project_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  project_id TEXT,
  is_global BOOLEAN,
  rule_id TEXT,
  code_snippet TEXT,
  verdict TEXT,
  confidence FLOAT,
  rationale TEXT,
  suggested_fix JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    apm.id,
    apm.project_id,
    apm.is_global,
    apm.rule_id,
    apm.code_snippet,
    apm.verdict,
    apm.confidence,
    apm.rationale,
    apm.suggested_fix,
    1 - (apm.embedding <=> query_embedding) AS similarity
  FROM agent_pattern_memory apm
  WHERE apm.rule_id = target_rule_id
    AND (
      (target_project_id IS NOT NULL AND apm.project_id = target_project_id)
      OR apm.is_global = true
    )
    AND 1 - (apm.embedding <=> query_embedding) >= match_threshold
  ORDER BY
    (CASE WHEN apm.project_id = target_project_id THEN 1 ELSE 0 END) DESC,
    similarity DESC
  LIMIT match_limit;
END;
$$;
