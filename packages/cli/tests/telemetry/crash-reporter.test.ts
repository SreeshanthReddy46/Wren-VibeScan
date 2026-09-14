import test from "node:test";
import assert from "node:assert/strict";
import {
  parseDsn,
  isTelemetryEnabled,
  sanitizeArg,
  buildSentryPayload,
  reportCrash,
  saveUserConfig,
} from "../../dist/index.js";

test("parseDsn extracts host, projectId, and publicKey from valid DSN", () => {
  const dsn = "https://abc1234@o1234.ingest.sentry.io/5678";
  const parsed = parseDsn(dsn);
  assert.ok(parsed);
  assert.strictEqual(parsed.publicKey, "abc1234");
  assert.strictEqual(parsed.host, "o1234.ingest.sentry.io");
  assert.strictEqual(parsed.projectId, "5678");
});

test("parseDsn returns null for malformed DSN strings", () => {
  assert.strictEqual(parseDsn("invalid-dsn"), null);
  assert.strictEqual(parseDsn("https://no-key.com/123"), null);
  assert.strictEqual(parseDsn(""), null);
});

test("isTelemetryEnabled respects DO_NOT_TRACK and WREN_TELEMETRY flags", () => {
  const origDnt = process.env.DO_NOT_TRACK;
  const origWren = process.env.WREN_TELEMETRY;

  try {
    saveUserConfig({ telemetryEnabled: true });
    delete process.env.DO_NOT_TRACK;
    delete process.env.WREN_TELEMETRY;
    assert.strictEqual(isTelemetryEnabled(), true);

    process.env.DO_NOT_TRACK = "1";
    assert.strictEqual(isTelemetryEnabled(), false);

    delete process.env.DO_NOT_TRACK;
    process.env.WREN_TELEMETRY = "0";
    assert.strictEqual(isTelemetryEnabled(), false);

    process.env.WREN_TELEMETRY = "false";
    assert.strictEqual(isTelemetryEnabled(), false);
  } finally {
    if (origDnt) process.env.DO_NOT_TRACK = origDnt;
    else delete process.env.DO_NOT_TRACK;

    if (origWren) process.env.WREN_TELEMETRY = origWren;
    else delete process.env.WREN_TELEMETRY;
  }
});

test("sanitizeArg strips sensitive credentials and API keys", () => {
  assert.strictEqual(sanitizeArg("--format=json"), "--format=json");
  assert.strictEqual(sanitizeArg("--api-key=sk-1234567890"), "--api-key=[REDACTED]");
  assert.strictEqual(sanitizeArg("-k=sk-secret"), "--api-key=[REDACTED]");
  assert.strictEqual(sanitizeArg("sk-ant-api03-secret"), "[REDACTED]");
  assert.strictEqual(sanitizeArg("wren_live_key_999"), "[REDACTED]");
});

test("buildSentryPayload formats valid Sentry JSON event structure", () => {
  const err = new Error("Test CLI crash");
  const payload = buildSentryPayload(err, "2.1.0", { testKey: "testVal" });

  assert.ok(payload.event_id);
  assert.strictEqual(payload.platform, "node");
  assert.strictEqual(payload.level, "error");
  assert.strictEqual(payload.release, "2.1.0");
  assert.strictEqual(payload.exception.values[0].value, "Test CLI crash");
  assert.strictEqual(payload.tags.os, process.platform);
  assert.strictEqual(payload.tags.node_version, process.version);
  assert.strictEqual((payload.extra as any).testKey, "testVal");
});

test("reportCrash executes safely without throwing when DSN is unset", () => {
  const origDsn = process.env.SENTRY_DSN;
  try {
    delete process.env.SENTRY_DSN;
    assert.doesNotThrow(() => {
      reportCrash(new Error("Simulated offline error"));
    });
  } finally {
    if (origDsn) process.env.SENTRY_DSN = origDsn;
  }
});
