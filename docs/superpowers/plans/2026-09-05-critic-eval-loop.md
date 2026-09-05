# Critic/Eval Loop & Agent Tracing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement an independent second-pass Critic/Judge eval loop and observability trace collector directly into the agent pipeline, scoring every finding against a strict rubric, logging all reasoning steps to `agent_traces`, and inspecting traces in the web dashboard.

**Architecture:** A dedicated `CriticJudge` model evaluates every candidate verdict from `verifyInvestigation` against a 3-dimensional rubric (Evidence Quality, False-Positive Risk, Confidence) and automatically overrules low-quality verdicts (< 0.70 quality or > 0.50 risk). A unified `AgentTracer` instruments all pipeline stages (`planner`, `investigator`, `verifier`, `critic`, `reporter`), persisting to PostgreSQL / Supabase `agent_traces` and local `.wren/traces/<scan-id>.json`. The web dashboard exposes an expandable "Trace & Eval Rubric" drawer.

**Tech Stack:** TypeScript, Anthropic Claude 3.5 Sonnet / Haiku, PostgreSQL / Supabase Realtime, Next.js 15 App Router, React 19, TailwindCSS, Node.js Test Runner.

## Global Constraints
- Every step must maintain strict TDD: write failing test, verify failure, implement code, verify pass, commit.
- Strict Zero-Leakage: Traces must never store raw unredacted secret values (OpenAI keys, Supabase service keys, JWT tokens); snippets must be sanitized.
- Overrule Thresholds: `evidenceQuality < 0.70` or `falsePositiveRisk > 0.50` must strictly override verdicts to `FALSE_POSITIVE` or `INCONCLUSIVE`.
- All Next.js 15 App Router routes must await `params`: `const { id } = await context.params`.
- Zero typecheck or build errors across all 5 workspace packages.

---

### Task 1: Shared Tracing & Critic Types & Database Schema

**Files:**
- Create: `apps/web/lib/trace-schema.sql`
- Modify: `packages/shared-types/src/index.ts`
- Create: `packages/core/tests/agent/trace-types.test.ts`

**Interfaces:**
- Produces: `CriticRubric`, `CriticEvaluationResult`, `AgentTraceRecord`, `AgentTraceStep`

- [ ] **Step 1: Write failing test for tracing and critic types**

```typescript
// packages/core/tests/agent/trace-types.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import type {
  CriticRubric,
  CriticEvaluationResult,
  AgentTraceRecord,
  AgentTraceStep,
} from "@wren/shared-types";

test("CriticRubric defines valid evidence quality, risk, and confidence metrics", () => {
  const rubric: CriticRubric = {
    evidenceQuality: 0.85,
    falsePositiveRisk: 0.15,
    confidenceScore: 0.9,
    critique: "Evidence confirms direct user input into query without parametrization.",
  };

  assert.ok(rubric.evidenceQuality >= 0 && rubric.evidenceQuality <= 1);
  assert.ok(rubric.falsePositiveRisk >= 0 && rubric.falsePositiveRisk <= 1);
  assert.ok(rubric.confidenceScore >= 0 && rubric.confidenceScore <= 1);
});

test("AgentTraceRecord accurately represents pipeline step and execution metrics", () => {
  const record: AgentTraceRecord = {
    id: "trace-123",
    scanId: "scan-abc",
    findingId: "finding-42",
    step: "critic",
    input: { verdict: "CONFIRMED_VULNERABILITY" },
    output: { isOverruled: false },
    reasoning: "Critic validated all call site proofs.",
    confidenceScore: 0.92,
    rubric: {
      evidenceQuality: 0.88,
      falsePositiveRisk: 0.12,
      confidenceScore: 0.92,
      critique: "Solid evidence.",
    },
    durationMs: 420,
    timestamp: new Date().toISOString(),
  };

  assert.equal(record.step, "critic");
  assert.equal(record.durationMs, 420);
  assert.ok(record.rubric);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @wren/core test tests/agent/trace-types.test.ts`
Expected: FAIL due to missing type exports.

- [ ] **Step 3: Update `packages/shared-types/src/index.ts` and create `apps/web/lib/trace-schema.sql`**

Add types in `packages/shared-types/src/index.ts`:
```typescript
export type AgentTraceStep =
  | "planner"
  | "investigator"
  | "verifier"
  | "critic"
  | "reporter";

export interface CriticRubric {
  evidenceQuality: number;
  falsePositiveRisk: number;
  confidenceScore: number;
  critique: string;
}

export interface CriticEvaluationResult {
  rubric: CriticRubric;
  isOverruled: boolean;
  originalVerdict: string;
  finalVerdict: string;
  adjustedRationale: string;
}

export interface AgentTraceRecord {
  id: string;
  scanId: string;
  findingId?: string;
  step: AgentTraceStep;
  input: Record<string, unknown> | string;
  output: Record<string, unknown> | string;
  reasoning: string;
  confidenceScore?: number;
  rubric?: CriticRubric;
  durationMs: number;
  timestamp: string;
}
```

