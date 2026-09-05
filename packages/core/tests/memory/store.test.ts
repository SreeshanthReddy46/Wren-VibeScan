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
  assert.equal(lookup.hit, true);
  assert.equal(lookup.hitType, "EXACT_HASH");
  assert.equal(lookup.match?.entry.verdict, "FALSE_POSITIVE");
  assert.match(lookup.match?.entry.rationale || "", /Protected by root middleware/);
});

test("MemoryStore resolves Tier 2 vector match via mock Supabase RPC", async () => {
  const mockRows = [
    {
      id: "mem-uuid-1",
      project_id: "proj-123",
      is_global: false,
      rule_id: "AUTH_ROUTE",
      code_snippet: "export function GET() {}",
      verdict: "FALSE_POSITIVE",
      confidence: 0.96,
      rationale: "Global middleware match from pgvector",
      similarity: 0.95,
    },
  ];

  const mockSupabase = {
    rpc: async (fn: string, params: any) => {
      if (fn === "match_pattern_memory") {
        return { data: mockRows, error: null };
      }
      return { data: null, error: new Error("Unknown RPC") };
    },
    from: () => ({
      insert: async () => ({ error: null }),
    }),
  };

  const mockEmbeddings = {
    embeddings: {
      create: async () => ({
        data: [{ embedding: new Array(1536).fill(0.01) }],
      }),
    },
  };

  const store = createMemoryStore({
    projectId: "proj-123",
    supabaseClient: mockSupabase as any,
    embeddingClient: mockEmbeddings as any,
  });

  const finding: Finding = {
    id: "f-vec-test",
    ruleId: "AUTH_ROUTE",
    category: "auth",
    severity: "high",
    title: "Route Auth",
    message: "Missing check",
    plainEnglishExplanation: "Needs auth",
    location: { filePath: "another/route.ts", startLine: 1, endLine: 5, snippet: "export async function GET() { return 1; }" },
    fix: { description: "Add auth", replacementCode: "" },
  };

  const lookup = await store.lookup(finding);
  assert.equal(lookup.hit, true);
  assert.equal(lookup.hitType, "VECTOR_HIGH_CONFIDENCE");
  assert.equal(lookup.match?.entry.verdict, "FALSE_POSITIVE");
  assert.match(lookup.match?.entry.rationale || "", /Global middleware match/);
});
