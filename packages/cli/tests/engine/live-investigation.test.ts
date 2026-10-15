import test from "node:test";
import assert from "node:assert/strict";
import type { Finding, ScanProgressEvent } from "@wren/shared-types";
import { runDeepReasoningLoop } from "../../dist/index.js";

test("runDeepReasoningLoop emits investigation progress events during multi-step analysis", async () => {
  const mockFinding: Finding = {
    id: "f-inv-1",
    ruleId: "WREN-SEC-001",
    category: "auth",
    severity: "high",
    title: "Missing authorization guard on user route",
    message: "Route handler does not check authentication session",
    plainEnglishExplanation: "Missing auth check",
    location: {
      filePath: "src/api/users.ts",
      startLine: 12,
      endLine: 20,
      snippet: "export async function GET(req: Request) { return Response.json(users); }",
    },
    fix: {
      description: "Add auth check",
      replacementCode: "export async function GET(req: Request) { await requireAuth(req); return Response.json(users); }",
    },
  };

  const fakeClient = {
    messages: {
      create: async (params: any) => {
        const lastMsg = params.messages[params.messages.length - 1];
        if (lastMsg.role === "user" && Array.isArray(lastMsg.content) && lastMsg.content[0]?.type === "tool_result") {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  verdict: "TRUE_POSITIVE",
                  confidence: 0.95,
                  explanation: "Verified no auth check in any call path",
                }),
              },
            ],
            stop_reason: "end_turn",
          };
        }

        return {
          content: [
            {
              type: "tool_use",
              id: "call-1",
              name: "search_codebase",
              input: { query: "requireAuth" },
            },
          ],
          stop_reason: "tool_use",
        };
      },
    },
  };

  const events: ScanProgressEvent[] = [];

  const result = await runDeepReasoningLoop(mockFinding, {
    injectedClient: fakeClient,
    onProgress: (event) => events.push(event),
  });

  assert.strictEqual(result.verdict, "TRUE_POSITIVE");

  const startEvent = events.find((e) => e.stage === "investigation_start");
  assert.ok(startEvent);
  if (startEvent && startEvent.stage === "investigation_start") {
    assert.strictEqual(startEvent.ruleId, "WREN-SEC-001");
    assert.strictEqual(startEvent.target, "src/api/users.ts:12");
  }

  const stepEvent = events.find((e) => e.stage === "investigation_step");
  assert.ok(stepEvent);
  if (stepEvent && stepEvent.stage === "investigation_step") {
    assert.strictEqual(stepEvent.tool, "search_codebase");
    assert.strictEqual(stepEvent.inputSummary, "requireAuth");
  }

  const verdictEvent = events.find((e) => e.stage === "investigation_verdict");
  assert.ok(verdictEvent);
  if (verdictEvent && verdictEvent.stage === "investigation_verdict") {
    assert.strictEqual(verdictEvent.verdict, "TRUE_POSITIVE");
    assert.strictEqual(verdictEvent.severity, "high");
    assert.ok(verdictEvent.explanation.includes("no auth check in any call path"));
  }
});