Create `apps/web/lib/trace-schema.sql`:
```sql
CREATE TABLE IF NOT EXISTS agent_traces (
  id TEXT PRIMARY KEY,
  scan_id TEXT NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  finding_id TEXT NULL,
  step TEXT NOT NULL,
  input JSONB NOT NULL,
  output JSONB NOT NULL,
  reasoning TEXT,
  confidence_score NUMERIC(4, 3),
  rubric JSONB NULL,
  duration_ms INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_traces_scan ON agent_traces(scan_id);
CREATE INDEX IF NOT EXISTS idx_agent_traces_finding ON agent_traces(finding_id);
CREATE INDEX IF NOT EXISTS idx_agent_traces_step ON agent_traces(step);

ALTER PUBLICATION supabase_realtime ADD TABLE agent_traces;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @wren/core test tests/agent/trace-types.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/shared-types apps/web/lib/trace-schema.sql packages/core/tests/agent/trace-types.test.ts
git commit -m "feat(types): add critic rubric, agent trace types, and database schema"
```

---

### Task 2: Critic Judge Engine with Adversarial Scoring & Overrule Policy

**Files:**
- Create: `packages/core/src/agent/critic.ts`
- Modify: `packages/core/src/index.ts`
- Create: `packages/core/tests/agent/critic.test.ts`

**Interfaces:**
- Consumes: `Finding`, `VerificationResult`, `AgentScanConfig`, `CriticRubric`, `CriticEvaluationResult`
- Produces: `evaluateVerdictWithCritic`

- [ ] **Step 1: Write failing test for Critic Judge**

```typescript
// packages/core/tests/agent/critic.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import type { Finding } from "@wren/shared-types";
import type { VerificationResult, AgentScanConfig } from "../../src/agent/types";
import { evaluateVerdictWithCritic } from "../../src/agent/critic";

const sampleFinding: Finding = {
  id: "finding-sqli-1",
  ruleId: "sql-injection",
  category: "database",
  severity: "high",
  title: "Potential SQL Injection",
  message: "Raw query concatenated with variable",
  plainEnglishExplanation: "Concatenating user input into SQL allows data theft.",
  location: {
    filePath: "src/db/user.ts",
    startLine: 12,
    endLine: 14,
    snippet: 'db.query("SELECT * FROM users WHERE id = " + userId);',
  },
  fix: {
    description: "Use parameterized query",
    replacementCode: 'db.query("SELECT * FROM users WHERE id = $1", [userId]);',
  },
};

test("Critic Judge confirms verdict when evidence quality is high and risk is low", async () => {
  const verified: VerificationResult = {
    findingId: "finding-sqli-1",
    verdict: "CONFIRMED_VULNERABILITY",
    rationale: "Call site in router passes req.query.id directly to query.",
    confidence: 0.95,
  };

  const result = await evaluateVerdictWithCritic(sampleFinding, verified, {});
  assert.equal(result.isOverruled, false);
  assert.equal(result.finalVerdict, "CONFIRMED_VULNERABILITY");
  assert.ok(result.rubric.evidenceQuality >= 0.7);
  assert.ok(result.rubric.falsePositiveRisk <= 0.5);
});

test("Critic Judge overrules verdict to FALSE_POSITIVE when evidence is weak or framework mitigates", async () => {
  const weakVerification: VerificationResult = {
    findingId: "finding-sqli-1",
    verdict: "CONFIRMED_VULNERABILITY",
    rationale: "Assumed userId is untrusted, did not locate router or controller.",
    confidence: 0.5,
  };

  const result = await evaluateVerdictWithCritic(sampleFinding, weakVerification, {}, {
    mockRubric: {
      evidenceQuality: 0.4,
      falsePositiveRisk: 0.75,
      confidenceScore: 0.45,
      critique: "No evidence that userId originates from HTTP request. Likely internal ID.",
    },
  });

  assert.equal(result.isOverruled, true);
  assert.equal(result.finalVerdict, "FALSE_POSITIVE");
  assert.match(result.adjustedRationale, /\[Critic Overrule\]/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @wren/core test tests/agent/critic.test.ts`
Expected: FAIL due to missing `evaluateVerdictWithCritic`.

- [ ] **Step 3: Implement `packages/core/src/agent/critic.ts`**

Implement `evaluateVerdictWithCritic`:
- Construct system prompt establishing an adversarial Senior Security Judge.
- Rubric evaluates Evidence Quality, False-Positive Risk, and Confidence.
- Fallback/mock client handling.
- Overrule condition: `if (rubric.evidenceQuality < 0.70 || rubric.falsePositiveRisk > 0.50)`.
- Re-export in `packages/core/src/index.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @wren/core test tests/agent/critic.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/agent/critic.ts packages/core/src/index.ts packages/core/tests/agent/critic.test.ts
git commit -m "feat(core): implement critic judge engine with adversarial rubric and overrule guard"
```

