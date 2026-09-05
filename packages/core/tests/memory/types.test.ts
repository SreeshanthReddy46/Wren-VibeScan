import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_MEMORY_CONFIG } from "../../dist/index.js";

test("DEFAULT_MEMORY_CONFIG defines expected similarity thresholds", () => {
  assert.equal(DEFAULT_MEMORY_CONFIG.highConfidenceThreshold, 0.92);
  assert.equal(DEFAULT_MEMORY_CONFIG.mediumConfidenceThreshold, 0.80);
  assert.equal(DEFAULT_MEMORY_CONFIG.timeoutMs, 2500);
});
