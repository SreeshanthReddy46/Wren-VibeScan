# Implementation Plan - Cross-Scan Agent Memory (pgvector & Pattern Cache)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Equip Wren VibeScan with persistent cross-scan memory via Supabase pgvector and a fast local AST structural hash cache, enabling instant 0-cost resolutions on re-scanned code and cross-user pattern learning across projects.

**Architecture:** A dual-tier memory system in `packages/core/src/memory/`. Tier 1 performs instant local AST-normalized hash lookups (<1ms). Tier 2 queries Supabase pgvector using `text-embedding-3-small` (1536 dims) via `match_pattern_memory` RPC. Sanitizes cross-user global patterns and preserves per-project isolation.

**Tech Stack:**
- Node.js 24 (`node:test`, `node:assert/strict`)
- TypeScript 5.7+
- Supabase pgvector (`@supabase/supabase-js`)
- OpenAI Embeddings (`text-embedding-3-small`, 1536 dims)
- `@wren/core`, `@wren/shared-types`

## Global Constraints
- Target package: `packages/core`
- Schema and RPC defined in `packages/core/src/memory/schema.sql`
- Dual-tier hit policy: Tier 1 exact hash (<1ms) or Tier 2 similarity >= 0.92 bypasses LLM entirely; 0.80 <= similarity < 0.92 injects memory as prior context
- Privacy guardrail: All global records (`is_global = true`) MUST be sanitized (secrets, tokens, emails, absolute paths redacted)
- Circuit breaker: Unset DB/embedding keys or network timeout must gracefully fall back without breaking the scan
- All tests must pass cleanly via `node --experimental-strip-types --test`
- Monorepo `pnpm typecheck` must stay 100% clean across all 5 workspace packages

---

### Task 1: Supabase pgvector Schema & Shared Memory Types

**Files:**
- Create: `packages/core/src/memory/schema.sql`
- Create: `packages/core/src/memory/types.ts`
- Test: `packages/core/tests/memory/types.test.ts`

**Interfaces:**
- Consumes: `@wren/shared-types` (`Finding`, `Severity`, `SuggestedFix`)
- Produces: `MemoryEntry`, `MemoryMatch`, `MemoryStoreConfig`, `MemoryLookupResult`, `MemoryStore`

- [ ] **Step 1: Write failing test for Memory types & defaults**

Create `packages/core/tests/memory/types.test.ts`:
```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_MEMORY_CONFIG } from "../../dist/index.js";

test("DEFAULT_MEMORY_CONFIG defines expected similarity thresholds", () => {
  assert.equal(DEFAULT_MEMORY_CONFIG.highConfidenceThreshold, 0.92);
  assert.equal(DEFAULT_MEMORY_CONFIG.mediumConfidenceThreshold, 0.80);
  assert.equal(DEFAULT_MEMORY_CONFIG.timeoutMs, 2500);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test packages/core/tests/memory/types.test.ts`
Expected: FAIL

- [ ] **Step 3: Create `packages/core/src/memory/schema.sql` and `packages/core/src/memory/types.ts`**

Create `packages/core/src/memory/schema.sql` with the complete DDL, vector index, and `match_pattern_memory` function.
Create `packages/core/src/memory/types.ts` with all memory interfaces.

- [ ] **Step 4: Run build and test to verify it passes**

Run:
```bash
pnpm --filter @wren/core run build
node --experimental-strip-types --test packages/core/tests/memory/types.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/memory/schema.sql packages/core/src/memory/types.ts packages/core/tests/memory/types.test.ts
git commit -m "feat(core): add pgvector schema and memory subsystem types"
```

---

### Task 2: Tier 1 Fast Structural Hashing (Snippet Normalizer)

**Files:**
- Create: `packages/core/src/memory/hash.ts`
- Test: `packages/core/tests/memory/hash.test.ts`

**Interfaces:**
- Consumes: `ruleId: string`, `snippet: string`
- Produces: `normalizeSnippet(code: string): string`, `computeCodeHash(ruleId: string, snippet: string): string`

- [ ] **Step 1: Write failing test for snippet normalization and hashing**