---

### Task 3: In-Memory & Local Disk Agent Tracer

**Files:**
- Create: `packages/core/src/agent/tracer.ts`
- Modify: `packages/core/src/index.ts`
- Create: `packages/core/tests/agent/tracer.test.ts`

**Interfaces:**
- Produces: `AgentTracer`, `AgentSpan`

- [ ] **Step 1: Write failing test for AgentTracer**

```typescript
// packages/core/tests/agent/tracer.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { AgentTracer } from "../../src/agent/tracer";

test("AgentTracer records spans with input, output, reasoning, duration, and rubric", () => {
  const tracer = new AgentTracer("scan-test-1");

  const span = tracer.startSpan("verifier", "finding-1", { hypothesis: "auth missing" });
  tracer.finishSpan(span, { verdict: "CONFIRMED_VULNERABILITY" }, "Verified no middleware", 0.92);

  const traces = tracer.getTraces();
  assert.equal(traces.length, 1);
  assert.equal(traces[0].step, "verifier");
  assert.equal(traces[0].findingId, "finding-1");
  assert.equal(traces[0].confidenceScore, 0.92);
  assert.ok(traces[0].durationMs >= 0);
});

test("AgentTracer flushes traces to local disk file", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-trace-test-"));
  const tracer = new AgentTracer("scan-disk-1");

  const span = tracer.startSpan("planner", undefined, { findingsCount: 3 });
  tracer.finishSpan(span, { queueSize: 1 }, "Triaged 1 finding");

  const tracePath = tracer.flushToDisk(tmpDir);
  assert.ok(fs.existsSync(tracePath));

  const saved = JSON.parse(fs.readFileSync(tracePath, "utf-8"));
  assert.equal(saved.scanId, "scan-disk-1");
  assert.equal(saved.traces.length, 1);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @wren/core test tests/agent/tracer.test.ts`
Expected: FAIL due to missing `AgentTracer`.

- [ ] **Step 3: Implement `packages/core/src/agent/tracer.ts`**

Implement `AgentTracer`:
- `startSpan(step, findingId, input)`: returns span token with start timestamp.
- `finishSpan(span, output, reasoning, confidenceScore, rubric)`: calculates duration and appends `AgentTraceRecord`.
- `flushToDisk(targetPath)`: writes to `${targetPath}/.wren/traces/${scanId}.json`.
- Export in `packages/core/src/index.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @wren/core test tests/agent/tracer.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/agent/tracer.ts packages/core/src/index.ts packages/core/tests/agent/tracer.test.ts
git commit -m "feat(core): implement agent tracer with span metrics and local disk persistence"
```

---

### Task 4: Agent Loop Integration with Critic Pass & End-to-End Tracing

**Files:**
- Modify: `packages/core/src/agent/loop.ts`
- Modify: `packages/core/src/agent/types.ts`
- Create: `packages/core/tests/agent/critic-loop-integration.test.ts`

**Interfaces:**
- Produces: `runAgentLoop` returns `{ findings, traces, llmApplied }`

- [ ] **Step 1: Write failing test for Critic Loop integration**

```typescript
// packages/core/tests/agent/critic-loop-integration.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import type { Finding } from "@wren/shared-types";
import { runAgentLoop } from "../../src/agent/loop";

const mockContextualFinding: Finding = {
  id: "finding-middleware-1",
  ruleId: "unprotected-route",
  category: "auth",
  severity: "high",
  title: "Unprotected API Endpoint",
  message: "Endpoint does not verify JWT token in handler",
  plainEnglishExplanation: "Requires authentication check.",
  location: {
    filePath: "app/api/data/route.ts",
    startLine: 1,
    endLine: 5,
    snippet: "export async function GET() { return Response.json({ data: 123 }); }",
  },
  fix: { description: "Add auth check", replacementCode: "" },
};

test("runAgentLoop instruments pipeline stages with AgentTracer and executes Critic pass", async () => {
  const result = await runAgentLoop(
    [mockContextualFinding],
    {
      apiKey: "mock-key",
      targetPath: ".",
    }
  );

  assert.ok(result.traces);
  assert.ok(result.traces.length > 0);
  assert.ok(result.traces.some((t) => t.step === "planner"));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @wren/core test tests/agent/critic-loop-integration.test.ts`
Expected: FAIL due to missing `traces` in `runAgentLoop` return.

- [ ] **Step 3: Update `packages/core/src/agent/loop.ts` and `types.ts`**

