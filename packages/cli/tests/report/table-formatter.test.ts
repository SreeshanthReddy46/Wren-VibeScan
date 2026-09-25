import test from "node:test";
import assert from "node:assert/strict";
import { formatTableReport } from "../../dist/index.js";
import type { ScanResult } from "@wren/shared-types";

test("formatTableReport renders empty findings cleanly with boxen card", () => {
  const cleanResult: ScanResult = {
    scanId: "scan-t1",
    targetPath: ".",
    timestamp: new Date().toISOString(),
    findings: [],
    engineVersion: "2.1.2",
    summary: {
      totalFindings: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
      filesScanned: 10,
      scanDurationMs: 120,
      completedAt: new Date().toISOString(),
    },
  };

  const output = formatTableReport(cleanResult);
  assert.ok(output.includes("Scan Passed"));
  assert.ok(output.includes("No vulnerabilities found"));
});

test("formatTableReport outputs structured table rows with headers", () => {
  const vulnResult: ScanResult = {
    scanId: "scan-t2",
    targetPath: ".",
    timestamp: new Date().toISOString(),
    findings: [
      {
        id: "f1",
        ruleId: "WREN-SEC-001",
        category: "secret",
        severity: "critical",
        title: "Hardcoded API Key",
        message: "API key hardcoded",
        plainEnglishExplanation: "Leaked secret",
        location: { filePath: "src/key.ts", startLine: 14, endLine: 14 },
        fix: { description: "Use env", replacementCode: "process.env.KEY" },
      },
    ],
    engineVersion: "2.1.2",
    summary: {
      totalFindings: 1,
      critical: 1,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
      filesScanned: 10,
      scanDurationMs: 400,
      completedAt: new Date().toISOString(),
    },
  };

  const output = formatTableReport(vulnResult);
  assert.ok(output.includes("Severity"));
  assert.ok(output.includes("Rule ID"));
  assert.ok(output.includes("Location"));
  assert.ok(output.includes("Description"));
  assert.ok(output.includes("WREN-SEC-001"));
  assert.ok(output.includes("src/key.ts:14"));
  assert.ok(output.includes("Scan Complete"));
});
