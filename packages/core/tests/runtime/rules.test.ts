import test from "node:test";
import assert from "node:assert/strict";
import type { CustomerAgentEvent } from "@wren/shared-types";
import {
  WREN_RUN_RULES,
  evaluateRuntimeAgentEvent,
} from "../../dist/index.js";

test("WREN-RUN-001 trips on unsanctioned destructive action delete_user", () => {
  const event: CustomerAgentEvent = {
    id: "evt-1",
    agentId: "support-agent",
    action: "delete_user",
    declaredIntent: "Fetch recent user orders for billing dispute",
    arguments: { userId: "usr_123" },
    timestamp: new Date().toISOString(),
  };

  const res = evaluateRuntimeAgentEvent(event);
  assert.equal(res.tripped, true);
  const violation = res.violations.find((v) => v.ruleId === "WREN-RUN-001");
  assert.ok(violation);
  assert.equal(violation.severity, "critical");
  assert.equal(violation.category, "destructive_action");
  assert.match(violation.description, /destructive/i);
});

test("WREN-RUN-001 permits sanctioned destructive action when declaredIntent explicitly authorizes it", () => {
  const event: CustomerAgentEvent = {
    id: "evt-2",
    agentId: "cleanup-agent",
    action: "delete_user",
    declaredIntent: "Delete deactivated test user accounts as requested by admin",
    arguments: { userId: "usr_test_99" },
    timestamp: new Date().toISOString(),
  };

  const res = evaluateRuntimeAgentEvent(event);
  const violation = res.violations.find((v) => v.ruleId === "WREN-RUN-001");
  assert.equal(violation, undefined);
});

test("WREN-RUN-002 trips on unauthorized privilege escalation", () => {
  const event: CustomerAgentEvent = {
    id: "evt-3",
    agentId: "chat-bot",
    action: "assign_role",
    declaredIntent: "Update user profile settings",
    arguments: { userId: "usr_456", role: "admin" },
    timestamp: new Date().toISOString(),
  };

  const res = evaluateRuntimeAgentEvent(event);
  assert.equal(res.tripped, true);
  const violation = res.violations.find((v) => v.ruleId === "WREN-RUN-002");
  assert.ok(violation);
  assert.equal(violation.severity, "critical");
  assert.equal(violation.category, "privilege_escalation");
});

test("WREN-RUN-003 trips on active API key leaked in tool arguments", () => {
  const event: CustomerAgentEvent = {
    id: "evt-4",
    agentId: "dev-assistant",
    action: "execute_http_request",
    declaredIntent: "Query external webhook",
    arguments: {
      url: "https://api.external.com/data",
      apiKey: "sk-proj-abcdef1234567890abcdef1234567890",
    },
    timestamp: new Date().toISOString(),
  };

  const res = evaluateRuntimeAgentEvent(event);
  assert.equal(res.tripped, true);
  const violation = res.violations.find((v) => v.ruleId === "WREN-RUN-003");
  assert.ok(violation);
  assert.equal(violation.severity, "high");
  assert.equal(violation.category, "credential_leak");
});

test("WREN-RUN-004 trips on unmasked financial data / private keys in arguments", () => {
  const event: CustomerAgentEvent = {
    id: "evt-5",
    agentId: "support-agent",
    action: "log_debug_info",
    declaredIntent: "Record diagnostic info",
    arguments: {
      payload: "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0...",
    },
    timestamp: new Date().toISOString(),
  };

  const res = evaluateRuntimeAgentEvent(event);
  assert.equal(res.tripped, true);
  const violation = res.violations.find((v) => v.ruleId === "WREN-RUN-004");
  assert.ok(violation);
  assert.equal(violation.severity, "high");
  assert.equal(violation.category, "pii_exposure");
});
