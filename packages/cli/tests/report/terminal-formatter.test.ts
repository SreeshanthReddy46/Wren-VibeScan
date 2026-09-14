import test from "node:test";
import assert from "node:assert/strict";
import { formatTerminalReport } from "../../dist/index.js";
import type { ScanResult } from "@wren/shared-types";

test("formatTerminalReport outputs clean message when no findings are detected", () => {
  const result: ScanResult = {
    scanId: "scan-test-1",
    targetPath: "/mock/repo",
    timestamp: new Date().toISOString(),
    summary: {
      totalFindings: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
      filesScanned: 15,
      scanDurationMs: 42,
      completedAt: new Date().toISOString(),
    },
    findings: [],
    engineVersion: "2.1.0",
  };

  const output = formatTerminalReport(result);
  assert.match(output, /Wren Security Scanner/);
  assert.match(output, /No vulnerabilities found/);
  assert.match(output, /Scanned 15 files in 42ms/);
});

test("formatTerminalReport displays fallback banner when llmReasoningNote is set", () => {
  const result: ScanResult = {
    scanId: "scan-test-2",
    targetPath: "/mock/repo",
    timestamp: new Date().toISOString(),
    summary: {
      totalFindings: 1,
      critical: 1,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
      filesScanned: 5,
      scanDurationMs: 12,
      completedAt: new Date().toISOString(),
    },
    findings: [
      {
        id: "finding-1",
        ruleId: "WREN-SEC-001",
        category: "secret",
        severity: "critical",
        title: "Exposed API Key",
        message: "Key exposed",
        plainEnglishExplanation: "Private key leaked in client bundle.",
        location: {
          filePath: "src/api.ts",
          startLine: 10,
          endLine: 10,
          snippet: "const key = 'sk-12345';",
        },
        fix: {
          description: "Use environment variable",
          replacementCode: "const key = process.env.API_KEY;",
          diff: "- const key = 'sk-12345';\n+ const key = process.env.API_KEY;",
        },
      },
    ],
    engineVersion: "2.1.0",
    llmReasoningApplied: false,
    llmReasoningNote: "LLM reasoning unavailable, showing pattern-based findings only",
  };

  const output = formatTerminalReport(result);
  assert.match(output, /LLM reasoning unavailable, showing pattern-based findings only/);
  assert.match(output, /CRITICAL/);
  assert.match(output, /Exposed API Key/);
  assert.match(output, /src\/api\.ts.*10/);
  assert.match(output, /Suggested Fix/);
});
