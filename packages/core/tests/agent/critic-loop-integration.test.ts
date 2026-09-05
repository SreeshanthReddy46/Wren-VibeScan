import test from "node:test";
import assert from "node:assert/strict";
import type { Finding } from "@wren/shared-types";
import { runAgentLoop } from "../../dist/index.js";

const mockContextualFinding: Finding = {
  id: "finding-middleware-1",
  ruleId: "unprotected-route",
  category: "auth",
  severity: "high",
  title: "Unprotected API Endpoint",
  message: "Endpoint does not verify JWT token in handler",
  plainEnglishExplanation: "Requires authentication check.",
  location: {
    filePath: "app/api/data/route.ts",
    startLine: 1,
    endLine: 5,
    snippet: "export async function GET() { return Response.json({ data: 123 }); }",
  },
  fix: { description: "Add auth check", replacementCode: "" },
};

test("runAgentLoop instruments pipeline stages with AgentTracer and executes Critic pass", async () => {
  const mockAnthropicClient: any = {
    messages: {
      create: async (params: any) => {
        const isCritic = params.system && params.system.includes("Senior Application Security Judge");
        if (isCritic) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  evidenceQuality: 0.9,
                  falsePositiveRisk: 0.1,
                  confidenceScore: 0.95,
                  critique: "Solid evidence of missing auth.",
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
                verdict: "CONFIRMED",
                rationale: "No auth middleware found protecting route.",
                confidence: 0.95,
              }),
            },
          ],
        };
      },
    },
  };

  const result = await runAgentLoop(
    [mockContextualFinding],
    {
      apiKey: "mock-key",
      targetPath: ".",
      scanId: "scan-critic-test-1",
    },
    mockAnthropicClient
  );

  assert.equal(result.llmApplied, true);
  assert.ok(result.traces, "Result should include agent traces array");
  assert.ok(result.traces.length >= 3, `Expected at least 3 traces, got ${result.traces.length}`);

  const steps = result.traces.map((t) => t.step);
  assert.ok(steps.includes("planner"), "Should include planner trace");
  assert.ok(steps.includes("verifier"), "Should include verifier trace");
  assert.ok(steps.includes("critic"), "Should include critic trace");

  const criticTrace = result.traces.find((t) => t.step === "critic");
  assert.ok(criticTrace?.rubric);
  assert.equal(criticTrace?.rubric?.evidenceQuality, 0.9);
});
