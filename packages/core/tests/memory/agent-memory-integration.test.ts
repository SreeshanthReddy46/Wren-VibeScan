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

  // Pre-seed memory with settled verdict (FALSE_POSITIVE)
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
  // False positive resolved via memory hit -> filtered out -> 0 findings returned
  assert.equal(result.findings.length, 0);
  // LLM was completely bypassed (0 calls)!
  assert.equal(llmCalls, 0);
});

test("runAgentLoop populates memory on new finding verification", async () => {
  const store = createMemoryStore({ projectId: "p-test" });

  const finding: Finding = {
    id: "f-new-1",
    ruleId: "DB_QUERY",
    category: "database",
    severity: "high",
    title: "DB Injection",
    message: "Check sanitization",
    plainEnglishExplanation: "Needs sanitization check",
    location: { filePath: "db.ts", startLine: 1, endLine: 2, snippet: "db.raw('SELECT 1');" },
    fix: { description: "fix", replacementCode: "" },
  };

  // Mock Anthropic client for fresh investigation & verification
  let calls = 0;
  const mockAnthropic = {
    messages: {
      create: async () => {
        calls++;
        if (calls === 1) {
          return {
            role: "assistant",
            stop_reason: "end_turn",
            content: [{ type: "text", text: "Checked db query" }],
          };
        }
        return {
          role: "assistant",
          content: [
            {
              type: "text",
              text: JSON.stringify({
                verdict: "CONFIRMED",
                rationale: "Direct SQL string concatenation without parameterization",
                confidence: 0.95,
              }),
            },
          ],
        };
      },
    },
  };

  const result = await runAgentLoop(
    [finding],
    { targetPath: ".", apiKey: "mock-key", memoryStore: store as any },
    mockAnthropic as any
  );

  assert.equal(result.llmApplied, true);
  assert.equal(result.findings.length, 1);
  assert.equal(calls, 3); // Investigator, Verifier, Critic

  // Now verify that the finding was stored in the memory store
  const cachedLookup = await store.lookup(finding);
  assert.equal(cachedLookup.hit, true);
  assert.equal(cachedLookup.match?.entry.verdict, "CONFIRMED");
  assert.match(cachedLookup.match?.entry.rationale || "", /Direct SQL/);
});
