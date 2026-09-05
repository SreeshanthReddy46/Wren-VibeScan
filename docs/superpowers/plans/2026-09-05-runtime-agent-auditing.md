# Runtime Agent Auditing (v2.0 Expansion) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the v2.0 runtime data ingestion, threat rules engine, and cryptographic webhook alerting system for auditing live customer production agents against declared intent.

**Architecture:** A high-throughput Next.js 15 App Router ingestion endpoint (`POST /api/v1/agent-events`) accepts customer agent tool calls with `<10ms` response times; an in-memory & Inngest event stream evaluates deterministic threat rules (destructive actions, privilege escalation, credential/PII leakage) in `@wren/core`, logging events and alerts to Supabase/Postgres and dispatching HMAC-SHA256 signed webhook alerts with exponential backoff retries.

**Tech Stack:** TypeScript, Next.js 15 (App Router), `@wren/core`, Inngest, Supabase / PostgreSQL Realtime, Node `node:crypto` HMAC-SHA256, Tailwind CSS, Lucide Icons.

## Global Constraints
- Node test runner (`node --experimental-strip-types --test tests/runtime/*.test.ts`) for `@wren/core`.
- Zero secret leakage: Never log or transmit raw secrets in plain text.
- Strict Next.js 15 App Router compatibility: all dynamic route `context.params` must be awaited (`const { id } = await context.params`).
- Dual persistence / offline resilience: in-memory worker fallback when external Inngest daemon or Supabase is offline.

---

### Task 1: Shared Runtime Types & SQL Schema

**Files:**
- Create: `apps/web/lib/runtime-audit-schema.sql`
- Modify: `packages/shared-types/src/index.ts`
- Test: `packages/core/tests/runtime/types.test.ts`

**Interfaces:**
- Produces: `CustomerAgentEvent`, `RuntimeRuleViolation`, `RuntimeAlert`, `RuntimeWebhookConfig`.

- [ ] **Step 1: Write the failing test**
Create `packages/core/tests/runtime/types.test.ts` checking type shapes and properties.

- [ ] **Step 2: Run test to verify it fails**
Run `node --experimental-strip-types --test tests/runtime/types.test.ts` in `packages/core`.

- [ ] **Step 3: Update shared types and create SQL schema**
Update `packages/shared-types/src/index.ts` with runtime auditing types, and create `apps/web/lib/runtime-audit-schema.sql`.

- [ ] **Step 4: Run test to verify it passes**
Run `pnpm --filter @wren/shared-types build` and re-run test.

- [ ] **Step 5: Commit**
```bash
git add packages/shared-types/src/index.ts apps/web/lib/runtime-audit-schema.sql packages/core/tests/runtime/types.test.ts
git commit -m "feat(types): define runtime agent auditing types and database schema"
```

---

### Task 2: Cryptographic Webhook Signer & Verification

**Files:**
- Create: `packages/core/src/runtime/webhook-signer.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/tests/runtime/webhook-signer.test.ts`

**Interfaces:**
- Produces: `generateWebhookSignature(payload: unknown, secret: string, timestamp?: number): { signature: string; header: string; timestamp: number }`, `verifyWebhookSignature(payload: unknown, signatureHeader: string, secret: string, toleranceSeconds?: number): boolean`.

- [ ] **Step 1: Write the failing test**
Create `packages/core/tests/runtime/webhook-signer.test.ts` verifying signature creation, valid verification, replay attacks (tolerance expiry), and tampered payload rejection.

- [ ] **Step 2: Run test to verify it fails**
Run `node --experimental-strip-types --test tests/runtime/webhook-signer.test.ts` in `packages/core`.

- [ ] **Step 3: Implement Webhook Signer**
Implement `packages/core/src/runtime/webhook-signer.ts` with HMAC-SHA256, and export in `packages/core/src/index.ts`.

- [ ] **Step 4: Run test to verify it passes**
Run `pnpm --filter @wren/core test tests/runtime/webhook-signer.test.ts`.

- [ ] **Step 5: Commit**
```bash
git add packages/core/src/runtime/webhook-signer.ts packages/core/src/index.ts packages/core/tests/runtime/webhook-signer.test.ts
git commit -m "feat(core): implement cryptographic HMAC-SHA256 webhook signer and verifier"
```

---

### Task 3: Runtime Security Rules Engine

**Files:**
- Create: `packages/core/src/runtime/types.ts`
- Create: `packages/core/src/runtime/rules.ts`
- Create: `packages/core/src/runtime/engine.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/tests/runtime/rules.test.ts`
- Test: `packages/core/tests/runtime/engine.test.ts`

**Interfaces:**
- Consumes: `CustomerAgentEvent`, `RuntimeRuleViolation`.
- Produces: `WREN_RUN_RULES`, `evaluateRuntimeAgentEvent(event: CustomerAgentEvent, customRules?: RuntimeRule[])`.

- [ ] **Step 1: Write the failing test**
Create `packages/core/tests/runtime/rules.test.ts` checking destructive operations (`WREN-RUN-001`), privilege escalation (`WREN-RUN-002`), credential leaks (`WREN-RUN-003`), and PII exposure (`WREN-RUN-004`).

- [ ] **Step 2: Run test to verify it fails**
Run `node --experimental-strip-types --test tests/runtime/rules.test.ts` in `packages/core`.

