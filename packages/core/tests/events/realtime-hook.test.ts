import test from "node:test";
import assert from "node:assert/strict";
import { handleRealtimePayload } from "../../../../apps/web/hooks/use-scan-realtime.ts";
import type { Finding } from "@wren/shared-types";

test("handleRealtimePayload accumulates incoming discovered finding", () => {
  const initial = {
    status: "running",
    stage: "discovering",
    findings: [] as Finding[],
    events: [] as any[],
  };

  const sampleFinding: Finding = {
    id: "finding-1",
    ruleId: "NO_HARDCODED_JWT",
    category: "secret",
    severity: "high",
    title: "Hardcoded JWT secret detected",
    message: "Found hardcoded secret in auth.ts",
    plainEnglishExplanation: "Secrets in source code can be extracted.",
    location: {
      filePath: "src/auth.ts",
      startLine: 12,
      endLine: 12,
    },
    fix: {
      description: "Use process.env",
      replacementCode: "process.env.JWT_SECRET",
    },
  };

  const state1 = handleRealtimePayload(initial, {
    eventType: "finding.discovered",
    payload: { finding: sampleFinding },
  });

  assert.equal(state1.findings.length, 1);
  assert.equal(state1.findings[0].id, "finding-1");
  assert.equal(state1.findings[0].severity, "high");
});

test("handleRealtimePayload updates finding on finding.verified", () => {
  const initial = {
    status: "running",
    stage: "agent",
    findings: [
      {
        id: "finding-1",
        ruleId: "NO_HARDCODED_JWT",
        category: "secret",
        severity: "high",
        title: "Hardcoded JWT secret detected",
        message: "Found hardcoded secret in auth.ts",
        plainEnglishExplanation: "Secrets in source code can be extracted.",
        location: {
          filePath: "src/auth.ts",
          startLine: 12,
          endLine: 12,
        },
        fix: {
          description: "Use process.env",
          replacementCode: "process.env.JWT_SECRET",
        },
        isAiGeneratedPattern: false,
      },
    ] as Finding[],
    events: [] as any[],
  };

  const verifiedFinding: Finding = {
    ...initial.findings[0],
    isAiGeneratedPattern: true,
  };

  const state = handleRealtimePayload(initial, {
    eventType: "finding.verified",
    payload: { finding: verifiedFinding },
  });

  assert.equal(state.findings.length, 1);
  assert.equal(state.findings[0].isAiGeneratedPattern, true);
});

test("handleRealtimePayload transitions scan status to completed", () => {
  const initial = {
    status: "running",
    stage: "agent",
    findings: [],
    events: [],
  };

  const state = handleRealtimePayload(initial, {
    eventType: "scan.completed",
    payload: {
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
    },
  });

  assert.equal(state.status, "completed");
  assert.equal(state.stage, "completed");
});
