import test from "node:test";
import assert from "node:assert/strict";
import type { AgentTraceRecord } from "@wren/shared-types";
import {
  recordAgentTraceBatch,
  getAgentTracesByScanId,
} from "../../../../apps/web/lib/trace-dispatcher.ts";
import {
  GET as getTracesRoute,
  POST as postTracesRoute,
} from "../../../../apps/web/app/api/scans/[id]/traces/route.ts";

test("trace-dispatcher stores and retrieves traces with finding filter", async () => {
  const scanId = `scan-test-${Date.now()}`;
  const traces: AgentTraceRecord[] = [
    {
      id: "trace-1",
      scanId,
      step: "planner",
      input: { findingsCount: 2 },
      output: { queueLength: 1 },
      reasoning: "Prioritizing high-risk route",
      durationMs: 45,
      timestamp: new Date().toISOString(),
    },
    {
      id: "trace-2",
      scanId,
      findingId: "f-sql-1",
      step: "critic",
      input: { verdict: "CONFIRMED" },
      output: { verdict: "CONFIRMED" },
      reasoning: "Validated call site reachability",
      confidenceScore: 0.95,
      rubric: {
        evidenceQuality: 0.92,
        falsePositiveRisk: 0.12,
        confidenceScore: 0.95,
        critique: "Concrete evidence found in auth-free route",
      },
      durationMs: 120,
      timestamp: new Date().toISOString(),
    },
  ];

  const count = await recordAgentTraceBatch(scanId, traces);
  assert.equal(count, 2);

  const allTraces = await getAgentTracesByScanId(scanId);
  assert.equal(allTraces.length, 2);

  const findingTraces = await getAgentTracesByScanId(scanId, "f-sql-1");
  assert.equal(findingTraces.length, 1);
  assert.equal(findingTraces[0].findingId, "f-sql-1");
  assert.equal(findingTraces[0].step, "critic");
  assert.equal(findingTraces[0].rubric?.evidenceQuality, 0.92);
});

test("POST and GET /api/scans/[id]/traces handles batch ingestion and retrieval", async () => {
  const scanId = `scan-api-${Date.now()}`;
  const postReq = new Request(`http://localhost:3000/api/scans/${scanId}/traces`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      traces: [
        {
          id: `trace-api-1`,
          scanId,
          step: "investigator",
          input: { file: "app.ts" },
          output: { context: ["line 10"] },
          reasoning: "Investigating user input flow",
          durationMs: 65,
          timestamp: new Date().toISOString(),
        },
        {
          id: `trace-api-2`,
          scanId,
          findingId: "f-api-1",
          step: "critic",
          input: { verdict: "FALSE_POSITIVE" },
          output: { finalVerdict: "FALSE_POSITIVE" },
          reasoning: "Identified sanitizer call",
          rubric: {
            evidenceQuality: 0.88,
            falsePositiveRisk: 0.8,
            confidenceScore: 0.9,
            critique: "Input sanitized before query",
          },
          durationMs: 90,
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  });

  const postRes = await postTracesRoute(postReq, {
    params: Promise.resolve({ id: scanId }),
  });
  assert.equal(postRes.status, 201);
  const postData = await postRes.json();
  assert.equal(postData.success, true);
  assert.equal(postData.count, 2);

  const getReq = new Request(`http://localhost:3000/api/scans/${scanId}/traces`);
  const getRes = await getTracesRoute(getReq, {
    params: Promise.resolve({ id: scanId }),
  });
  assert.equal(getRes.status, 200);
  const getData = await getRes.json();
  assert.equal(getData.traces.length, 2);
  assert.ok(getData.criticCount >= 1);
});
