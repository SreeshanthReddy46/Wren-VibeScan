import test from "node:test";
import assert from "node:assert/strict";
import type {
  RemediationStatus,
  RemediationRequest,
  RemediationResponse,
  RepoRemediationSettings,
} from "@wren/shared-types";

test("RemediationStatus covers all lifecycle stages", () => {
  const statuses: RemediationStatus[] = [
    "queued",
    "generating_patch",
    "syntax_verifying",
    "pr_opened",
    "failed",
  ];
  assert.equal(statuses.length, 5);
});

test("RemediationResponse models PR output and diff", () => {
  const res: RemediationResponse = {
    success: true,
    remediationId: "rem-123",
    status: "pr_opened",
    prUrl: "https://github.com/org/repo/pull/42",
    prNumber: 42,
    patchDiff: "--- a/src/auth.ts\n+++ b/src/auth.ts",
  };
  assert.equal(res.status, "pr_opened");
  assert.equal(res.prNumber, 42);
});

test("RepoRemediationSettings enforces default false for opt-in", () => {
  const settings: RepoRemediationSettings = {
    repoName: "org/repo",
    autoRemediateEnabled: false,
    minSeverity: "critical",
  };
  assert.equal(settings.autoRemediateEnabled, false);
});
