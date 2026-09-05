# Specification: Cross-Scan Agent Memory via Supabase pgvector & Pattern Cache

## 1. Overview & Objective
Transform Wren VibeScan from a stateless scanner that re-evaluates settled findings on every run into a learning system equipped with persistent memory.
The memory system operates on two levels:
1. **Per-Project Memory**: Remembers settled architecture and vulnerability verdicts for a specific repository (e.g., *"this project uses custom middleware wrapper `withSession` for all `/api` endpoints"*), so unchanged or repeated patterns return instant cached verdicts in <1ms without re-running expensive LLM loops.
2. **Cross-User Pattern Memory (Anonymized)**: Collects sanitized, anonymized code pattern embeddings and verified verdicts across projects. If a vulnerable pattern has been analyzed in other projects, the agent leverages the prior consensus to resolve findings faster, with higher confidence and lower token consumption.

---

## 2. Storage & Database Schema (Supabase pgvector)

The database schema utilizes Supabase's native `pgvector` extension.

### Migration SQL (`packages/core/src/memory/schema.sql` and Supabase)
```sql
-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Table for project and cross-user pattern memory
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

-- Cosine distance HNSW index for sub-10ms vector similarity lookup
CREATE INDEX IF NOT EXISTS agent_pattern_memory_embedding_idx
  ON agent_pattern_memory
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS agent_pattern_memory_code_hash_idx
  ON agent_pattern_memory (code_hash);

-- Match RPC function: Prioritizes project memory, then global memory
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
```

---

## 3. Architecture & Module Structure

The memory subsystem is implemented in `packages/core/src/memory/`:

```
packages/core/src/
└── memory/
    ├── types.ts          # MemoryEntry, MemoryMatch, MemoryStore interfaces
    ├── hash.ts           # AST snippet normalizer and SHA-256 structural hasher (Tier 1)
    ├── embeddings.ts     # OpenAI text-embedding-3-small generator (with mock/fallback)
    ├── anonymizer.ts     # PII, secret, token, and path sanitizer for global library
    ├── store.ts          # Supabase pgvector client adapter + in-memory fallback
    └── schema.sql        # Migration DDL and RPC functions
```

### Hit Policy & Thresholds
- **Tier 1 (Instant Local Hash Hit)**:
  - Exact AST structural match on `code_hash` with `project_id`.
  - Latency: `<1ms`. Cost: `$0.00`.
  - Bypasses LLM entirely; returns settled verdict.
- **Tier 2 (Semantic Vector Match)**:
  - **High Confidence (`similarity >= 0.92`)**: Bypasses LLM Agent loop entirely; uses cached verdict, fix, and rationale.
  - **Medium Confidence (`0.80 <= similarity < 0.92`)**: Injects pattern memory as prior evidence into the Investigator/Verifier prompt to accelerate verification.
  - **Miss (`similarity < 0.80`)**: Executes normal 4-stage Agent Loop.

---

## 4. Anonymization & Data Sanitization

Before any finding is saved to the cross-user global pattern memory (`is_global = true`):
1. **Secrets & API Keys**: Replaced with `<REDACTED_SECRET>`.
2. **Tokens & Hashes**: Replaced with `<REDACTED_TOKEN>`.
3. **Emails & IPs**: Masked as `<USER_EMAIL>` and `<IP_ADDR>`.
4. **File Paths**: Stripped of absolute system paths; normalized to relative repository paths (e.g. `app/api/.../route.ts`).
5. **Identifiers & Names**: Stripped of customer-identifying names.

Private project memory (`project_id = ...`, `is_global = false`) retains project-specific details but is never returned to other projects.

---

## 5. Resilience & Circuit Breakers

1. **Unset Credentials**: If neither `SUPABASE_URL` / `SUPABASE_ANON_KEY` nor OpenAI embedding key is present, memory queries return a silent `null` (cache miss) and scans proceed as normal.
2. **Network Timeout**: Memory lookup is capped at 2500ms. If Supabase or the embedding endpoint times out, the scanner falls back directly to the agent loop with zero downtime.
3. **Graceful Fallback**: Local in-memory cache guarantees that repeated findings within the same CLI or dev server session hit the Tier 1 cache even if the network is down.

---

## 6. Verification Plan

1. **Unit Tests**:
   - `hash.test.ts`: Verify that code normalization handles whitespace variations, comments, and consistent hashing.
   - `anonymizer.test.ts`: Verify that secrets (Stripe, GitHub, Supabase keys), emails, and absolute paths are scrubbed.
   - `embeddings.test.ts`: Verify embedding generator and mock vector outputs.
   - `store.test.ts`: Verify Tier 1 hash hit, Tier 2 vector hit, and cache miss routing.
2. **Integration Test with Agent Loop**:
   - Run scan on a test snippet: verify first run executes LLM agent loop and populates memory.
   - Run second scan on the same snippet: verify memory hit triggers instant resolution without LLM invocation.
3. **Workspace Build & Typecheck**:
   - `pnpm --filter @wren/core run build`
   - `pnpm --filter @wren/core test`
   - `pnpm typecheck` across all workspace packages.
