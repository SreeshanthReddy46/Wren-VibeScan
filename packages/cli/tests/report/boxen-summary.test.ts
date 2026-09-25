import test from "node:test";
import assert from "node:assert/strict";
import { formatSeverityBadge } from "../../dist/index.js";
import { renderBoxenSummary } from "../../dist/index.js";
import type { ScanResult } from "@wren/shared-types";

test("formatSeverityBadge returns uppercase severity badge", () => {
  const badge = formatSeverityBadge("critical");
  assert.ok(badge.includes("CRITICAL"));
  const high = formatSeverityBadge("high");
  assert.ok(high.includes("HIGH"));
  const med = formatSeverityBadge("medium");
  assert.ok(med.includes("MEDIUM"));
  const low = formatSeverityBadge("low");
  assert.ok(low.includes("LOW"));
  const info = formatSeverityBadge("info");
  assert.ok(info.includes("INFO"));
});

test("renderBoxenSummary formats clean scan card correctly", () => {
  const cleanResult: ScanResult = {
    scanId: "scan-clean",
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
      filesScanned: 25,
      scanDurationMs: 340,
      completedAt: new Date().toISOString(),
    },
  };

  const output = renderBoxenSummary(cleanResult);
  assert.ok(output.includes("Scan Passed"));
  assert.ok(output.includes("No vulnerabilities found"));
  assert.ok(output.includes("25 files"));
});

test("renderBoxenSummary formats findings card with issue counts", () => {
  const vulnResult: ScanResult = {
    scanId: "scan-vuln",
    targetPath: ".",
    timestamp: new Date().toISOString(),
    findings: [
      {
        id: "f1",
        ruleId: "WREN-SEC-001",
        category: "secret",
        severity: "critical",
        title: "Leaked Token",
        message: "Found secret",
        plainEnglishExplanation: "Private key in repo",
        location: { filePath: "client.ts", startLine: 1, endLine: 1 },
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
      scanDurationMs: 820,
      completedAt: new Date().toISOString(),
    },
  };

  const output = renderBoxenSummary(vulnResult);
  assert.ok(output.includes("Scan Complete"));
  assert.ok(output.includes("1 issue found"));
  assert.ok(output.includes("1 critical"));
});
