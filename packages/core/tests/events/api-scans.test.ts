import test from "node:test";
import assert from "node:assert/strict";
import { POST } from "../../../../apps/web/app/api/scans/route.ts";
import { GET as getScanById } from "../../../../apps/web/app/api/scans/[id]/route.ts";

test("POST /api/scans returns 202 Accepted with queued scanId and dashboardUrl", async () => {
  const req = new Request("http://localhost:3000/api/scans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: "." }),
  });

  const res = await POST(req);
  assert.equal(res.status, 202);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.status, "queued");
  assert.ok(data.scanId);
  assert.match(data.dashboardUrl, new RegExp(data.scanId));
});

test("GET /api/scans/[id] returns scan status and findings", async () => {
  // First create a scan
  const createReq = new Request("http://localhost:3000/api/scans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: "." }),
  });
  const createRes = await POST(createReq);
  const { scanId } = await createRes.json();

  // Fetch scan by ID
  const getReq = new Request(`http://localhost:3000/api/scans/${scanId}`);
  const getRes = await getScanById(getReq, {
    params: Promise.resolve({ id: scanId }),
  });

  assert.equal(getRes.status, 200);
  const scanData = await getRes.json();
  assert.equal(scanData.scan.id, scanId);
  assert.ok(Array.isArray(scanData.findings));
});

test("GET /api/scans/[id] returns 404 for non-existent scan", async () => {
  const getReq = new Request("http://localhost:3000/api/scans/non-existent-scan");
  const getRes = await getScanById(getReq, {
    params: Promise.resolve({ id: "non-existent-scan" }),
  });

  assert.equal(getRes.status, 404);
});
