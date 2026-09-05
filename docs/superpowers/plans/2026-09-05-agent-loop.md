# Implementation Plan - Backend Real Agent Loop

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Wren's LLM reasoning from a single-shot snippet evaluation into an autonomous 4-stage agent loop (Planner → Investigator → Verifier → Reporter) powered by Anthropic's native tool-use API (`read_file`, `search_codebase`, `get_call_sites`).

**Architecture:** A modular agent engine in `packages/core/src/agent/` that plugs directly into `@wren/core`'s scan pipeline. The investigator runs a native Anthropic tool loop against the repository, followed by a verifier step that weeds out false positives mitigated by middleware or outer guards.

**Tech Stack:**
- Node.js 24 (`node:test`, `node:assert/strict`)
- TypeScript 5.7+
- `@anthropic-ai/sdk`
- `@wren/core`, `@wren/shared-types`

## Global Constraints
- Target package: `packages/core`
- Zero heavy orchestration frameworks (no LangGraph, no CrewAI)
- Strict sandboxing: reject any file path outside `targetPath`
- Circuit breaker: missing API key or network failure must gracefully fall back to static findings with zero crash
- All tests must run cleanly via `node --experimental-strip-types --test`
- Monorepo `pnpm typecheck` must stay 100% clean across all 5 workspace packages

---

### Task 1: Package Dependencies & Core Agent Types

**Files:**
- Modify: `packages/core/package.json`
- Create: `packages/core/src/agent/types.ts`
- Test: `packages/core/tests/agent/types.test.ts`

**Interfaces:**
- Consumes: `@wren/shared-types` (`Finding`, `ScanConfig`, `Severity`)
- Produces: `AgentScanConfig`, `CodebaseTool`, `ToolCallRequest`, `ToolCallResult`, `InvestigationResult`, `VerificationResult`, `AgentProgressEvent`

- [ ] **Step 1: Install `@anthropic-ai/sdk` in `packages/core`**

Run:
```bash
pnpm --filter @wren/core add @anthropic-ai/sdk
```

- [ ] **Step 2: Write failing test for Agent types & defaults**

Create `packages/core/tests/agent/types.test.ts`:
```typescript
import test from "node:test";
import assert from "node:assert/strict";
import type { AgentScanConfig, ToolCallRequest, VerificationResult } from "../../src/agent/types";
import { DEFAULT_AGENT_CONFIG } from "../../src/agent/types";

test("DEFAULT_AGENT_CONFIG provides expected production defaults", () => {
  assert.equal(DEFAULT_AGENT_CONFIG.model, "claude-3-5-sonnet-latest");
  assert.equal(DEFAULT_AGENT_CONFIG.maxToolTurns, 4);
  assert.equal(DEFAULT_AGENT_CONFIG.timeoutMs, 25000);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --experimental-strip-types --test packages/core/tests/agent/types.test.ts`
Expected: FAIL (Cannot find module `../../src/agent/types`)

- [ ] **Step 4: Implement `packages/core/src/agent/types.ts`**

Create `packages/core/src/agent/types.ts`:
```typescript
import type { Finding, Severity, SuggestedFix } from "@wren/shared-types";

export interface AgentProgressEvent {
  stage: "planner" | "investigator" | "verifier" | "reporter";
  findingId?: string;
  message: string;
}

export interface AgentScanConfig {
  targetPath: string;
  apiKey?: string;
  apiUrl?: string;
  model?: string;
  maxToolTurns?: number;
  timeoutMs?: number;
  onProgress?: (event: AgentProgressEvent) => void;
}

export const DEFAULT_AGENT_CONFIG: Required<Omit<AgentScanConfig, "apiKey" | "apiUrl" | "onProgress">> = {
  targetPath: ".",
  model: "claude-3-5-sonnet-latest",
  maxToolTurns: 4,
  timeoutMs: 25000,
};

export interface ToolCallRequest {
  toolName: string;
  args: Record<string, unknown>;
}

export interface ToolCallResult {
  toolName: string;
  success: boolean;
  content: string;
  error?: string;
}

export interface CodebaseToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface CodebaseTools {
  definitions: CodebaseToolDefinition[];
  execute(request: ToolCallRequest): Promise<ToolCallResult>;
}

export interface PlannerResult {
  investigationQueue: Finding[];
  directFindings: Finding[];
}

export interface InvestigationStep {
  turn: number;
  thought?: string;
  toolCall?: ToolCallRequest;
  toolResult?: ToolCallResult;
}

export interface InvestigationResult {
  findingId: string;
  steps: InvestigationStep[];
  gatheredContext: string[];
  completed: boolean;
  error?: string;
}

export type VerdictStatus = "CONFIRMED" | "FALSE_POSITIVE" | "SEVERITY_ADJUSTED";

export interface VerificationResult {
  findingId: string;
  verdict: VerdictStatus;
  rationale: string;
  confidence: number;
  adjustedSeverity?: Severity;
  suggestedFix?: SuggestedFix;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --experimental-strip-types --test packages/core/tests/agent/types.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/core/package.json packages/core/src/agent/types.ts packages/core/tests/agent/types.test.ts pnpm-lock.yaml
git commit -m "feat(core): add agent loop types and default configuration"
```

