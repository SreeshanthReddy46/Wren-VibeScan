import test from "node:test";
import assert from "node:assert/strict";
import {
  dispatchScanJob,
  getScanRecord,
  getScanEvents,
} from "../../../../apps/web/lib/scan-dispatcher.ts";

test("dispatchScanJob creates queued response and initiates background processing", async () => {
  const scanId = `scan-test-${Date.now()}`;
  const result = await dispatchScanJob({
    scanId,
    targetPath: ".",
  });

  assert.equal(result.success, true);
  assert.equal(result.status, "queued");
  assert.equal(result.scanId, scanId);
  assert.match(result.dashboardUrl, new RegExp(scanId));

  const record = await getScanRecord(scanId);
  assert.ok(record);
  assert.equal(record.id, scanId);
});

test("dispatchScanJob processes scan through lifecycle stages in local fallback", async () => {
  const scanId = `scan-lifecycle-${Date.now()}`;
  await dispatchScanJob({
    scanId,
    targetPath: ".",
  });

  await new Promise((resolve) => setTimeout(resolve, 500));

  const events = await getScanEvents(scanId);
  assert.ok(events.length > 0);
  assert.equal(events[0].scanId, scanId);
  assert.ok(["scan.started", "scan.progress", "finding.discovered", "scan.completed"].includes(events[0].eventType));
});
