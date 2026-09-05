import test from "node:test";
import assert from "node:assert/strict";
import type {
  ScanLifecycleStatus,
  ScanJobRequest,
  ScanJobResponse,
  ScanStepEvent,
} from "@wren/shared-types";

test("ScanLifecycleStatus encompasses all progression states", () => {
  const statuses: ScanLifecycleStatus[] = [
    "queued",
    "running",
    "discovering",
    "static_analysis",
    "agent_investigating",
    "verifying",
    "completed",
    "failed",
  ];
  assert.equal(statuses.length, 8);
});

test("ScanJobResponse provides queued status and dashboardUrl", () => {
  const response: ScanJobResponse = {
    success: true,
    scanId: "scan-123",
    status: "queued",
    dashboardUrl: "/scans/scan-123",
  };
  assert.equal(response.status, "queued");
  assert.match(response.dashboardUrl, /scan-123/);
});

test("ScanStepEvent models agent event streaming", () => {
  const event: ScanStepEvent = {
    id: "evt-1",
    scanId: "scan-123",
    eventType: "finding.discovered",
    stepIndex: 1,
    payload: { ruleId: "JWT_EXPIRATION" },
    timestamp: new Date().toISOString(),
  };

  assert.equal(event.eventType, "finding.discovered");
  assert.equal(event.scanId, "scan-123");
});