---

### Task 2: Sandboxed Codebase Tools Implementation

**Files:**
- Create: `packages/core/src/agent/tools.ts`
- Test: `packages/core/tests/agent/tools.test.ts`

**Interfaces:**
- Consumes: `CodebaseTools`, `ToolCallRequest`, `ToolCallResult` from `types.ts`
- Produces: `createCodebaseTools(targetPath: string): CodebaseTools`

- [ ] **Step 1: Write failing tests for codebase tools**

Create `packages/core/tests/agent/tools.test.ts`:
```typescript
import test from "node:test";
import assert from "node:assert/strict";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { createCodebaseTools } from "../../src/agent/tools";

test("CodebaseTools rejects path traversal outside targetPath", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-test-"));
  const tools = createCodebaseTools(tempDir);

  const result = await tools.execute({
    toolName: "read_file",
    args: { filePath: "../../../package.json" },
  });

  assert.equal(result.success, false);
  assert.match(result.error || "", /Access denied: path traverses outside workspace/);
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("CodebaseTools read_file reads slice of file with line numbers", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-test-"));
  const sampleFile = path.join(tempDir, "sample.ts");
  fs.writeFileSync(sampleFile, "line 1\nline 2\nline 3\nline 4\nline 5\n");

  const tools = createCodebaseTools(tempDir);
  const result = await tools.execute({
    toolName: "read_file",
    args: { filePath: "sample.ts", startLine: 2, endLine: 4 },
  });

  assert.equal(result.success, true);
  assert.match(result.content, /2: line 2/);
  assert.match(result.content, /4: line 4/);
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("CodebaseTools search_codebase finds matching occurrences", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-test-"));
  fs.writeFileSync(path.join(tempDir, "auth.ts"), "export function verifySession() {}\n");
  fs.writeFileSync(path.join(tempDir, "ignored.txt"), "hello world\n");

  const tools = createCodebaseTools(tempDir);
  const result = await tools.execute({
    toolName: "search_codebase",
    args: { query: "verifySession" },
  });

  assert.equal(result.success, true);
  assert.match(result.content, /auth\.ts:1: export function verifySession\(\)/);
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("CodebaseTools get_call_sites identifies import and call locations", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-test-"));
  fs.writeFileSync(path.join(tempDir, "middleware.ts"), "import { verifyToken } from './auth';\nverifyToken(req);\n");

  const tools = createCodebaseTools(tempDir);
  const result = await tools.execute({
    toolName: "get_call_sites",
    args: { identifier: "verifyToken" },
  });

  assert.equal(result.success, true);
  assert.match(result.content, /middleware\.ts:1/);
  assert.match(result.content, /middleware\.ts:2/);
  fs.rmSync(tempDir, { recursive: true, force: true });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test packages/core/tests/agent/tools.test.ts`
Expected: FAIL (Cannot find module `../../src/agent/tools`)

- [ ] **Step 3: Implement `packages/core/src/agent/tools.ts`**

