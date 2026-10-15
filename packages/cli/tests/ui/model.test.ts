import test from "node:test";
import assert from "node:assert/strict";
import type { Finding } from "@wren/shared-types";
import { sortFindingsBySeverity } from "../../dist/index.js";

test("sortFindingsBySeverity orders findings from CRITICAL to INFO", () => {
  const dummyFindings: Finding[] = [
    {
      ruleId: "RULE-LOW",
      severity: "low",
      title: "Low item",
      plainEnglishExplanation: "Low",
      location: { filePath: "a.ts", startLine: 1, endLine: 1 },
    },
    {
      ruleId: "RULE-CRIT",
      severity: "critical",
      title: "Crit item",
      plainEnglishExplanation: "Crit",
      location: { filePath: "b.ts", startLine: 2, endLine: 2 },
    },
    {
      ruleId: "RULE-MED",
      severity: "medium",
      title: "Med item",
      plainEnglishExplanation: "Med",
      location: { filePath: "c.ts", startLine: 3, endLine: 3 },
    },
    {
      ruleId: "RULE-HIGH",
      severity: "high",
      title: "High item",
      plainEnglishExplanation: "High",
      location: { filePath: "d.ts", startLine: 4, endLine: 4 },
    },
  ];

  const sorted = sortFindingsBySeverity(dummyFindings);
  assert.strictEqual(sorted[0].severity, "critical");
  assert.strictEqual(sorted[1].severity, "high");
  assert.strictEqual(sorted[2].severity, "medium");
  assert.strictEqual(sorted[3].severity, "low");
});
