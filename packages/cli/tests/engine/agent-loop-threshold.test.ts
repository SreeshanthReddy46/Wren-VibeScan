import test from "node:test";
import assert from "node:assert/strict";
import type { Finding } from "@wren/shared-types";
import { runDeepReasoningLoop } from "../../dist/index.js";

const sampleFinding: Finding = {
  id: "test-auth-finding",
  ruleId: "WREN-AUTH-001",
  category: "auth",
  severity: "high",
  title: "Route Handler Missing Authentication Check",
  message: "Mutating handler without session check",
  plainEnglishExplanation: "Endpoint missing authentication",
  location: {
    filePath: "app/api/data/route.ts",
    startLine: 1,
    endLine: 5,
    snippet: "export async function POST() {}",
  },
  fix: {
    description: "Add auth check",
    replacementCode: "const session = await auth();",
  },
};

test("runDeepReasoningLoop marks finding as NEEDS_MANUAL_REVIEW if confidence is below threshold", async () => {
  const mockClient = {
    messages: {
      create: async () => ({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              verdict: "TRUE_POSITIVE",
              confidence: 0.65,
              explanation: "Suspicious mutation but unclear if protected by middleware.",
            }),
          },
        ],
      }),
    },
  };

  const result = await runDeepReasoningLoop(sampleFinding, {
    injectedClient: mockClient,
    confidenceThreshold: 0.8,
    enableCritic: false,
  });

  assert.equal(result.verdict, "NEEDS_MANUAL_REVIEW");
  assert.equal(result.confidence, 0.65);
  assert.ok(result.finding !== null);
  assert.match(
    result.finding!.plainEnglishExplanation,
    /Needs Manual Review: Agent confidence \(0\.65\) is below threshold \(0\.80\)/
  );
});

test("runDeepReasoningLoop keeps TRUE_POSITIVE when confidence meets or exceeds threshold", async () => {
  const mockClient = {
    messages: {
      create: async () => ({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              verdict: "TRUE_POSITIVE",
              confidence: 0.95,
              explanation: "Direct unauthenticated endpoint with mutating database write.",
            }),
          },
        ],
      }),
    },
  };

  const result = await runDeepReasoningLoop(sampleFinding, {
    injectedClient: mockClient,
    confidenceThreshold: 0.8,
    enableCritic: false,
  });

  assert.equal(result.verdict, "TRUE_POSITIVE");
  assert.equal(result.confidence, 0.95);
  assert.ok(result.finding !== null);
  assert.match(
    result.finding!.plainEnglishExplanation,
    /Direct unauthenticated endpoint/
  );
});
