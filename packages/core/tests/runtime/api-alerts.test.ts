import test from "node:test";
import assert from "node:assert/strict";
import {
  GET as getAlertsRoute,
  PATCH as patchAlertsRoute,
} from "../../../../apps/web/app/api/v1/runtime-alerts/route.ts";
import {
  GET as getWebhookConfigRoute,
  POST as postWebhookConfigRoute,
} from "../../../../apps/web/app/api/v1/webhooks/config/route.ts";
import {
  ingestCustomerAgentEvent,
  clearRuntimeStoreForTesting,
} from "../../../../apps/web/lib/runtime-dispatcher.ts";

test("GET and PATCH /api/v1/runtime-alerts manages tripped threat alerts", async () => {
  clearRuntimeStoreForTesting();

  await ingestCustomerAgentEvent({
    agentId: "support-bot-test",
    action: "grant_admin",
    declaredIntent: "Reset password",
    arguments: { userId: "usr_attacker", role: "admin" },
  });

  const getReq = new Request("http://localhost:3000/api/v1/runtime-alerts");
  const getRes = await getAlertsRoute(getReq);
  assert.equal(getRes.status, 200);
  const data = await getRes.json();
  assert.equal(data.alerts.length, 1);
  assert.equal(data.alerts[0].ruleId, "WREN-RUN-002");
  assert.equal(data.alerts[0].status, "active");

  const alertId = data.alerts[0].id;

  const patchReq = new Request("http://localhost:3000/api/v1/runtime-alerts", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      alertId,
      status: "acknowledged",
    }),
  });

  const patchRes = await patchAlertsRoute(patchReq);
  assert.equal(patchRes.status, 200);
  const patchData = await patchRes.json();
  assert.equal(patchData.alert.status, "acknowledged");
});

test("GET and POST /api/v1/webhooks/config updates webhook destination and signing secret", async () => {

  const getReq = new Request("http://localhost:3000/api/v1/webhooks/config?projectId=test-proj");
  const getRes = await getWebhookConfigRoute(getReq);
  assert.equal(getRes.status, 200);
  const { config } = await getRes.json();
  assert.ok(config.secret);

  const postReq = new Request("http://localhost:3000/api/v1/webhooks/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId: "test-proj",
      url: "https://api.mycorp.com/wren-alerts",
      minSeverity: "critical",
      enabled: true,
    }),
  });

  const postRes = await postWebhookConfigRoute(postReq);
  assert.equal(postRes.status, 200);
  const postData = await postRes.json();
  assert.equal(postData.config.url, "https://api.mycorp.com/wren-alerts");
  assert.equal(postData.config.minSeverity, "critical");
});
