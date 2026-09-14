import test from "node:test";
import assert from "node:assert/strict";
import { formatSarifReport } from "../../dist/index.js";
import type { ScanResult } from "@wren/shared-types";

test("formatSarifReport produces valid SARIF 2.1.0 with notifications and rules", () => {
  const result: ScanResult = {
    scanId: "scan-sarif-1",
    targetPath: "/mock/repo",
    timestamp: "2026-09-14T08:00:00.000Z",
    summary: {
      totalFindings: 1,
      critical: 1,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
      filesScanned: 8,
      scanDurationMs: 30,
      completedAt: "2026-09-14T08:00:00.000Z",
    },
    findings: [
      {
        id: "f-sql-1",
        ruleId: "WREN-SEC-003",
        category: "database",
        severity: "critical",
        title: "SQL Injection Risk",
        message: "Dynamic SQL query concatenated with user input",
        plainEnglishExplanation: "Raw SQL query uses template literal string concatenation.",
        location: {
          filePath: "db/users.ts",
          startLine: 14,
          endLine: 14,
          startColumn: 5,
          endColumn: 45,
          snippet: "db.query(`SELECT * FROM users WHERE id = ${id}`)",
        },
        fix: {
          description: "Use parameterized query",
          replacementCode: "db.query('SELECT * FROM users WHERE id = $1', [id])",
        },
      },
    ],
    engineVersion: "2.1.0",
    llmReasoningApplied: false,
    llmReasoningNote: "LLM reasoning unavailable, showing pattern-based findings only",
  };

  const sarifStr = formatSarifReport(result);
  const sarif = JSON.parse(sarifStr);

  assert.strictEqual(sarif.version, "2.1.0");
  assert.strictEqual(sarif.runs.length, 1);

  const run = sarif.runs[0];
  assert.strictEqual(run.tool.driver.name, "Wren");
  assert.strictEqual(run.tool.driver.semanticVersion, "2.1.0");
  assert.strictEqual(run.tool.driver.rules.length, 1);
  assert.strictEqual(run.tool.driver.rules[0].id, "WREN-SEC-003");

  assert.strictEqual(run.results.length, 1);
  assert.strictEqual(run.results[0].ruleId, "WREN-SEC-003");
  assert.strictEqual(run.results[0].level, "error");
  assert.strictEqual(run.results[0].locations[0].physicalLocation.artifactLocation.uri, "db/users.ts");

  assert.ok(run.invocations);
  assert.strictEqual(run.invocations[0].executionSuccessful, true);
  assert.strictEqual(
    run.invocations[0].toolExecutionNotifications[0].message.text,
    "LLM reasoning unavailable, showing pattern-based findings only"
  );
});
