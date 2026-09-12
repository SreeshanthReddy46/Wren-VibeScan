import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import type { Finding } from "@wren/shared-types";
import { runDeepReasoningLoop } from "../../dist/index.js";

const mockFinding: Finding = {
  id: "finding-sqli-1",
  ruleId: "sql-injection",
  category: "database",
  severity: "critical",
  title: "Potential SQL Injection",
  message: "Raw query concatenation detected",
  plainEnglishExplanation: "Concatenating user input into SQL leads to SQL injection.",
  location: {
    filePath: "src/db.ts",
    startLine: 10,
    endLine: 12,
    snippet: "db.query(`SELECT * FROM users WHERE id = ${req.params.id}`)",
  },
  fix: {
    description: "Use parameterized query",
    replacementCode: "db.query('SELECT * FROM users WHERE id = $1', [req.params.id])",
  },
};

test("runDeepReasoningLoop returns direct verdict when Claude concludes in first step", async () => {
  const mockClient = {
    messages: {
      create: async () => ({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              verdict: "TRUE_POSITIVE",
              confidence: 0.98,
              explanation: "Confirmed SQL injection without query parametrization.",
              suggestedFix: "db.query('SELECT * FROM users WHERE id = $1', [req.params.id])",
            }),
          },
        ],
      }),
    },
  };

  const result = await runDeepReasoningLoop(mockFinding, {
    injectedClient: mockClient,
  });

  assert.equal(result.verdict, "TRUE_POSITIVE");
  assert.equal(result.confidence, 0.98);
  assert.ok(result.finding !== null);
  assert.equal(result.traces.length, 1);
  assert.equal(result.traces[0].step_number, 1);
  assert.equal(result.traces[0].tool_called, null);
  assert.match(result.traces[0].reasoning, /Confirmed SQL injection/);
});

test("runDeepReasoningLoop supports multi-step investigation using read_file tool", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-loop-test-"));
  const subFile = path.join(tmpDir, "sanitizer.ts");
  fs.writeFileSync(
    subFile,
    "export function sanitize(id: string) { return Number(id); }\n",
    "utf8"
  );

  let turn = 0;
  const mockClient = {
    messages: {
      create: async (params: any) => {
        turn++;
        if (turn === 1) {
          return {
            content: [
              {
                type: "text",
                text: "Checking if sanitize function sanitizes user input.",
              },
              {
                type: "tool_use",
                id: "tool-call-1",
                name: "read_file",
                input: { path: "sanitizer.ts" },
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                verdict: "FALSE_POSITIVE",
                confidence: 0.95,
                explanation: "Input is strictly cast to Number, preventing injection.",
              }),
            },
          ],
        };
      },
    },
  };

  try {
    const result = await runDeepReasoningLoop(mockFinding, {
      injectedClient: mockClient,
      targetPath: tmpDir,
    });

    assert.equal(result.verdict, "FALSE_POSITIVE");
    assert.equal(result.finding, null);
    assert.equal(result.traces.length, 2);

    assert.equal(result.traces[0].step_number, 1);
    assert.equal(result.traces[0].tool_called, "read_file");
    assert.match(result.traces[0].tool_output || "", /export function sanitize/);

    assert.equal(result.traces[1].step_number, 2);
    assert.equal(result.traces[1].tool_called, null);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("runDeepReasoningLoop enforces 5-turn cap and marks as NEEDS_MANUAL_REVIEW", async () => {
  let calls = 0;
  const mockClient = {
    messages: {
      create: async () => {
        calls++;
        return {
          content: [
            {
              type: "tool_use",
              id: `call-${calls}`,
              name: "search_codebase",
              input: { pattern: `loop-pattern-${calls}` },
            },
          ],
        };
      },
    },
  };

  const result = await runDeepReasoningLoop(mockFinding, {
    injectedClient: mockClient,
    maxTurns: 5,
  });

  assert.equal(result.verdict, "NEEDS_MANUAL_REVIEW");
  assert.ok(result.finding !== null);
  assert.match(
    result.finding!.plainEnglishExplanation,
    /Needs Manual Review: Investigation budget reached/i
  );
  assert.equal(result.traces.length, 6);
  assert.equal(result.traces[5].tool_called, null);
  assert.match(result.traces[5].reasoning, /budget reached/i);
});