Create `packages/core/tests/memory/hash.test.ts`:
```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSnippet, computeCodeHash } from "../../dist/index.js";

test("normalizeSnippet removes comments and normalizes whitespace", () => {
  const code1 = "  const a = 1; // sample\n  return a;  ";
  const code2 = "const a = 1;\nreturn a;";
  assert.equal(normalizeSnippet(code1), normalizeSnippet(code2));
});

test("computeCodeHash produces identical hash for equivalent code", () => {
  const hash1 = computeCodeHash("AUTH_RULE", "export function GET() { return check(); }");
  const hash2 = computeCodeHash("AUTH_RULE", "  export function GET() {\n    return check();\n  }  ");
  assert.equal(hash1, hash2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test packages/core/tests/memory/hash.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `packages/core/src/memory/hash.ts`**

Implement `normalizeSnippet` (stripping inline/multiline comments, collapsing whitespace, trimming lines) and `computeCodeHash` (using `crypto.createHash("sha256")`).

- [ ] **Step 4: Run build and test to verify it passes**

Run:
```bash
pnpm --filter @wren/core run build
node --experimental-strip-types --test packages/core/tests/memory/hash.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/memory/hash.ts packages/core/tests/memory/hash.test.ts
git commit -m "feat(core): implement AST snippet normalizer and structural hashing"
```

---

### Task 3: Privacy Anonymizer (Secret & PII Sanitizer)

**Files:**
- Create: `packages/core/src/memory/anonymizer.ts`
- Test: `packages/core/tests/memory/anonymizer.test.ts`

**Interfaces:**
- Consumes: `snippet: string`, `rationale: string`
- Produces: `sanitizePatternForGlobalMemory(snippet: string, rationale: string): { sanitizedSnippet: string; sanitizedRationale: string }`

- [ ] **Step 1: Write failing test for anonymizer**

Create `packages/core/tests/memory/anonymizer.test.ts`:
```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { sanitizePatternForGlobalMemory } from "../../dist/index.js";

