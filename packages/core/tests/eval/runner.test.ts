import test from "node:test";
import assert from "node:assert/strict";
import { runAccuracyEvaluation, computeMetrics } from "../../dist/index.js";
import type { GroundTruthSnippet } from "../../dist/index.js";

test("computeMetrics accurately computes precision, recall, and F1", () => {
  const dummyResults: any[] = [
    { classification: "TP" },
    { classification: "TP" },
    { classification: "FP" },
    { classification: "TN" },
    { classification: "FN" },
  ];

  const m = computeMetrics(dummyResults);
  assert.equal(m.total, 5);
  assert.equal(m.truePositives, 2);
  assert.equal(m.falsePositives, 1);
  assert.equal(m.trueNegatives, 1);
  assert.equal(m.falseNegatives, 1);

  assert.equal(m.precision, 0.6667);
  assert.equal(m.recall, 0.6667);
  assert.equal(m.f1Score, 0.6667);
  assert.equal(m.falsePositiveRate, 0.5);
});

test("runAccuracyEvaluation executes on subset of snippets with high precision", async () => {
  const testSubSet: GroundTruthSnippet[] = [
    {
      id: "TEST-VULN-1",
      name: "OpenAI Secret",
      category: "secret",
      expectedRuleId: "WREN-SEC-001",
      expectedVulnerable: true,
      fileName: "api/ai.ts",
      code: 'const key = "sk-proj-123456789012345678901234567890123456";\n',
    },
    {
      id: "TEST-CLEAN-1",
      name: "Safe Key from Env",
      category: "secret",
      expectedVulnerable: false,
      fileName: "api/ai.ts",
      code: 'const key = process.env.OPENAI_API_KEY;\n',
    },
  ];

  const evalResult = await runAccuracyEvaluation({ snippets: testSubSet });

  assert.equal(evalResult.overall.total, 2);
  assert.equal(evalResult.overall.truePositives, 1);
  assert.equal(evalResult.overall.trueNegatives, 1);
  assert.equal(evalResult.overall.falsePositives, 0);
  assert.equal(evalResult.overall.falseNegatives, 0);
  assert.equal(evalResult.overall.precision, 1.0);
  assert.equal(evalResult.overall.recall, 1.0);
});
