import test from "node:test";
import assert from "node:assert/strict";
import { formatJsonReport } from "../../dist/index.js";
import type { ScanResult } from "@wren/shared-types";

test("formatJsonReport serializes ScanResult to valid JSON structure", () => {
  const result: ScanResult = {
    scanId: "scan-json-1",
    targetPath: "/mock/repo",
    timestamp: "2026-09-14T08:00:00.000Z",
    summary: {
      totalFindings: 1,
      critical: 1,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
      filesScanned: 10,
      scanDurationMs: 25,
      completedAt: "2026-09-14T08:00:00.000Z",
    },
    findings: [
      {
        id: "f-1",
        ruleId: "WREN-SEC-002",
        category: "auth",
        severity: "critical",
        title: "Missing Auth Middleware",
        message: "Protected route missing check",
        plainEnglishExplanation: "Public access to admin route.",
        location: {
          filePath: "routes/admin.ts",
          startLine: 1,
          endLine: 5,
        },
        fix: {
          description: "Add auth check",
          replacementCode: "",
        },
      },
    ],
    engineVersion: "2.1.0",
    llmReasoningApplied: false,
    llmReasoningNote: "LLM reasoning unavailable, showing pattern-based findings only",
  };

  const jsonStr = formatJsonReport(result);
  const parsed = JSON.parse(jsonStr);

  assert.strictEqual(parsed.scanId, "scan-json-1");
  assert.strictEqual(parsed.summary.totalFindings, 1);
  assert.strictEqual(parsed.findings.length, 1);
  assert.strictEqual(parsed.llmReasoningApplied, false);
  assert.strictEqual(
    parsed.llmReasoningNote,
    "LLM reasoning unavailable, showing pattern-based findings only"
  );
});
