import test from "node:test";
import assert from "node:assert/strict";
import type { Finding } from "@wren/shared-types";
import { runDeepReasoningLoop } from "../../dist/index.js";

const sampleFinding: Finding = {
  id: "test-critic-finding",
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

test("Critic overrules candidate finding to FALSE_POSITIVE when evidenceQuality is low and falsePositiveRisk is high", async () => {
  let callCount = 0;
  const mockClient = {
    messages: {
      create: async (params: any) => {
        callCount++;
        if (callCount === 1) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  verdict: "TRUE_POSITIVE",
                  confidence: 0.9,
                  explanation: "Handler lacks in-file auth check.",
                }),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                evidenceQuality: 0.35,
                falsePositiveRisk: 0.85,
                confidenceScore: 0.9,
                critique: "Next.js middleware protects this whole directory route segment.",
              }),
            },
          ],
        };
      },
    },
  };

  const result = await runDeepReasoningLoop(sampleFinding, {
    injectedClient: mockClient,
    enableCritic: true,
  });

  assert.equal(result.verdict, "FALSE_POSITIVE");
  assert.equal(result.finding, null);
  assert.equal(result.traces.length, 2);
  assert.match(result.traces[1].reasoning, /\[Critic Evaluation:/);
  assert.match(result.reasoning, /Critic Overrule/);
});

test("Critic verifies and preserves TRUE_POSITIVE when evidenceQuality is high and falsePositiveRisk is low", async () => {
  let callCount = 0;
  const mockClient = {
    messages: {
      create: async (params: any) => {
        callCount++;
        if (callCount === 1) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  verdict: "TRUE_POSITIVE",
                  confidence: 0.95,
                  explanation: "Confirmed unauthenticated database mutation without route middleware.",
                }),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                evidenceQuality: 0.95,
                falsePositiveRisk: 0.05,
                confidenceScore: 0.98,
                critique: "Solid investigation. No middleware guards this route.",
              }),
            },
          ],
        };
      },
    },
  };

  const result = await runDeepReasoningLoop(sampleFinding, {
    injectedClient: mockClient,
    enableCritic: true,
  });

  assert.equal(result.verdict, "TRUE_POSITIVE");
  assert.ok(result.finding !== null);
  assert.equal(result.traces.length, 2);
  assert.match(result.traces[1].reasoning, /Critic Evaluation/);
});
