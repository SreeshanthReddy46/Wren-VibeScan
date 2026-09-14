import test from "node:test";
import assert from "node:assert/strict";
import { enrichFindingsWithDeepReasoning } from "../../dist/index.js";
import { runScan } from "@wren/core";
import type { Finding } from "@wren/shared-types";

test("circuit breaker triggers when injected Anthropic client throws an error", async () => {
  const mockFinding: Finding = {
    id: "f-1",
    ruleId: "WREN-SEC-001",
    category: "secret",
    severity: "critical",
    title: "Hardcoded API Key",
    message: "Exposed API key in client",
    plainEnglishExplanation: "Secret exposed directly in code.",
    location: {
      filePath: "src/api.ts",
      startLine: 1,
      endLine: 1,
      snippet: "const key = 'sk-test';",
    },
    fix: {
      description: "Replace with env var",
      replacementCode: "const key = process.env.KEY;",
    },
  };

  const failingClient = {
    messages: {
      create: async () => {
        throw new Error("Anthropic API 500 Internal Server Error");
      },
    },
  };

  const result = await enrichFindingsWithDeepReasoning([mockFinding], {
    injectedClient: failingClient,
    apiKey: "dummy-key",
    timeoutMs: 2000,
  });

  assert.strictEqual(result.llmApplied, false);
  assert.strictEqual(
    result.llmReasoningNote,
    "LLM reasoning unavailable, showing pattern-based findings only"
  );
  assert.strictEqual(result.findings.length, 1);
  assert.strictEqual(result.findings[0].id, "f-1");
});

test("circuit breaker triggers when LLM reasoning times out", async () => {
  const mockFinding: Finding = {
    id: "f-2",
    ruleId: "WREN-SEC-002",
    category: "auth",
    severity: "high",
    title: "Permissive CORS",
    message: "Access-Control-Allow-Origin: *",
    plainEnglishExplanation: "Wildcard origin on authenticated route.",
    location: {
      filePath: "server.ts",
      startLine: 5,
      endLine: 5,
      snippet: "res.setHeader('Access-Control-Allow-Origin', '*');",
    },
    fix: {
      description: "Restrict origin",
      replacementCode: "res.setHeader('Access-Control-Allow-Origin', allowedOrigin);",
    },
  };

  const hangingClient = {
    messages: {
      create: () => new Promise(() => {}),
    },
  };

  const result = await enrichFindingsWithDeepReasoning([mockFinding], {
    injectedClient: hangingClient,
    apiKey: "dummy-key",
    timeoutMs: 50,
  });

  assert.strictEqual(result.llmApplied, false);
  assert.strictEqual(
    result.llmReasoningNote,
    "LLM reasoning unavailable, showing pattern-based findings only"
  );
  assert.strictEqual(result.findings.length, 1);
});

test("runScan gracefully falls back with note when LLM reasoning is enabled without valid key", async () => {
  const scanResult = await runScan({
    targetPath: "tests/fixtures",
    enableLlmReasoning: true,
    apiKey: undefined,
  });

  assert.ok(scanResult.scanId);
  assert.strictEqual(scanResult.llmReasoningApplied, false);
  assert.strictEqual(
    scanResult.llmReasoningNote,
    "LLM reasoning unavailable, showing pattern-based findings only"
  );
});
