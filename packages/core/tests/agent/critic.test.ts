import test from "node:test";
import assert from "node:assert/strict";
import type { Finding } from "@wren/shared-types";
import type { VerificationResult } from "../../dist/index.js";
import { evaluateVerdictWithCritic } from "../../dist/index.js";

const sampleFinding: Finding = {
  id: "finding-sqli-1",
  ruleId: "sql-injection",
  category: "database",
  severity: "high",
  title: "Potential SQL Injection",
  message: "Raw query concatenated with variable",
  plainEnglishExplanation: "Concatenating user input into SQL allows data theft.",
  location: {
    filePath: "src/db/user.ts",
    startLine: 12,
    endLine: 14,
    snippet: 'db.query("SELECT * FROM users WHERE id = " + userId);',
  },
  fix: {
    description: "Use parameterized query",
    replacementCode: 'db.query("SELECT * FROM users WHERE id = $1", [userId]);',
  },
};

test("Critic Judge confirms verdict when evidence quality is high and risk is low", async () => {
  const verified: VerificationResult = {
    findingId: "finding-sqli-1",
    verdict: "CONFIRMED",
    rationale: "Call site in router passes req.query.id directly to query.",
    confidence: 0.95,
  };

  const result = await evaluateVerdictWithCritic(sampleFinding, verified, {});
  assert.equal(result.isOverruled, false);
  assert.equal(result.finalVerdict, "CONFIRMED");
  assert.ok(result.rubric.evidenceQuality >= 0.7);
  assert.ok(result.rubric.falsePositiveRisk <= 0.5);
});

test("Critic Judge overrules verdict to FALSE_POSITIVE when evidence is weak or framework mitigates", async () => {
  const weakVerification: VerificationResult = {
    findingId: "finding-sqli-1",
    verdict: "CONFIRMED",
    rationale: "Assumed userId is untrusted, did not locate router or controller.",
    confidence: 0.5,
  };

  const result = await evaluateVerdictWithCritic(sampleFinding, weakVerification, {}, undefined, {
    mockRubric: {
      evidenceQuality: 0.4,
      falsePositiveRisk: 0.75,
      confidenceScore: 0.45,
      critique: "No evidence that userId originates from HTTP request. Likely internal ID.",
    },
  });

  assert.equal(result.isOverruled, true);
  assert.equal(result.finalVerdict, "FALSE_POSITIVE");
  assert.match(result.adjustedRationale, /Critic Overrule/);
});
