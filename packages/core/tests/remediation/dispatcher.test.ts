import test from "node:test";
import assert from "node:assert/strict";
import {
  dispatchRemediationJob,
  getRemediationRecord,
  getRepoSettings,
  updateRepoSettings,
} from "../../../../apps/web/lib/remediation-dispatcher.ts";

test("getRepoSettings returns default opt-in false", async () => {
  const settings = await getRepoSettings("acme/test-repo");
  assert.equal(settings.autoRemediateEnabled, false);
  assert.equal(settings.minSeverity, "critical");
});

test("updateRepoSettings toggles opt-in flag", async () => {
  const updated = await updateRepoSettings("acme/test-repo", {
    autoRemediateEnabled: true,
  });
  assert.equal(updated.autoRemediateEnabled, true);

  const check = await getRepoSettings("acme/test-repo");
  assert.equal(check.autoRemediateEnabled, true);
});

test("dispatchRemediationJob returns queued status and initiates background execution", async () => {
  const result = await dispatchRemediationJob({
    scanId: "scan-test-rem",
    findingId: "f-123",
    repoName: "acme/vibe-shop",
  });

  assert.equal(result.success, true);
  assert.equal(result.status, "queued");
  assert.ok(result.remediationId);

  const record = await getRemediationRecord(result.remediationId);
  assert.ok(record);
  assert.equal(record.id, result.remediationId);
  assert.equal(record.findingId, "f-123");
});
