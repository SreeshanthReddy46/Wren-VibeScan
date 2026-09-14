import test from "node:test";
import assert from "node:assert/strict";
import {
  checkRateLimit,
  clearRateLimitsForTesting,
  getClientIdentifier,
} from "../../../../apps/web/lib/rate-limiter.ts";
import { POST as postScanRoute } from "../../../../apps/web/app/api/scans/route.ts";
import { POST as postRemediationRoute } from "../../../../apps/web/app/api/remediations/route.ts";

test("Sliding Window Rate Limiter: enforces limits and provides retry metadata", () => {
  clearRateLimitsForTesting();

  const clientId = "client-test-123";

  for (let i = 0; i < 10; i++) {
    const res = checkRateLimit(clientId, "llm");
    assert.strictEqual(res.allowed, true, `Request ${i + 1} within llm limit must be allowed`);
    assert.strictEqual(res.remaining, 10 - (i + 1));
  }

  const blocked = checkRateLimit(clientId, "llm");
  assert.strictEqual(blocked.allowed, false, "Request exceeding llm limit must be rejected");
  assert.strictEqual(blocked.remaining, 0);
  assert.ok(blocked.retryAfterSec >= 1, "retryAfterSec must be at least 1 second");
  assert.strictEqual(blocked.limit, 10);

  const separateClient = checkRateLimit("client-independent", "llm");
  assert.strictEqual(
    separateClient.allowed,
    true,
    "Independent client ID must have separate rate limit bucket"
  );
});

test("Rate Limiter Tiers: llm tier is strictly bounded compared to general tier", () => {
  clearRateLimitsForTesting();

  const generalClient = "client-general-tier";

  for (let i = 0; i < 15; i++) {
    const res = checkRateLimit(generalClient, "general");
    assert.strictEqual(res.allowed, true, `General request ${i + 1} must be allowed (limit is 60)`);
  }

  const generalStatus = checkRateLimit(generalClient, "general");
  assert.strictEqual(generalStatus.allowed, true);
  assert.strictEqual(generalStatus.limit, 60);

  const llmClient = "client-llm-tier";
  for (let i = 0; i < 10; i++) {
    checkRateLimit(llmClient, "llm");
  }
  const llmBlocked = checkRateLimit(llmClient, "llm");
  assert.strictEqual(llmBlocked.allowed, false);
  assert.strictEqual(llmBlocked.limit, 10);
});

test("Rate Limiter Custom Window: window reset restores allowance", () => {
  clearRateLimitsForTesting();

  const shortWindowClient = "client-short-window";
  const customConfig = { maxRequests: 2, windowMs: 10 };

  const first = checkRateLimit(shortWindowClient, "general", customConfig);
  assert.strictEqual(first.allowed, true);

  const second = checkRateLimit(shortWindowClient, "general", customConfig);
  assert.strictEqual(second.allowed, true);

  const third = checkRateLimit(shortWindowClient, "general", customConfig);
  assert.strictEqual(third.allowed, false);

  const futureNow = Date.now() + 50;
  const originalDateNow = Date.now;
  try {
    Date.now = () => futureNow;
    const restored = checkRateLimit(shortWindowClient, "general", customConfig);
    assert.strictEqual(restored.allowed, true, "Allowance must be restored after window expires");
  } finally {
    Date.now = originalDateNow;
  }
});

test("Client Identifier Extraction: resolves IP or authorization header correctly", () => {
  const forwardedReq = new Request("http://localhost:3000", {
    headers: { "x-forwarded-for": "203.0.113.195, 70.41.3.18" },
  });
  assert.strictEqual(getClientIdentifier(forwardedReq), "203.0.113.195");

  const realIpReq = new Request("http://localhost:3000", {
    headers: { "x-real-ip": "198.51.100.42" },
  });
  assert.strictEqual(getClientIdentifier(realIpReq), "198.51.100.42");

  const authReq = new Request("http://localhost:3000", {
    headers: { authorization: "Bearer secret-token-abcdef123456" },
  });
  assert.ok(getClientIdentifier(authReq).startsWith("auth:"));

  const anonReq = new Request("http://localhost:3000");
  assert.strictEqual(getClientIdentifier(anonReq), "anonymous-client");
});

test("HTTP Route Integration: returns 429 Too Many Requests with Retry-After header", async () => {
  clearRateLimitsForTesting();

  const clientIp = "192.0.2.77";

  for (let i = 0; i < 10; i++) {
    const req = new Request("http://localhost:3000/api/scans", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-real-ip": clientIp,
      },
      body: JSON.stringify({
        repoName: "test/rate-limited-repo",
        config: { enableLlmReasoning: true },
      }),
    });

    const res = await postScanRoute(req);
    assert.strictEqual(res.status, 202, `Request ${i + 1} must return 202`);
  }

  const blockedReq = new Request("http://localhost:3000/api/scans", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-real-ip": clientIp,
    },
    body: JSON.stringify({
      repoName: "test/rate-limited-repo",
      config: { enableLlmReasoning: true },
    }),
  });

  const blockedRes = await postScanRoute(blockedReq);
  assert.strictEqual(blockedRes.status, 429, "11th request must receive 429 Too Many Requests");
  assert.ok(blockedRes.headers.get("Retry-After"), "Response must include Retry-After header");
  const blockedBody = await blockedRes.json();
  assert.ok(blockedBody.error.includes("Rate limit exceeded"));
  assert.ok(blockedBody.retryAfter >= 1);

  const remReq = new Request("http://localhost:3000/api/remediations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-real-ip": clientIp,
    },
    body: JSON.stringify({
      scanId: "scan-rate-1",
      findingId: "f-1",
    }),
  });

  const remRes = await postRemediationRoute(remReq);
  assert.strictEqual(
    remRes.status,
    429,
    "Remediation endpoint for exhausted client must also return 429"
  );
});
