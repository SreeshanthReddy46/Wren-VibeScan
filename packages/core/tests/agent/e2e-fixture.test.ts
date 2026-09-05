import test from "node:test";
import assert from "node:assert/strict";
import * as path from "path";
import { runScan, runAgentLoop } from "../../dist/index.js";
import type { Finding } from "@wren/shared-types";

test("End-to-End: Agent Loop investigates middleware.ts and eliminates false positive", async () => {
  const fixturePath = path.resolve(import.meta.dirname, "../fixtures/middleware-auth-test");

  // 1. Run static scan first
  const staticScan = await runScan({
    targetPath: fixturePath,
    enableLlmReasoning: false,
  });

  // Check if static findings exist or simulate static finding on route.ts
  const testFinding: Finding = {
    id: "f-route-auth",
    ruleId: "AUTH_UNPROTECTED_ROUTE",
    category: "auth",
    severity: "high",
    title: "Route Handler Missing Authentication",
    message: "GET handler does not verify session inline",
    plainEnglishExplanation: "Needs check if middleware protects it",
    location: {
      filePath: "app/api/account/route.ts",
      startLine: 3,
      endLine: 6,
    },
    fix: { description: "Add auth", replacementCode: "" },
  };

  // Mock Anthropic client behaving as the real agent:
  // Step 1: Agent calls read_file on middleware.ts
  // Step 2: Agent reads result and concludes
  // Step 3: Verifier evaluates evidence and rules FALSE_POSITIVE
  let agentCalls = 0;
  const mockAnthropic = {
    messages: {
      create: async (params: any) => {
        agentCalls++;
        if (agentCalls === 1) {
          // Investigator decides to inspect middleware.ts
          return {
            role: "assistant",
            stop_reason: "tool_use",
            content: [
              { type: "text", text: "Checking if Next.js middleware.ts guards /api routes" },
              {
                type: "tool_use",
                id: "tool_call_1",
                name: "read_file",
                input: { filePath: "middleware.ts" },
              },
            ],
          };
        }
        if (agentCalls === 2) {
          // Investigator finishes investigation after reading middleware
          return {
            role: "assistant",
            stop_reason: "end_turn",
            content: [
              {
                type: "text",
                text: "Confirmed: middleware.ts contains matcher for /api/:path* and enforces auth-token cookie.",
              },
            ],
          };
        }
        // Verifier
        return {
          role: "assistant",
          content: [
            {
              type: "text",
              text: JSON.stringify({
                verdict: "FALSE_POSITIVE",
                rationale:
                  "Global Next.js middleware.ts protects all /api/:path* routes, mitigating the lack of inline check in route.ts.",
                confidence: 0.98,
              }),
            },
          ],
        };
      },
    },
  };

  const agentResult = await runAgentLoop(
    [testFinding],
    { targetPath: fixturePath, apiKey: "mock-key" },
    mockAnthropic as any
  );

  assert.equal(agentResult.llmApplied, true);
  // The false positive was successfully eliminated by the verifier, critic, & reporter!
  assert.equal(agentResult.findings.length, 0);
  assert.equal(agentCalls, 4); // Planner, Investigator, Verifier, Critic
});
