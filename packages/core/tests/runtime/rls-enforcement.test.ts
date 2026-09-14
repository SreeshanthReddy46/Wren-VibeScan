import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "node:url";
import {
  dispatchScanJob,
  getScanRecord,
  updateScanStatus,
} from "../../../../apps/web/lib/scan-dispatcher.ts";
import { GET as getScanByIdRoute } from "../../../../apps/web/app/api/scans/[id]/route.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test("Row Level Security and Tenant Isolation: scan records are isolated by user ID", async () => {
  const scanBId = "scan-tenant-b-test";
  const userBUuid = "00000000-0000-0000-0000-000000000002";
  const userAUuid = "00000000-0000-0000-0000-000000000001";

  await updateScanStatus(scanBId, "completed", {
    userId: userBUuid,
    repoName: "acme/secret-service",
    branch: "main",
    findingsCount: 5,
  });

  const ownerAccess = await getScanRecord(scanBId, userBUuid);
  assert.ok(ownerAccess, "Owner (User B) must be able to retrieve own scan record");
  assert.strictEqual(ownerAccess?.userId, userBUuid);
  assert.strictEqual(ownerAccess?.repoName, "acme/secret-service");

  const foreignAccess = await getScanRecord(scanBId, userAUuid);
  assert.strictEqual(
    foreignAccess,
    null,
    "Non-owner (User A) must not be able to retrieve User B's scan record directly from dispatcher"
  );
});

test("API Route Multi-Tenant Protection: User A querying User B's scan receives 403 Forbidden", async () => {
  const scanBId = "scan-api-isolation-b";
  const userBUuid = "user-b-uuid-1234";
  const userAUuid = "user-a-uuid-9999";

  await updateScanStatus(scanBId, "completed", {
    userId: userBUuid,
    repoName: "corp/payroll-app",
    findingsCount: 2,
  });

  const ownerReq = new Request(`http://localhost:3000/api/scans/${scanBId}`, {
    method: "GET",
    headers: { "x-user-id": userBUuid },
  });
  const ownerRes = await getScanByIdRoute(ownerReq, {
    params: Promise.resolve({ id: scanBId }),
  });
  assert.strictEqual(ownerRes.status, 200, "Owner request must succeed with 200");
  const ownerData = await ownerRes.json();
  assert.strictEqual(ownerData.scan.id, scanBId);
  assert.strictEqual(ownerData.scan.userId, userBUuid);

  const attackerReq = new Request(`http://localhost:3000/api/scans/${scanBId}`, {
    method: "GET",
    headers: { "x-user-id": userAUuid },
  });
  const attackerRes = await getScanByIdRoute(attackerReq, {
    params: Promise.resolve({ id: scanBId }),
  });
  assert.strictEqual(
    attackerRes.status,
    403,
    "Cross-user request must be rejected with 403 Forbidden"
  );
  const attackerData = await attackerRes.json();
  assert.ok(
    attackerData.error.includes("Forbidden"),
    "Response must indicate forbidden access"
  );

  const missingReq = new Request(`http://localhost:3000/api/scans/non-existent-scan`, {
    method: "GET",
  });
  const missingRes = await getScanByIdRoute(missingReq, {
    params: Promise.resolve({ id: "non-existent-scan" }),
  });
  assert.strictEqual(missingRes.status, 404, "Non-existent scan must return 404 Not Found");
});

test("Database Schema RLS Invariants: scan tables enforce row level security and tenant policies", () => {
  const schemaPath = path.resolve(__dirname, "../../../../apps/web/lib/scan-schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf8");

  assert.ok(
    schemaSql.includes("ALTER TABLE scans ENABLE ROW LEVEL SECURITY;"),
    "scans table must have RLS enabled"
  );
  assert.ok(
    schemaSql.includes("ALTER TABLE scan_findings ENABLE ROW LEVEL SECURITY;"),
    "scan_findings table must have RLS enabled"
  );
  assert.ok(
    schemaSql.includes("ALTER TABLE scan_events ENABLE ROW LEVEL SECURITY;"),
    "scan_events table must have RLS enabled"
  );
  assert.ok(
    schemaSql.includes("auth.uid() = user_id"),
    "scans table must enforce auth.uid() = user_id policy"
  );
  assert.ok(
    schemaSql.includes("scans.user_id = auth.uid()"),
    "child tables must cascade tenant isolation via scans.user_id = auth.uid()"
  );
});
