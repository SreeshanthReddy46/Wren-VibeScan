import test from "node:test";
import assert from "node:assert/strict";
import type {
  CustomerAgentEvent,
  RuntimeRuleViolation,
  RuntimeAlert,
  RuntimeWebhookConfig,
} from "@wren/shared-types";

test("CustomerAgentEvent accurately models runtime agent actions and arguments", () => {
  const event: CustomerAgentEvent = {
    id: "evt-test-123",
    agentId: "support-bot-1",
    sessionId: "sess-abc",
    environment: "production",
    action: "delete_user",
    declaredIntent: "Purge customer record upon GDPR request",
    arguments: {
      userId: "usr_987",
      cascade: true,
    },
    result: {
      status: "success",
      outputSnippet: "Deleted 1 record",
    },
    metadata: {
      clientIp: "10.0.0.1",
    },
    timestamp: new Date().toISOString(),
  };

  assert.equal(event.agentId, "support-bot-1");
  assert.equal(event.action, "delete_user");
  assert.equal(event.arguments.userId, "usr_987");
});

test("RuntimeRuleViolation and RuntimeAlert model threat detections and delivery status", () => {
  const violation: RuntimeRuleViolation = {
    ruleId: "WREN-RUN-001",
    ruleName: "Unsanctioned Destructive Operation",
    severity: "critical",
    category: "destructive_action",
    description: "Agent attempted destructive delete_user without authorization.",
    evidence: "delete_user called with cascade: true",
    suggestedAction: "Revoke deletion capability or require human approval.",
  };

  const alert: RuntimeAlert = {
    id: "alt-001",
    eventId: "evt-test-123",
    agentId: "support-bot-1",
    ruleId: violation.ruleId,
    ruleName: violation.ruleName,
    severity: violation.severity,
    category: violation.category,
    description: violation.description,
    evidence: violation.evidence,
    suggestedAction: violation.suggestedAction,
    status: "active",
    webhookSent: true,
    webhookStatus: "delivered",
    createdAt: new Date().toISOString(),
  };

  assert.equal(alert.severity, "critical");
  assert.equal(alert.webhookStatus, "delivered");
});

test("RuntimeWebhookConfig defines webhook endpoint and HMAC signing key", () => {
  const config: RuntimeWebhookConfig = {
    id: "wh-1",
    projectId: "proj-1",
    url: "https://api.customer.com/webhooks/wren",
    secret: "whsec_supersecretkey123",
    enabled: true,
    minSeverity: "high",
    createdAt: new Date().toISOString(),
  };

  assert.equal(config.enabled, true);
  assert.equal(config.minSeverity, "high");
  assert.ok(config.secret.startsWith("whsec_"));
});
