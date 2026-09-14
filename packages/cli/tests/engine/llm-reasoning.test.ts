import test from "node:test";
import assert from "node:assert/strict";
import type { Finding } from "@wren/shared-types";
import { enrichFindingsWithDeepReasoning } from "../../dist/index.js";

const sampleFinding: Finding = {
  id: "finding-cors-1",
  ruleId: "cors-wildcard",
  category: "configuration",
  severity: "high",
  title: "Permissive CORS Origin",
  message: "Access-Control-Allow-Origin wildcard detected",
  plainEnglishExplanation: "Wildcard origin in CORS header allows unauthorized origins.",
  location: {
    filePath: "src/server.ts",
    startLine: 5,
    endLine: 5,
    snippet: "res.setHeader('Access-Control-Allow-Origin', '*');",
  },
  fix: {
    description: "Restrict to specific allowed origins",
    replacementCode: "res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN);",
  },
};

test("enrichFindingsWithDeepReasoning returns unchanged findings when no API key or client is provided", async () => {
  const origKey = process.env.ANTHROPIC_API_KEY;
  const origWren = process.env.WREN_LLM_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.WREN_LLM_KEY;

  try {
    const result = await enrichFindingsWithDeepReasoning([sampleFinding]);
    assert.equal(result.llmApplied, false);
    assert.equal(result.findings.length, 1);
    assert.equal(result.traces.length, 0);
  } finally {
    if (origKey) process.env.ANTHROPIC_API_KEY = origKey;
    if (origWren) process.env.WREN_LLM_KEY = origWren;
  }
});

test("enrichFindingsWithDeepReasoning runs multi-step loop and records traces", async () => {
  const mockClient = {
    messages: {
      create: async () => ({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              verdict: "TRUE_POSITIVE",
              confidence: 0.92,
              explanation: "Wildcard allows any domain to query API endpoints.",
            }),
          },
        ],
      }),
    },
  };

  const result = await enrichFindingsWithDeepReasoning([sampleFinding], {
    injectedClient: mockClient,
  });

  assert.equal(result.llmApplied, true);
  assert.equal(result.findings.length, 1);
  assert.equal(result.traces.length, 2);
  assert.equal(result.traces[0].step_number, 1);
  assert.equal(result.traces[0].tool_called, null);
});