- [ ] **Step 3: Implement Runtime Rules & Engine**
Implement `packages/core/src/runtime/rules.ts` and `packages/core/src/runtime/engine.ts`. Export in `packages/core/src/index.ts`.

- [ ] **Step 4: Run test to verify it passes**
Run `pnpm --filter @wren/core test tests/runtime/rules.test.ts tests/runtime/engine.test.ts`.

- [ ] **Step 5: Commit**
```bash
git add packages/core/src/runtime/ packages/core/src/index.ts packages/core/tests/runtime/
git commit -m "feat(core): implement runtime threat detection rules engine"
```

---

### Task 4: Runtime Dispatcher & Event Ingestion API

**Files:**
- Create: `apps/web/lib/runtime-dispatcher.ts`
- Create: `apps/web/app/api/v1/agent-events/route.ts`
- Test: `packages/core/tests/runtime/api-ingest.test.ts`

**Interfaces:**
- Consumes: `CustomerAgentEvent`, `evaluateRuntimeAgentEvent`.
- Produces: `recordCustomerAgentEvent`, `getAgentEvents`, `getAgentAlerts`.

- [ ] **Step 1: Write the failing test**
Create `packages/core/tests/runtime/api-ingest.test.ts` verifying `POST /api/v1/agent-events` returns 202 with eventId, validates required fields, and triggers background rule evaluation.

- [ ] **Step 2: Run test to verify it fails**
Run `node --experimental-strip-types --test tests/runtime/api-ingest.test.ts` in `packages/core`.

- [ ] **Step 3: Implement Runtime Dispatcher & API Route**
Implement `apps/web/lib/runtime-dispatcher.ts` and `apps/web/app/api/v1/agent-events/route.ts`.

- [ ] **Step 4: Run test to verify it passes**
Run `node --experimental-strip-types --test tests/runtime/api-ingest.test.ts`.

- [ ] **Step 5: Commit**
```bash
git add apps/web/lib/runtime-dispatcher.ts apps/web/app/api/v1/agent-events/route.ts packages/core/tests/runtime/api-ingest.test.ts
git commit -m "feat(web): implement runtime event dispatcher and /api/v1/agent-events ingestion route"
```

---

### Task 5: Webhook Alerts & Configuration API

**Files:**
- Create: `apps/web/app/api/v1/runtime-alerts/route.ts`
- Create: `apps/web/app/api/v1/webhooks/config/route.ts`
- Create: `apps/web/inngest/functions/execute-runtime-audit.ts`
- Modify: `apps/web/app/api/inngest/route.ts`
- Test: `packages/core/tests/runtime/api-alerts.test.ts`

**Interfaces:**
- Consumes: `RuntimeAlert`, `RuntimeWebhookConfig`, `generateWebhookSignature`.
- Produces: `GET/PATCH /api/v1/runtime-alerts`, `GET/POST /api/v1/webhooks/config`.

- [ ] **Step 1: Write the failing test**
Create `packages/core/tests/runtime/api-alerts.test.ts` testing alerts query, acknowledging alerts, and saving webhook configurations.

- [ ] **Step 2: Run test to verify it fails**
Run `node --experimental-strip-types --test tests/runtime/api-alerts.test.ts` in `packages/core`.

- [ ] **Step 3: Implement Alerts and Webhook Routes & Inngest function**
Implement `runtime-alerts/route.ts`, `webhooks/config/route.ts`, and Inngest function `execute-runtime-audit.ts`.

- [ ] **Step 4: Run test to verify it passes**
Run `node --experimental-strip-types --test tests/runtime/api-alerts.test.ts`.

- [ ] **Step 5: Commit**
```bash
git add apps/web/app/api/v1/ apps/web/inngest/ packages/core/tests/runtime/api-alerts.test.ts
git commit -m "feat(web): implement runtime alerts API, webhook config routes, and Inngest pipeline"
```

---

### Task 6: Live Audit Dashboard & Webhook Settings UI

**Files:**
- Create: `apps/web/app/audit/page.tsx`
- Create: `apps/web/app/settings/webhooks/page.tsx`
- Modify: `apps/web/components/marketing/navbar.tsx` (or header nav links)

**Interfaces:**
- Consumes: `/api/v1/agent-events`, `/api/v1/runtime-alerts`, `/api/v1/webhooks/config`.

- [ ] **Step 1: Implement Live Audit Dashboard**
Create `apps/web/app/audit/page.tsx` displaying live stream of agent events, active threat alerts banner, and an event inspection modal.

- [ ] **Step 2: Implement Webhook Settings Page**
Create `apps/web/app/settings/webhooks/page.tsx` with webhook URL input, HMAC signing secret display, minimum severity selector, and a "Send Test Webhook" trigger.

- [ ] **Step 3: Run Full Monorepo Verification**
- `pnpm --filter @wren/core test`
- `pnpm --filter wren-security test`
- `pnpm --filter web run build`
- `pnpm typecheck` across all 5 workspace packages.

- [ ] **Step 4: Commit**
```bash
git add apps/web/app/audit/ apps/web/app/settings/webhooks/ apps/web/
git commit -m "feat(web): add live runtime agent audit dashboard and webhook configuration UI"
```