test("sanitizePatternForGlobalMemory redacts secrets, emails, and absolute paths", () => {
  const dirtySnippet = `
    const stripe = new Stripe("sk_live_51Abcdef1234567890XYZ");
    const contact = "admin@mycompany.internal";
    // File: /Users/hp/secret-project/app/api/auth.ts
  `;
  const dirtyRationale = "Verified leak in /Users/hp/secret-project/lib/auth.ts for admin@mycompany.internal";

  const { sanitizedSnippet, sanitizedRationale } = sanitizePatternForGlobalMemory(dirtySnippet, dirtyRationale);

  assert.doesNotMatch(sanitizedSnippet, /sk_live_/);
  assert.doesNotMatch(sanitizedSnippet, /admin@mycompany\.internal/);
  assert.doesNotMatch(sanitizedSnippet, /\/Users\/hp/);
  assert.match(sanitizedSnippet, /<REDACTED_SECRET>/);
  assert.match(sanitizedSnippet, /<USER_EMAIL>/);

  assert.doesNotMatch(sanitizedRationale, /\/Users\/hp/);
  assert.doesNotMatch(sanitizedRationale, /admin@mycompany\.internal/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test packages/core/tests/memory/anonymizer.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `packages/core/src/memory/anonymizer.ts`**

Implement regex scrubbers for API keys (`sk_live_`, `sk_test_`, `ghp_`, `ey...`), email addresses, IP addresses, and file path prefixes.

- [ ] **Step 4: Run build and test to verify it passes**

Run:
```bash
pnpm --filter @wren/core run build
node --experimental-strip-types --test packages/core/tests/memory/anonymizer.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/memory/anonymizer.ts packages/core/tests/memory/anonymizer.test.ts
git commit -m "feat(core): implement privacy anonymizer for global pattern library"
```

---

### Task 4: Embedding Provider Integration

**Files:**
- Create: `packages/core/src/memory/embeddings.ts`
- Test: `packages/core/tests/memory/embeddings.test.ts`

**Interfaces:**
- Consumes: `text: string`, `options?: { apiKey?: string; apiUrl?: string; client?: any }`
- Produces: `generateCodeEmbedding(text: string, options?: ...): Promise<number[] | null>`

- [ ] **Step 1: Write failing test for embedding generator**

Create `packages/core/tests/memory/embeddings.test.ts`:
```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { generateCodeEmbedding } from "../../dist/index.js";

test("generateCodeEmbedding returns null gracefully when no API key is provided", async () => {
  const originalKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  const result = await generateCodeEmbedding("const a = 1;");
  assert.equal(result, null);

  if (originalKey) process.env.OPENAI_API_KEY = originalKey;
});

test("generateCodeEmbedding produces 1536-dim vector with mock client", async () => {
  const mockVector = new Array(1536).fill(0.05);
  const mockClient = {
    embeddings: {
      create: async () => ({
        data: [{ embedding: mockVector }],
      }),
    },
  };

  const result = await generateCodeEmbedding("const a = 1;", { client: mockClient as any });
  assert.ok(result);
  assert.equal(result.length, 1536);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test packages/core/tests/memory/embeddings.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `packages/core/src/memory/embeddings.ts`**

Implement embedding generation with `fetch` to `https://api.openai.com/v1/embeddings` (or injected client), `text-embedding-3-small` model, timeout abort controller (2500ms), and null fallback on error.

- [ ] **Step 4: Run build and test to verify it passes**

Run:
```bash
pnpm --filter @wren/core run build
node --experimental-strip-types --test packages/core/tests/memory/embeddings.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/memory/embeddings.ts packages/core/tests/memory/embeddings.test.ts
git commit -m "feat(core): implement code embedding generation with circuit breaker"
```

---

### Task 5: Memory Store (Tier 1 Hash + Tier 2 pgvector + In-Memory Fallback)

**Files:**
- Create: `packages/core/src/memory/store.ts`
- Test: `packages/core/tests/memory/store.test.ts`

**Interfaces:**
- Consumes: `MemoryStoreConfig`, `Finding`, `VerificationResult`
- Produces: `createMemoryStore(config: MemoryStoreConfig): MemoryStore`

- [ ] **Step 1: Write failing test for memory store**

Create `packages/core/tests/memory/store.test.ts`:
```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { createMemoryStore } from "../../dist/index.js";
import type { Finding } from "@wren/shared-types";

test("MemoryStore resolves exact Tier 1 hash hit without network", async () => {
  const store = createMemoryStore({ projectId: "proj-123" });

  const finding: Finding = {
    id: "f-1",
    ruleId: "AUTH_ROUTE",
    category: "auth",
    severity: "high",
    title: "Route Auth",
    message: "Missing check",
    plainEnglishExplanation: "Needs auth",
    location: { filePath: "route.ts", startLine: 1, endLine: 5, snippet: "export function GET() {}" },
    fix: { description: "Add auth", replacementCode: "" },
  };

  // Save finding verdict
  await store.save(finding, {
    findingId: "f-1",
    verdict: "FALSE_POSITIVE",
    rationale: "Protected by root middleware",
    confidence: 0.99,
  });

  // Query memory for identical finding
  const lookup = await store.lookup(finding);
  assert.equal(lookup.hitType, "EXACT_HASH");
  assert.equal(lookup.match?.verdict, "FALSE_POSITIVE");
  assert.match(lookup.match?.rationale || "", /Protected by root middleware/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test packages/core/tests/memory/store.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `packages/core/src/memory/store.ts`**

Implement `createMemoryStore`:
- Tier 1: in-memory `Map<string, MemoryEntry>` keyed by `code_hash`.
- Tier 2: Supabase RPC `match_pattern_memory` using `supabase.rpc(...)` or fallback.
- Save logic: upserts into Tier 1 and Supabase `agent_pattern_memory` (with sanitization for `is_global = true`).

- [ ] **Step 4: Run build and test to verify it passes**

Run:
```bash
pnpm --filter @wren/core run build
node --experimental-strip-types --test packages/core/tests/memory/store.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/memory/store.ts packages/core/tests/memory/store.test.ts
git commit -m "feat(core): implement dual-tier memory store with pgvector and hash cache"
```

---

### Task 6: Hook Memory into Agent Loop & Integration Test

**Files:**
- Modify: `packages/core/src/agent/loop.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/tests/memory/agent-memory-integration.test.ts`

**Interfaces:**
- Consumes: `runAgentLoop`, `createMemoryStore`
- Produces: Integrated scan pipeline with pre-LLM memory hit checking and post-LLM pattern storage

- [ ] **Step 1: Write integration test for agent loop with memory cache**

Create `packages/core/tests/memory/agent-memory-integration.test.ts`:
```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { runAgentLoop, createMemoryStore } from "../../dist/index.js";
import type { Finding } from "@wren/shared-types";

test("runAgentLoop bypasses LLM on pre-existing memory hit", async () => {
  const store = createMemoryStore({ projectId: "p-test" });

  const finding: Finding = {
    id: "f-mem-1",
    ruleId: "AUTH_CHECK",
    category: "auth",
    severity: "high",
    title: "Auth Route",
    message: "Route check",
    plainEnglishExplanation: "Needs check",
    location: { filePath: "route.ts", startLine: 1, endLine: 3, snippet: "export function GET() { return ok(); }" },
    fix: { description: "Add auth", replacementCode: "" },
  };

  // Pre-seed memory with settled verdict
  await store.save(finding, {
    findingId: "f-mem-1",
    verdict: "FALSE_POSITIVE",
    rationale: "Known safe route pattern in this project",
    confidence: 1.0,
  });

  // Track if Anthropic client is called
  let llmCalls = 0;
  const mockAnthropic = {
    messages: {
      create: async () => {
        llmCalls++;
        return { content: [] };
      },
    },
  };

  const result = await runAgentLoop(
    [finding],
    { targetPath: ".", apiKey: "mock-key", memoryStore: store as any },
    mockAnthropic as any
  );

  assert.equal(result.llmApplied, true);
  // False positive resolved via memory hit -> 0 findings returned
  assert.equal(result.findings.length, 0);
  // LLM was completely bypassed (0 calls)!
  assert.equal(llmCalls, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test packages/core/tests/memory/agent-memory-integration.test.ts`
Expected: FAIL

- [ ] **Step 3: Wire memory store into `packages/core/src/agent/loop.ts` and `src/index.ts`**

Check memory lookup before scheduling investigator turns; resolve immediately on high hit; save verdicts on reporter completion. Export memory modules in `src/index.ts`.

- [ ] **Step 4: Run all tests in core and full monorepo typecheck**

Run:
```bash
pnpm --filter @wren/core test
pnpm typecheck
```
Expected: All tests pass and 0 typecheck errors across all 5 workspace packages.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/agent/loop.ts packages/core/src/index.ts packages/core/tests/memory/agent-memory-integration.test.ts
git commit -m "feat(core): integrate cross-scan memory cache into agent loop"
```
