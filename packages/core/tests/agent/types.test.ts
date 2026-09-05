import test from "node:test";
import assert from "node:assert/strict";
import type { AgentScanConfig, ToolCallRequest, VerificationResult } from "../../src/agent/types.ts";
import { DEFAULT_AGENT_CONFIG } from "../../src/agent/types.ts";

test("DEFAULT_AGENT_CONFIG provides expected production defaults", () => {
  assert.equal(DEFAULT_AGENT_CONFIG.model, "claude-3-5-sonnet-latest");
  assert.equal(DEFAULT_AGENT_CONFIG.maxToolTurns, 4);
  assert.equal(DEFAULT_AGENT_CONFIG.timeoutMs, 25000);
});