Create `packages/core/src/agent/tools.ts` with sandboxed `read_file`, `search_codebase`, and `get_call_sites`, enforcing `path.resolve` containment, ignore rules, and line limit protection.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test packages/core/tests/agent/tools.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/agent/tools.ts packages/core/tests/agent/tools.test.ts
git commit -m "feat(core): implement sandboxed codebase tools for agent investigation"
```

---

### Task 3: Planner Phase (Finding Triage & Context Scheduling)

**Files:**
- Create: `packages/core/src/agent/planner.ts`
- Test: `packages/core/tests/agent/planner.test.ts`

**Interfaces:**
- Consumes: `Finding[]`
- Produces: `planInvestigation(findings: Finding[]): PlannerResult`

- [ ] **Step 1: Write failing test for planner triage**

Create `packages/core/tests/agent/planner.test.ts`:
```typescript
import test from "node:test";
import assert from "node:assert/strict";
import type { Finding } from "@wren/shared-types";
import { planInvestigation } from "../../src/agent/planner";

test("planInvestigation routes contextual findings to investigation queue and hardcoded secrets directly", () => {
  const findings: Finding[] = [
    {
      id: "f-1",
      ruleId: "AUTH_MISSING_GUARD",
      category: "auth",
      severity: "high",
      title: "Missing Auth Guard",
      message: "API route does not verify session",
      plainEnglishExplanation: "Needs check",
      location: { filePath: "app/api/users/route.ts", startLine: 1, endLine: 10 },
      fix: { description: "Add auth", replacementCode: "" },
    },
    {
      id: "f-2",
      ruleId: "SECRET_HARDCODED_KEY",
      category: "secret",
      severity: "critical",
      title: "Hardcoded API Key",
      message: "Stripe key exposed",
      plainEnglishExplanation: "Secret in source",
      location: { filePath: "lib/stripe.ts", startLine: 4, endLine: 4 },
      fix: { description: "Use env", replacementCode: "" },
    },
  ];

  const plan = planInvestigation(findings);
  assert.equal(plan.investigationQueue.length, 1);
  assert.equal(plan.investigationQueue[0].id, "f-1");
  assert.equal(plan.directFindings.length, 1);
  assert.equal(plan.directFindings[0].id, "f-2");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test packages/core/tests/agent/planner.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `packages/core/src/agent/planner.ts`**

Implement triage based on categories (`auth`, `database`, `configuration` vs `secret`) and rule IDs needing cross-file context.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test packages/core/tests/agent/planner.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/agent/planner.ts packages/core/tests/agent/planner.test.ts
git commit -m "feat(core): implement planner phase for finding triage"
```

---

### Task 4: Investigator Phase (Native Anthropic Tool-Use Loop)

**Files:**
- Create: `packages/core/src/agent/investigator.ts`
- Test: `packages/core/tests/agent/investigator.test.ts`

**Interfaces:**
- Consumes: `Finding`, `CodebaseTools`, `AgentScanConfig`
- Produces: `investigateFinding(finding: Finding, tools: CodebaseTools, config: AgentScanConfig, anthropicClient?: any): Promise<InvestigationResult>`

- [ ] **Step 1: Write failing test for investigator tool loop with mock Anthropic client**

Create `packages/core/tests/agent/investigator.test.ts`:
```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { investigateFinding } from "../../src/agent/investigator";
import { createCodebaseTools } from "../../src/agent/tools";
import type { Finding } from "@wren/shared-types";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

test("investigator runs multi-turn tool calling and accumulates context", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-agent-"));
  fs.writeFileSync(path.join(tempDir, "middleware.ts"), "export function middleware() { return checkAuth(); }\n");

  const tools = createCodebaseTools(tempDir);
  const finding: Finding = {
    id: "f-test",
    ruleId: "AUTH_UNPROTECTED_ROUTE",
    category: "auth",
    severity: "high",
    title: "Route missing auth",
    message: "No auth in route handler",
    plainEnglishExplanation: "Check if middleware protects it",
    location: { filePath: "app/api/data/route.ts", startLine: 1, endLine: 5 },
    fix: { description: "Add auth", replacementCode: "" },
  };

  // Mock Anthropic client simulating 1 tool call then finish
  let callCount = 0;
  const mockClient = {
    messages: {
      create: async (params: any) => {
        callCount++;
        if (callCount === 1) {
          return {
            role: "assistant",
            stop_reason: "tool_use",
            content: [
              { type: "text", text: "Checking if middleware.ts handles auth" },
              {
                type: "tool_use",
                id: "tool_1",
                name: "read_file",
                input: { filePath: "middleware.ts" },
              },
            ],
          };
        }
        return {
          role: "assistant",
          stop_reason: "end_turn",
          content: [
            { type: "text", text: "Found middleware protecting the route with checkAuth()." },
          ],
        };
      },
    },
  };

  const result = await investigateFinding(finding, tools, { targetPath: tempDir }, mockClient);
  assert.equal(result.completed, true);
  assert.equal(result.steps.length, 2);
  assert.equal(result.steps[0].toolCall?.toolName, "read_file");
  assert.match(result.gatheredContext.join("\n"), /checkAuth/);

  fs.rmSync(tempDir, { recursive: true, force: true });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test packages/core/tests/agent/investigator.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `packages/core/src/agent/investigator.ts`**

Implement Anthropic client initialization, tool definition conversion, message loop (handling `tool_use` -> execute tool -> `tool_result`), iteration caps (max 4 turns), timeout abort, and error safety.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test packages/core/tests/agent/investigator.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/agent/investigator.ts packages/core/tests/agent/investigator.test.ts
git commit -m "feat(core): implement investigator tool loop using Anthropic Messages API"
```

---

### Task 5: Verifier & Reporter Phases

**Files:**
- Create: `packages/core/src/agent/verifier.ts`
- Create: `packages/core/src/agent/reporter.ts`
- Test: `packages/core/tests/agent/verifier-reporter.test.ts`

**Interfaces:**
- Consumes: `InvestigationResult`, original `Finding[]`
- Produces: `verifyInvestigation(...)`, `synthesizeFindings(...)`

- [ ] **Step 1: Write failing test for verifier and reporter**

Create `packages/core/tests/agent/verifier-reporter.test.ts`:
```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { verifyInvestigation } from "../../src/agent/verifier";
import { synthesizeFindings } from "../../src/agent/reporter";
import type { Finding } from "@wren/shared-types";
import type { InvestigationResult, VerificationResult } from "../../src/agent/types";

test("verifier classifies finding as FALSE_POSITIVE when middleware mitigates it", async () => {
  const finding: Finding = {
    id: "f-1",
    ruleId: "AUTH_UNPROTECTED_ROUTE",
    category: "auth",
    severity: "high",
    title: "Unprotected Route",
    message: "No inline auth",
    plainEnglishExplanation: "Route handler",
    location: { filePath: "app/api/users/route.ts", startLine: 1, endLine: 5 },
    fix: { description: "Add auth", replacementCode: "" },
  };

  const investigation: InvestigationResult = {
    findingId: "f-1",
    completed: true,
    steps: [],
    gatheredContext: ["middleware.ts exports middleware that enforces session on /api/*"],
  };

  const mockClient = {
    messages: {
      create: async () => ({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              verdict: "FALSE_POSITIVE",
              rationale: "Global middleware.ts protects all /api/* routes, so missing inline auth is not vulnerable.",
              confidence: 0.95,
            }),
          },
        ],
      }),
    },
  };

  const verification = await verifyInvestigation(finding, investigation, { targetPath: "." }, mockClient);
  assert.equal(verification.verdict, "FALSE_POSITIVE");
  assert.match(verification.rationale, /middleware\.ts/);
});

