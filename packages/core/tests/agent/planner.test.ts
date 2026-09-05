import test from "node:test";
import assert from "node:assert/strict";
import type { Finding } from "@wren/shared-types";
import { planInvestigation } from "../../dist/index.js";

test("planInvestigation routes contextual findings to investigation queue and hardcoded secrets directly", () => {
  const findings: Finding[] = [
    {
      id: "f-1",
      ruleId: "AUTH_MISSING_GUARD",
      category: "auth",
      severity: "high",
      title: "Missing Auth Guard",
      message: "API route does not verify session",
      plainEnglishExplanation: "Needs check",
      location: { filePath: "app/api/users/route.ts", startLine: 1, endLine: 10 },
      fix: { description: "Add auth", replacementCode: "" },
    },
    {
      id: "f-2",
      ruleId: "SECRET_HARDCODED_KEY",
      category: "secret",
      severity: "critical",
      title: "Hardcoded API Key",
      message: "Stripe key exposed",
      plainEnglishExplanation: "Secret in source",
      location: { filePath: "lib/stripe.ts", startLine: 4, endLine: 4 },
      fix: { description: "Use env", replacementCode: "" },
    },
    {
      id: "f-3",
      ruleId: "DB_UNSANITIZED_INPUT",
      category: "database",
      severity: "high",
      title: "Raw SQL query",
      message: "Query uses concatenation",
      plainEnglishExplanation: "Check if parameterized elsewhere",
      location: { filePath: "lib/db.ts", startLine: 12, endLine: 15 },
      fix: { description: "Use parameters", replacementCode: "" },
    },
  ];

  const plan = planInvestigation(findings);
  assert.equal(plan.investigationQueue.length, 2);
  assert.equal(plan.investigationQueue[0].id, "f-1");
  assert.equal(plan.investigationQueue[1].id, "f-3");
  assert.equal(plan.directFindings.length, 1);
  assert.equal(plan.directFindings[0].id, "f-2");
});
