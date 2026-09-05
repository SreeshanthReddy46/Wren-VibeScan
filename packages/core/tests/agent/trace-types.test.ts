import test from "node:test";
import assert from "node:assert/strict";
import type {
  CriticRubric,
  CriticEvaluationResult,
  AgentTraceRecord,
  AgentTraceStep,
} from "@wren/shared-types";

test("CriticRubric defines valid evidence quality, risk, and confidence metrics", () => {
  const rubric: CriticRubric = {
    evidenceQuality: 0.85,
    falsePositiveRisk: 0.15,
    confidenceScore: 0.9,
    critique: "Evidence confirms direct user input into query without parametrization.",
  };

  assert.ok(rubric.evidenceQuality >= 0 && rubric.evidenceQuality <= 1);
  assert.ok(rubric.falsePositiveRisk >= 0 && rubric.falsePositiveRisk <= 1);
  assert.ok(rubric.confidenceScore >= 0 && rubric.confidenceScore <= 1);
});

test("AgentTraceRecord accurately represents pipeline step and execution metrics", () => {
  const record: AgentTraceRecord = {
    id: "trace-123",
    scanId: "scan-abc",
    findingId: "finding-42",
    step: "critic",
    input: { verdict: "CONFIRMED_VULNERABILITY" },
    output: { isOverruled: false },
    reasoning: "Critic validated all call site proofs.",
    confidenceScore: 0.92,
    rubric: {
      evidenceQuality: 0.88,
      falsePositiveRisk: 0.12,
      confidenceScore: 0.92,
      critique: "Solid evidence.",
    },
    durationMs: 420,
    timestamp: new Date().toISOString(),
  };

  assert.equal(record.step, "critic");
  assert.equal(record.durationMs, 420);
  assert.ok(record.rubric);
});