test("reporter filters out false positives and enriches confirmed findings", () => {
  const findings: Finding[] = [
    {
      id: "f-1",
      ruleId: "AUTH_UNPROTECTED_ROUTE",
      category: "auth",
      severity: "high",
      title: "Unprotected Route",
      message: "No inline auth",
      plainEnglishExplanation: "Route handler",
      location: { filePath: "app/api/users/route.ts", startLine: 1, endLine: 5 },
      fix: { description: "Add auth", replacementCode: "" },
    },
    {
      id: "f-2",
      ruleId: "AUTH_PUBLIC_ADMIN",
      category: "auth",
      severity: "critical",
      title: "Public Admin API",
      message: "Admin action has no auth",
      plainEnglishExplanation: "Admin route",
      location: { filePath: "app/api/admin/route.ts", startLine: 1, endLine: 5 },
      fix: { description: "Add admin check", replacementCode: "" },
    },
  ];

  const verifications = new Map<string, VerificationResult>([
    ["f-1", { findingId: "f-1", verdict: "FALSE_POSITIVE", rationale: "Protected by middleware", confidence: 0.95 }],
    ["f-2", { findingId: "f-2", verdict: "CONFIRMED", rationale: "Excluded from middleware matcher, completely open", confidence: 0.98 }],
  ]);

  const synthesized = synthesizeFindings(findings, verifications);
  assert.equal(synthesized.length, 1);
  assert.equal(synthesized[0].id, "f-2");
  assert.match(synthesized[0].plainEnglishExplanation, /\[Verified by Wren Agent/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test packages/core/tests/agent/verifier-reporter.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `packages/core/src/agent/verifier.ts` and `packages/core/src/agent/reporter.ts`**

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test packages/core/tests/agent/verifier-reporter.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/agent/verifier.ts packages/core/src/agent/reporter.ts packages/core/tests/agent/verifier-reporter.test.ts
git commit -m "feat(core): implement verifier and reporter stages for false positive elimination"
```

---

### Task 6: Orchestrator Loop & Core Integration

**Files:**
- Create: `packages/core/src/agent/loop.ts`
- Modify: `packages/core/src/llm-reasoning.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/tests/agent/loop.test.ts`

**Interfaces:**
- Consumes: All agent modules (`planner`, `tools`, `investigator`, `verifier`, `reporter`)
- Produces: `runAgentLoop(findings: Finding[], config: AgentScanConfig): Promise<{ findings: Finding[]; llmApplied: boolean }>`

- [ ] **Step 1: Write test for orchestrator loop with circuit breaker**

Create `packages/core/tests/agent/loop.test.ts`:
```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { runAgentLoop } from "../../src/agent/loop";
import type { Finding } from "@wren/shared-types";

test("runAgentLoop activates circuit breaker when no API key is provided", async () => {
  const originalApiKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;

  const findings: Finding[] = [
    {
      id: "f-1",
      ruleId: "AUTH_CHECK",
      category: "auth",
      severity: "medium",
      title: "Test",
      message: "Test",
      plainEnglishExplanation: "Test",
      location: { filePath: "test.ts", startLine: 1, endLine: 2 },
      fix: { description: "fix", replacementCode: "" },
    },
  ];

  const result = await runAgentLoop(findings, { targetPath: "." });
  assert.equal(result.llmApplied, false);
  assert.equal(result.findings.length, 1);

  if (originalApiKey) process.env.ANTHROPIC_API_KEY = originalApiKey;
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test packages/core/tests/agent/loop.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `packages/core/src/agent/loop.ts` and update `llm-reasoning.ts`**

Implement `runAgentLoop` wiring Planner → Investigator → Verifier → Reporter. Connect `enrichFindingsWithLlm` to call `runAgentLoop`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test packages/core/tests/agent/loop.test.ts`
Expected: PASS

- [ ] **Step 5: Verify build & full typecheck across workspace**

Run:
```bash
pnpm --filter @wren/core run build
pnpm typecheck
```
Expected: All 5 packages build and typecheck with 0 errors.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/agent/loop.ts packages/core/src/llm-reasoning.ts packages/core/src/index.ts packages/core/tests/agent/loop.test.ts
git commit -m "feat(core): orchestrate agent loop and integrate with scan engine"
```

---

### Task 7: End-to-End Fixture Verification (Next.js Middleware False-Positive Test)

**Files:**
- Create: `packages/core/tests/fixtures/middleware-auth-test/...`
- Test: `packages/core/tests/agent/e2e-fixture.test.ts`

- [ ] **Step 1: Create fixture with Next.js middleware and route**

Fixture files:
- `tests/fixtures/middleware-auth-test/app/api/account/route.ts` (API route with no inline auth check)
- `tests/fixtures/middleware-auth-test/middleware.ts` (Next.js middleware with matcher protecting `/api/:path*`)

- [ ] **Step 2: Write end-to-end integration test**

Verify that `runScan({ targetPath: fixturePath, enableLlmReasoning: true, ... })` correctly:
1. Discovers the static auth finding in `route.ts`.
2. Emits tool calls to read `middleware.ts`.
3. Verifies that `middleware.ts` guards the route.
4. Drops or flags the false positive.

- [ ] **Step 3: Run all core tests**

Run: `node --experimental-strip-types --test packages/core/tests/agent/*.test.ts`
Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/core/tests/fixtures packages/core/tests/agent/e2e-fixture.test.ts
git commit -m "test(core): add end-to-end fixture test for agent loop cross-file verification"
```
