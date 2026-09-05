import test from "node:test";
import assert from "node:assert/strict";
import { POST } from "../../../../apps/web/app/api/remediations/route.ts";
import { GET as getRemediationById } from "../../../../apps/web/app/api/remediations/[id]/route.ts";
import {
  GET as getSettings,
  PATCH as patchSettings,
} from "../../../../apps/web/app/api/repos/[owner]/[repo]/settings/route.ts";

test("POST /api/remediations returns 202 Accepted with queued remediationId", async () => {
  const req = new Request("http://localhost:3000/api/remediations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scanId: "scan-1",
      findingId: "f-1",
      repoName: "acme/vibe-shop",
    }),
  });

  const res = await POST(req);
  assert.equal(res.status, 202);
  const data = await res.json();
  assert.equal(data.status, "queued");
  assert.ok(data.remediationId);
});

test("GET /api/remediations/[id] returns remediation record", async () => {

  const req = new Request("http://localhost:3000/api/remediations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scanId: "scan-2",
      findingId: "f-2",
      repoName: "acme/vibe-shop",
    }),
  });
  const postRes = await POST(req);
  const { remediationId } = await postRes.json();

  const getReq = new Request(`http://localhost:3000/api/remediations/${remediationId}`);
  const getRes = await getRemediationById(getReq, {
    params: Promise.resolve({ id: remediationId }),
  });

  assert.equal(getRes.status, 200);
  const data = await getRes.json();
  assert.equal(data.remediation.id, remediationId);
  assert.ok(["queued", "generating_patch", "syntax_verifying", "pr_opened"].includes(data.remediation.status));
});

test("GET and PATCH repo settings enforces default false for opt-in", async () => {
  const getReq = new Request("http://localhost:3000/api/repos/acme/vibe-shop/settings");
  const getRes = await getSettings(getReq, {
    params: Promise.resolve({ owner: "acme", repo: "vibe-shop" }),
  });
  const data = await getRes.json();
  assert.equal(data.autoRemediateEnabled, false);

  const patchReq = new Request("http://localhost:3000/api/repos/acme/vibe-shop/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ autoRemediateEnabled: true }),
  });
  const patchRes = await patchSettings(patchReq, {
    params: Promise.resolve({ owner: "acme", repo: "vibe-shop" }),
  });
  const updated = await patchRes.json();
  assert.equal(updated.autoRemediateEnabled, true);
});
