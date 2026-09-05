# Implementation Plan - Event-Driven Scan Architecture (Inngest & Supabase Realtime)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Wren VibeScan from a synchronous request-response model to an asynchronous event-driven workflow powered by Inngest for background execution and Supabase Realtime for live-ticking UI streaming.

**Architecture:** The scan API immediately returns a queued scan ID (`202 Accepted`). Inngest picks up the `scan.requested` event, executes the scan in durable steps (`static-ast-pass` → `agent-loop-pass` → `finalize-scan`), and emits live events (`finding.discovered`, `finding.verified`, `scan.completed`). Changes are saved to Supabase tables (`scans`, `scan_findings`, `scan_events`) and streamed via Supabase Realtime to the dashboard and CLI.

**Tech Stack:**
- Node.js 24 (`node:test`, `node:assert/strict`)
- Next.js 15 App Router
- Inngest SDK (`inngest`)
- Supabase Realtime (`@supabase/supabase-js`)
- `@wren/core`, `@wren/shared-types`

## Global Constraints
- Target packages: `apps/web`, `packages/shared-types`, `packages/cli`
- Durable Inngest multi-step execution with automated retries
- Seamless in-process background worker fallback for offline/CI environments
- Preserves full state in Supabase tables on page refresh
- Monorepo `pnpm typecheck` must stay 100% clean across all 5 workspace packages

---

### Task 1: Event-Driven Types & Scan Schema

**Files:**
- Create: `apps/web/lib/scan-schema.sql`
- Modify: `packages/shared-types/src/index.ts`
- Test: `packages/core/tests/events/types.test.ts`

**Interfaces:**
- Consumes: `@wren/shared-types`
- Produces: `ScanLifecycleStatus`, `ScanJobRequest`, `ScanJobResponse`, `ScanStepEvent`

- [ ] **Step 1: Write failing test for event types**

Create `packages/core/tests/events/types.test.ts`:
```typescript
import test from "node:test";
import assert from "node:assert/strict";
import type { ScanJobResponse, ScanStepEvent } from "@wren/shared-types";

test("ScanJobResponse provides queued status and dashboardUrl", () => {
  const response: ScanJobResponse = {
    success: true,
    scanId: "scan-123",
    status: "queued",
    dashboardUrl: "/scans/scan-123",
  };
  assert.equal(response.status, "queued");
  assert.match(response.dashboardUrl, /scan-123/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test packages/core/tests/events/types.test.ts`
Expected: FAIL

- [ ] **Step 3: Create `apps/web/lib/scan-schema.sql` and update `packages/shared-types/src/index.ts`**

Add `ScanLifecycleStatus`, `ScanJobRequest`, `ScanJobResponse`, and `ScanStepEvent` to `@wren/shared-types`.
Create `apps/web/lib/scan-schema.sql` with table definitions and `supabase_realtime` publication.

- [ ] **Step 4: Run typecheck and test to verify it passes**

Run:
```bash
pnpm --filter @wren/shared-types run build
node --experimental-strip-types --test packages/core/tests/events/types.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/scan-schema.sql packages/shared-types/src/index.ts packages/core/tests/events/types.test.ts
git commit -m "feat(types): add event-driven scan lifecycle types and database schema"
```

---

### Task 2: Inngest Client & Typed Event Definitions

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/inngest/client.ts`
- Create: `apps/web/inngest/events.ts`
- Create: `apps/web/app/api/inngest/route.ts`

**Interfaces:**
- Consumes: `inngest`, `@wren/shared-types`
- Produces: `inngest` client, `ScanRequestedEvent`, `ScanProgressEvent`, `ScanCompletedEvent`

- [ ] **Step 1: Install `inngest` in `apps/web`**

Run:
```bash
pnpm --filter web add inngest
```

- [ ] **Step 2: Implement `apps/web/inngest/client.ts` and `events.ts`**

Define Inngest client and typed event schema.

- [ ] **Step 3: Implement `apps/web/app/api/inngest/route.ts`**

Expose Inngest serve handler for Next.js App Router.

- [ ] **Step 4: Verify typecheck**

Run: `pnpm --filter web run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json apps/web/inngest apps/web/app/api/inngest pnpm-lock.yaml
git commit -m "feat(web): configure inngest client, typed events, and serve route handler"
```

---

### Task 3: Durable Background Scan Runner (Inngest Function + Local Fallback)

**Files:**
- Create: `apps/web/inngest/functions/execute-scan.ts`
- Create: `apps/web/lib/scan-dispatcher.ts`
- Test: `packages/core/tests/events/dispatcher.test.ts`

**Interfaces:**
- Consumes: `@wren/core`, `inngest`
- Produces: `executeScanFunction`, `dispatchScanJob(scanId, payload): Promise<ScanJobResponse>`

- [ ] **Step 1: Write failing test for scan dispatcher**

Create `packages/core/tests/events/dispatcher.test.ts`:
```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { dispatchScanJob } from "../../../apps/web/lib/scan-dispatcher.ts";

