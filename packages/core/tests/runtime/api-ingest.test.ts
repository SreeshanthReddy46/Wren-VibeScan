import test from "node:test";
import assert from "node:assert/strict";
import {
  POST as ingestEventRoute,
  GET as getEventsRoute,
} from "../../../../apps/web/app/api/v1/agent-events/route.ts";
import {
  getRuntimeAgentEvents,
  getRuntimeAlerts,
  clearRuntimeStoreForTesting,
} from "../../../../apps/web/lib/runtime-dispatcher.ts";

test("POST /api/v1/agent-events validates required payload fields", async () => {
  clearRuntimeStoreForTesting();

  // Missing agentId
  const badReq = new Request("http://localhost:3000/api/v1/agent-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "read_file" }),
  });

  const res = await ingestEventRoute(badReq);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /agentId/i);
});

test("POST /api/v1/agent-events ingests valid event with 202 Accepted and evaluates threat rules", async () => {
  clearRuntimeStoreForTesting();

  const req = new Request("http://localhost:3000/api/v1/agent-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agentId: "support-agent-prod",
      action: "delete_user",
      declaredIntent: "Fetch account statistics",
      arguments: { userId: "usr_danger_1" },
    }),
  });

  const res = await ingestEventRoute(req);
  assert.equal(res.status, 202);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.status, "queued");
  assert.ok(data.eventId);

  // Verify event was logged
  const events = await getRuntimeAgentEvents();
  assert.equal(events.length, 1);
  assert.equal(events[0].agentId, "support-agent-prod");

  // Verify threat rule WREN-RUN-001 tripped and created an alert
  const alerts = await getRuntimeAlerts();
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].ruleId, "WREN-RUN-001");
  assert.equal(alerts[0].severity, "critical");
});

test("GET /api/v1/agent-events retrieves ingested events stream with agent filter", async () => {
  const getReq = new Request("http://localhost:3000/api/v1/agent-events?agentId=support-agent-prod");
  const getRes = await getEventsRoute(getReq);
  assert.equal(getRes.status, 200);
  const data = await getRes.json();
  assert.equal(data.events.length, 1);
  assert.equal(data.events[0].agentId, "support-agent-prod");
});
