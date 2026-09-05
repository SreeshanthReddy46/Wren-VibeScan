import test from "node:test";
import assert from "node:assert/strict";
import { investigateFinding, createCodebaseTools } from "../../dist/index.js";
import type { Finding } from "@wren/shared-types";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

test("investigator runs multi-turn tool calling and accumulates context", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-agent-"));
  fs.writeFileSync(path.join(tempDir, "middleware.ts"), "export function middleware() { return checkAuth(); }\n");

  const tools = createCodebaseTools(tempDir);
  const finding: Finding = {
    id: "f-test",
    ruleId: "AUTH_UNPROTECTED_ROUTE",
    category: "auth",
    severity: "high",
    title: "Route missing auth",
    message: "No auth in route handler",
    plainEnglishExplanation: "Check if middleware protects it",
    location: { filePath: "app/api/data/route.ts", startLine: 1, endLine: 5 },
    fix: { description: "Add auth", replacementCode: "" },
  };

  // Mock Anthropic client simulating 1 tool call then finish
  let callCount = 0;
  const mockClient = {
    messages: {
      create: async () => {
        callCount++;
        if (callCount === 1) {
          return {
            role: "assistant",
            stop_reason: "tool_use",
            content: [
              { type: "text", text: "Checking if middleware.ts handles auth" },
              {
                type: "tool_use",
                id: "tool_1",
                name: "read_file",
                input: { filePath: "middleware.ts" },
              },
            ],
          };
        }
        return {
          role: "assistant",
          stop_reason: "end_turn",
          content: [
            { type: "text", text: "Found middleware protecting the route with checkAuth()." },
          ],
        };
      },
    },
  };

  const result = await investigateFinding(finding, tools, { targetPath: tempDir }, mockClient as any);
  assert.equal(result.completed, true);
  assert.equal(result.steps.length, 2);
  assert.equal(result.steps[0].toolCall?.toolName, "read_file");
  assert.match(result.gatheredContext.join("\n"), /checkAuth/);

  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("investigator respects maxToolTurns and gracefully terminates", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-agent-"));
  fs.writeFileSync(path.join(tempDir, "sample.ts"), "const x = 1;\n");

  const tools = createCodebaseTools(tempDir);
  const finding: Finding = {
    id: "f-loop",
    ruleId: "TEST_RULE",
    category: "configuration",
    severity: "medium",
    title: "Loop test",
    message: "Test infinite tool requests",
    plainEnglishExplanation: "Test",
    location: { filePath: "sample.ts", startLine: 1, endLine: 1 },
    fix: { description: "fix", replacementCode: "" },
  };

  // Mock Anthropic client that always asks for tool use
  let calls = 0;
  const mockClient = {
    messages: {
      create: async () => {
        calls++;
        return {
          role: "assistant",
          stop_reason: "tool_use",
          content: [
            {
              type: "tool_use",
              id: `tool_${calls}`,
              name: "read_file",
              input: { filePath: "sample.ts" },
            },
          ],
        };
      },
    },
  };

  const result = await investigateFinding(
    finding,
    tools,
    { targetPath: tempDir, maxToolTurns: 2 },
    mockClient as any
  );

  assert.equal(result.completed, true);
  assert.equal(calls, 2);
  assert.equal(result.steps.length, 2);

  fs.rmSync(tempDir, { recursive: true, force: true });
});