test("dispatchScanJob creates queued response and initiates background processing", async () => {
  const result = await dispatchScanJob({
    scanId: "scan-test-dispatch",
    targetPath: ".",
  });

  assert.equal(result.success, true);
  assert.equal(result.status, "queued");
  assert.equal(result.scanId, "scan-test-dispatch");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test packages/core/tests/events/dispatcher.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `execute-scan.ts` and `scan-dispatcher.ts`**

Implement multi-step Inngest function orchestrating `@wren/core` scan steps and in-process background worker fallback for offline/CI execution.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test packages/core/tests/events/dispatcher.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/inngest/functions apps/web/lib/scan-dispatcher.ts packages/core/tests/events/dispatcher.test.ts
git commit -m "feat(web): implement durable Inngest scan function with local background fallback"
```

---

### Task 4: Upgraded Scan API Routes (`/api/scans` & `/api/scans/[id]`)

**Files:**
- Modify: `apps/web/app/api/scans/route.ts`
- Create: `apps/web/app/api/scans/[id]/route.ts`
- Test: `packages/core/tests/events/api-scans.test.ts`

**Interfaces:**
- Consumes: `dispatchScanJob`, `getScanRecord`
- Produces: `POST /api/scans` (202 Accepted), `GET /api/scans/[id]`

- [ ] **Step 1: Write failing test for API route handlers**

Create `packages/core/tests/events/api-scans.test.ts`:
```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { POST } from "../../../apps/web/app/api/scans/route.ts";
import { GET } from "../../../apps/web/app/api/scans/[id]/route.ts";

test("POST /api/scans returns 202 Accepted with queued scanId", async () => {
  const req = new Request("http://localhost/api/scans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: "." }),
  });

  const res = await POST(req);
  assert.equal(res.status, 202);
  const data = await res.json();
  assert.equal(data.status, "queued");
  assert.ok(data.scanId);
  assert.match(data.dashboardUrl, /scans/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test packages/core/tests/events/api-scans.test.ts`
Expected: FAIL

- [ ] **Step 3: Update `POST /api/scans` and implement `GET /api/scans/[id]`**

Return 202 Accepted immediately on POST; provide scan details and findings on GET.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test packages/core/tests/events/api-scans.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/scans packages/core/tests/events/api-scans.test.ts
git commit -m "feat(web): update /api/scans to return 202 Accepted and add /api/scans/[id] route"
```

---

### Task 5: Supabase Realtime Hook (`useScanRealtime`)

**Files:**
- Create: `apps/web/hooks/use-scan-realtime.ts`
- Test: `packages/core/tests/events/realtime-hook.test.ts`

**Interfaces:**
- Consumes: Supabase client
- Produces: `useScanRealtime(scanId: string)`

- [ ] **Step 1: Write test for realtime hook logic**

Create `packages/core/tests/events/realtime-hook.test.ts`:
```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { handleRealtimePayload } from "../../../apps/web/hooks/use-scan-realtime.ts";

test("handleRealtimePayload accumulates incoming findings and updates status", () => {
  let state = { status: "queued", findings: [] as any[] };

  state = handleRealtimePayload(state, {
    eventType: "finding.verified",
    newFinding: { id: "f-1", ruleId: "AUTH_TEST", severity: "high" },
  });

  assert.equal(state.findings.length, 1);
  assert.equal(state.findings[0].id, "f-1");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test packages/core/tests/events/realtime-hook.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `apps/web/hooks/use-scan-realtime.ts`**

Implement `useScanRealtime` with Supabase Realtime channel subscription and state accumulator.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test packages/core/tests/events/realtime-hook.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/hooks/use-scan-realtime.ts packages/core/tests/events/realtime-hook.test.ts
git commit -m "feat(web): implement useScanRealtime hook for live finding streaming"
```

---

### Task 6: CLI Streaming Client (`wren check --async` & live terminal progress)

**Files:**
- Modify: `packages/cli/src/commands/check.ts`
- Test: `packages/cli/tests/commands/check-async.test.ts`

**Interfaces:**
- Consumes: `--async` flag, `CheckCommandOptions`
- Produces: Asynchronous submission with immediate exit code 0 or live terminal step tailing

- [ ] **Step 1: Write failing test for `--async` CLI command option**

Create `packages/cli/tests/commands/check-async.test.ts`:
```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { runCheckCommand } from "../../src/commands/check.ts";
import { ExitCode } from "../../src/utils/exit-codes.ts";

test("runCheckCommand with async=true returns SUCCESS immediately", async () => {
  const exitCode = await runCheckCommand(".", { async: true });
  assert.equal(exitCode, ExitCode.SUCCESS);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test packages/cli/tests/commands/check-async.test.ts`
Expected: FAIL

- [ ] **Step 3: Update `runCheckCommand` in `packages/cli/src/commands/check.ts`**

Add `async?: boolean` option to submit to the engine, display the dashboard link, and exit immediately with `ExitCode.SUCCESS` (or tail progress when in default mode).

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test packages/cli/tests/commands/check-async.test.ts`
Expected: PASS

- [ ] **Step 5: Verify build & full typecheck across workspace**

Run:
```bash
pnpm --filter @wren/core test
pnpm --filter web run build
pnpm typecheck
```
Expected: All tests pass and 0 typecheck errors across all 5 workspace packages.

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/commands/check.ts packages/cli/tests/commands/check-async.test.ts
git commit -m "feat(cli): add --async option and live progress streaming to check command"
```
