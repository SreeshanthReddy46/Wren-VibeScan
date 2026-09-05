import test from "node:test";
import assert from "node:assert/strict";
import { runCheckCommand, ExitCode } from "../../dist/index.js";

test("runCheckCommand with async=true returns SUCCESS immediately with queued output", async () => {
  const originalLog = console.log;
  let loggedOutput = "";
  console.log = (msg: string) => {
    loggedOutput += msg + "\n";
  };

  try {
    const startTime = Date.now();
    const exitCode = await runCheckCommand(".", { async: true, format: "json" });
    const elapsed = Date.now() - startTime;

    assert.equal(exitCode, ExitCode.SUCCESS);
    // Should return very quickly (< 100ms) without executing full scan
    assert.ok(elapsed < 200, `Expected async return in < 200ms, took ${elapsed}ms`);

    const parsed = JSON.parse(loggedOutput.trim());
    assert.equal(parsed.success, true);
    assert.equal(parsed.status, "queued");
    assert.ok(parsed.scanId);
    assert.match(parsed.dashboardUrl, /scans/);
  } finally {
    console.log = originalLog;
  }
});

test("runCheckCommand with async=false runs scan and returns exit code", async () => {
  const exitCode = await runCheckCommand(".", { async: false });
  assert.ok(exitCode === ExitCode.SUCCESS || exitCode === ExitCode.VULNERABILITIES_FOUND);
});
