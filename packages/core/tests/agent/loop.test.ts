import test from "node:test";
import assert from "node:assert/strict";
import { runAgentLoop } from "../../dist/index.js";
import type { Finding } from "@wren/shared-types";

test("runAgentLoop activates circuit breaker when no API key is provided", async () => {
  const originalApiKey = process.env.ANTHROPIC_API_KEY;
  const originalWrenKey = process.env.WREN_LLM_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.WREN_LLM_KEY;

  const findings: Finding[] = [
    {
      id: "f-1",
      ruleId: "AUTH_CHECK",
      category: "auth",
      severity: "medium",
      title: "Test",
      message: "Test",
      plainEnglishExplanation: "Test",
      location: { filePath: "test.ts", startLine: 1, endLine: 2 },
      fix: { description: "fix", replacementCode: "" },
    },
  ];

  const result = await runAgentLoop(findings, { targetPath: "." });
  assert.equal(result.llmApplied, false);
  assert.equal(result.findings.length, 1);

  if (originalApiKey) process.env.ANTHROPIC_API_KEY = originalApiKey;
  if (originalWrenKey) process.env.WREN_LLM_KEY = originalWrenKey;
});

test("runAgentLoop coordinates Planner -> Investigator -> Verifier -> Reporter with mock client", async () => {
  const findings: Finding[] = [
    {
      id: "f-1",
      ruleId: "AUTH_CHECK",
      category: "auth",
      severity: "high",
      title: "Test Auth",
      message: "Needs middleware check",
      plainEnglishExplanation: "Check route",
      location: { filePath: "test.ts", startLine: 1, endLine: 2 },
      fix: { description: "fix", replacementCode: "" },
    },
  ];

  let step = 0;
  const mockClient = {
    messages: {
      create: async () => {
        step++;
        if (step === 1) {

          return {
            role: "assistant",
            stop_reason: "end_turn",
            content: [{ type: "text", text: "Checked route and middleware" }],
          };
        }

        return {
          role: "assistant",
          content: [
            {
              type: "text",
              text: JSON.stringify({
                verdict: "CONFIRMED",
                rationale: "No protection found anywhere in the tree",
                confidence: 0.99,
              }),
            },
          ],
        };
      },
    },
  };

  const result = await runAgentLoop(
    findings,
    { targetPath: ".", apiKey: "mock-key" },
    mockClient as any
  );

  assert.equal(result.llmApplied, true);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].plainEnglishExplanation, /\[Verified by Wren Agent/);
});
