import test from "node:test";
import assert from "node:assert/strict";
import { TerminalSpinnerManager } from "../../dist/index.js";

test("TerminalSpinnerManager is silent when quiet option is enabled", () => {
  const manager = new TerminalSpinnerManager({ quiet: true });
  assert.strictEqual(manager.isSilent, true);
  manager.start();
  manager.handleProgress({ stage: "discovery_start" });
  manager.handleProgress({
    stage: "discovery_complete",
    fileCount: 10,
    durationMs: 50,
  });
  manager.handleProgress({
    stage: "scan_file",
    current: 1,
    total: 10,
    filePath: "test.ts",
  });
  manager.handleProgress({
    stage: "static_complete",
    findingsCount: 0,
    durationMs: 100,
  });
  manager.stop();
});

test("TerminalSpinnerManager respects CI environment variable", () => {
  const origCi = process.env.CI;
  process.env.CI = "true";
  try {
    const manager = new TerminalSpinnerManager({ quiet: false });
    assert.strictEqual(manager.isSilent, true);
    manager.start();
    manager.stop();
  } finally {
    if (origCi === undefined) {
      delete process.env.CI;
    } else {
      process.env.CI = origCi;
    }
  }
});

test("TerminalSpinnerManager attaches and cleans up SIGINT listener", () => {
  const manager = new TerminalSpinnerManager({ quiet: true });
  const countBefore = process.listenerCount("SIGINT");
  manager.start();
  manager.stop();
  const countAfter = process.listenerCount("SIGINT");
  assert.strictEqual(countAfter, countBefore);
});
