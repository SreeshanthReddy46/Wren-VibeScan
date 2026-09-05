import test from "node:test";
import assert from "node:assert/strict";
import {
  generateWebhookSignature,
  verifyWebhookSignature,
} from "../../dist/index.js";

test("generateWebhookSignature creates valid t=...,v1=... HMAC-SHA256 signature header", () => {
  const secret = "whsec_test_secret_123456789";
  const payload = {
    alertId: "alt-123",
    agentId: "support-bot",
    severity: "critical",
    ruleId: "WREN-RUN-001",
  };

  const { signature, header, timestamp } = generateWebhookSignature(payload, secret);

  assert.ok(signature);
  assert.equal(typeof signature, "string");
  assert.equal(signature.length, 64); // 256 bits in hex = 64 chars
  assert.match(header, /^t=\d+,v1=[a-f0-9]{64}$/);
  assert.ok(timestamp > 0);
});

test("verifyWebhookSignature validates authentic payload with correct secret", () => {
  const secret = "whsec_valid_secret";
  const payload = { eventId: "evt-99", action: "delete_user" };

  const { header } = generateWebhookSignature(payload, secret);
  const isValid = verifyWebhookSignature(payload, header, secret);

  assert.equal(isValid, true);
});

test("verifyWebhookSignature rejects tampered payload or wrong secret", () => {
  const secret = "whsec_valid_secret";
  const payload = { eventId: "evt-99", action: "delete_user" };

  const { header } = generateWebhookSignature(payload, secret);

  // Tampered payload
  const tamperedPayload = { eventId: "evt-99", action: "read_user" };
  assert.equal(verifyWebhookSignature(tamperedPayload, header, secret), false);

  // Wrong secret
  assert.equal(verifyWebhookSignature(payload, header, "whsec_wrong_secret"), false);
});

test("verifyWebhookSignature enforces tolerance window against replay attacks", () => {
  const secret = "whsec_replay_test";
  const payload = { action: "drop_table" };

  // Generate signature with timestamp 10 minutes (600s) in the past
  const pastTimestamp = Math.floor(Date.now() / 1000) - 600;
  const { header } = generateWebhookSignature(payload, secret, pastTimestamp);

  // Default tolerance is 300 seconds (5 mins)
  const isValid = verifyWebhookSignature(payload, header, secret, 300);
  assert.equal(isValid, false);

  // With a wider tolerance of 1000 seconds, it accepts
  const isValidWide = verifyWebhookSignature(payload, header, secret, 1000);
  assert.equal(isValidWide, true);
});