In `loop.ts`:
- Initialize `const tracer = new AgentTracer(config.scanId || `scan-${Date.now()}`);`
- Trace Planner span.
- Trace Investigator tool calling turns.
- Trace Verifier hypothesis outcome.
- Execute Critic evaluation via `evaluateVerdictWithCritic`.
- If `criticResult.isOverruled`, update verdict and annotate rationale.
- Trace Critic step with rubric.
- Trace Reporter synthesis step.
- Return `{ findings: finalizedFindings, traces: tracer.getTraces(), llmApplied: true }`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @wren/core test tests/agent/critic-loop-integration.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/agent/loop.ts packages/core/src/agent/types.ts packages/core/tests/agent/critic-loop-integration.test.ts
git commit -m "feat(core): integrate critic judge pass and end-to-end tracing into agent loop"
```

---

### Task 5: Trace Dispatcher & API Routes

**Files:**
- Create: `apps/web/lib/trace-dispatcher.ts`
- Create: `apps/web/app/api/scans/[id]/traces/route.ts`
- Create: `packages/core/tests/agent/api-traces.test.ts`

**Interfaces:**
- Produces: `recordAgentTraceBatch`, `getAgentTracesByScanId`, `GET /api/scans/[id]/traces`

- [ ] **Step 1: Write failing test for trace dispatcher and API**

```typescript
// packages/core/tests/agent/api-traces.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import type { AgentTraceRecord } from "@wren/shared-types";
import {
  recordAgentTraceBatch,
  getAgentTracesByScanId,
} from "../../../apps/web/lib/trace-dispatcher";
import { GET } from "../../../apps/web/app/api/scans/[id]/traces/route";

test("recordAgentTraceBatch persists and retrieves traces in memory/store", async () => {
  const mockTrace: AgentTraceRecord = {
    id: "trace-abc-1",
    scanId: "scan-mock-42",
    findingId: "finding-1",
    step: "critic",
    input: { test: true },
    output: { approved: true },
    reasoning: "Critic verified evidence",
    confidenceScore: 0.95,
    durationMs: 350,
    timestamp: new Date().toISOString(),
  };

  await recordAgentTraceBatch([mockTrace]);
  const retrieved = await getAgentTracesByScanId("scan-mock-42");

  assert.equal(retrieved.length, 1);
  assert.equal(retrieved[0].id, "trace-abc-1");
  assert.equal(retrieved[0].step, "critic");
});

test("GET /api/scans/[id]/traces returns trace array", async () => {
  const req = new Request("http://localhost:3000/api/scans/scan-mock-42/traces");
  const res = await GET(req, { params: Promise.resolve({ id: "scan-mock-42" }) });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.traces);
  assert.equal(data.traces.length, 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @wren/core test tests/agent/api-traces.test.ts`
Expected: FAIL due to missing dispatcher and route handler.

- [ ] **Step 3: Implement `apps/web/lib/trace-dispatcher.ts` and `apps/web/app/api/scans/[id]/traces/route.ts`**

Implement:
- `recordAgentTraceBatch(traces: AgentTraceRecord[])`: inserts into `agent_traces` table with memory store fallback.
- `getAgentTracesByScanId(scanId: string, findingId?: string)`: queries `agent_traces`.
- Route handler in `apps/web/app/api/scans/[id]/traces/route.ts` using Next.js 15 awaited params.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @wren/core test tests/agent/api-traces.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/trace-dispatcher.ts apps/web/app/api/scans/[id]/traces packages/core/tests/agent/api-traces.test.ts
git commit -m "feat(web): add agent trace dispatcher and API route"
```

---

### Task 6: Web UI Trace & Eval Rubric Drawer & Full Monorepo Verification

**Files:**
- Create: `apps/web/components/traces/trace-drawer.tsx`
- Modify: `apps/web/app/scans/[id]/page.tsx`

- [ ] **Step 1: Create `apps/web/components/traces/trace-drawer.tsx`**

Implement `TraceDrawer`:
- Displays step-by-step trace timeline (`planner`, `investigator`, `verifier`, `critic`, `reporter`).
- Highlights the Critic Rubric:
  - **Evidence Quality** gauge
  - **False-Positive Risk** gauge
  - **Judge Confidence** gauge
  - Critic rationale / critique text
- Collapsible prompt inputs and raw reasoning traces for deep debugging.

- [ ] **Step 2: Integrate `TraceDrawer` into `apps/web/app/scans/[id]/page.tsx`**

Add "View Agent Trace" button to finding cards, loading traces from `/api/scans/[id]/traces?findingId=...`.

- [ ] **Step 3: Run full monorepo verification**

Run:
1. `pnpm --filter @wren/core test`
2. `pnpm --filter wren-security test`
3. `pnpm --filter web run build`
4. `pnpm typecheck`

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/traces apps/web/app/scans/[id]/page.tsx
git commit -m "feat(web): add trace & eval rubric drawer to live scan dashboard"
```
