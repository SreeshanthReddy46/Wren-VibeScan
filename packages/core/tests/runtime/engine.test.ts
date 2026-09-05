import test from "node:test";
import assert from "node:assert/strict";
import type { CustomerAgentEvent } from "@wren/shared-types";
import { evaluateRuntimeAgentEvent, WREN_RUN_RULES } from "../../dist/index.js";

test("evaluateRuntimeAgentEvent evaluates all built-in rules and returns clean verdict for benign events", () => {
  const benignEvent: CustomerAgentEvent = {
    id: "evt-benign-1",
    agentId: "summarizer-bot",
    action: "read_article",
    declaredIntent: "Summarize top tech news article",
    arguments: { articleId: "art_991" },
    timestamp: new Date().toISOString(),
  };

  const result = evaluateRuntimeAgentEvent(benignEvent);
  assert.equal(result.tripped, false);
  assert.equal(result.violations.length, 0);
  assert.equal(result.evaluatedRuleCount, WREN_RUN_RULES.length);
});

test("evaluateRuntimeAgentEvent supports custom runtime rules", () => {
  const customRule = {
    id: "CUSTOM-001",
    name: "Block External IP Connections",
    category: "scope_violation" as const,
    defaultSeverity: "high" as const,
    evaluate: (event: CustomerAgentEvent) => {
      const targetIp = (event.arguments.ip as string) || "";
      if (targetIp.startsWith("198.51.")) {
        return {
          ruleId: "CUSTOM-001",
          ruleName: "Block External IP Connections",
          severity: "high" as const,
          category: "scope_violation" as const,
          description: "Connection to restricted IP address detected",
          evidence: `Attempted connection to ${targetIp}`,
          suggestedAction: "Block network access",
        };
      }
      return null;
    },
  };

  const customEvent: CustomerAgentEvent = {
    id: "evt-custom",
    agentId: "crawler",
    action: "fetch_url",
    arguments: { ip: "198.51.100.1" },
    timestamp: new Date().toISOString(),
  };

  const result = evaluateRuntimeAgentEvent(customEvent, [customRule]);
  assert.equal(result.tripped, true);
  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].ruleId, "CUSTOM-001");
});
