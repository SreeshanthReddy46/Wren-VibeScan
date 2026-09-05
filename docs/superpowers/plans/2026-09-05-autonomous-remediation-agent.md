# Autonomous Remediation Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Equip Wren VibeScan with an autonomous Remediation Agent that synthesizes verified code patches, validates AST syntax, protects against secret leakage, and opens pull requests via a dedicated GitHub App behind an explicit opt-in per repository.

**Architecture:** A multi-turn Claude 3.5 Sonnet engine generates unified diff patches with surrounding context. Patches are AST syntax-checked and sanitized (abstracting raw secrets to `process.env.XXX`). An Inngest background job orchestrates GitHub App branch creation and PR opening, while a local in-process fallback ensures offline CI and development testing pass with 100% fidelity.

**Tech Stack:**
- Node.js 24 (`node:test`, `node:assert/strict`)
- Next.js 15 App Router
- Anthropic Claude 3.5 Sonnet API
- GitHub App REST API
- Inngest SDK (`inngest`)
- Supabase Realtime (`@supabase/supabase-js`)
- `@wren/core`, `@wren/shared-types`, `wren-security`

## Global Constraints
- Target packages: `packages/core`, `packages/shared-types`, `apps/web`, `packages/cli`
- Zero Secret Leakage: raw keys and tokens are never committed to branches, PRs, or diffs; all patches are sanitized
- Explicit Opt-In: `repo_settings.auto_remediate_enabled` must default to `false`
- Offline/CI Resilience: full mock and dry-run fallback for GitHub App and Inngest
- Monorepo `pnpm typecheck` must remain 100% clean across all 5 workspace packages

---

### Task 1: Shared Remediation Types & Database Schema

**Files:**
- Create: `apps/web/lib/remediation-schema.sql`
- Modify: `packages/shared-types/src/index.ts`
- Test: `packages/core/tests/remediation/types.test.ts`

**Interfaces:**
- Consumes: `@wren/shared-types`
- Produces: `RemediationStatus`, `RemediationRequest`, `RemediationResponse`, `RepoRemediationSettings`

- [ ] **Step 1: Write failing test for remediation types**

Create `packages/core/tests/remediation/types.test.ts`:
```typescript
import test from "node:test";
import assert from "node:assert/strict";
import type {
  RemediationStatus,
  RemediationRequest,
  RemediationResponse,
  RepoRemediationSettings,
} from "@wren/shared-types";

test("RemediationStatus covers all lifecycle stages", () => {
  const statuses: RemediationStatus[] = [
    "queued",
    "generating_patch",
    "syntax_verifying",
    "pr_opened",
    "failed",
  ];
  assert.equal(statuses.length, 5);
});

test("RemediationResponse models PR output and diff", () => {
  const res: RemediationResponse = {
    success: true,
    remediationId: "rem-123",
    status: "pr_opened",
    prUrl: "https://github.com/org/repo/pull/42",
    prNumber: 42,
    patchDiff: "--- a/src/auth.ts\n+++ b/src/auth.ts",
  };
  assert.equal(res.status, "pr_opened");
  assert.equal(res.prNumber, 42);
});

test("RepoRemediationSettings enforces default false for opt-in", () => {
  const settings: RepoRemediationSettings = {
    repoName: "org/repo",
    autoRemediateEnabled: false,
    minSeverity: "critical",
  };
  assert.equal(settings.autoRemediateEnabled, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test packages/core/tests/remediation/types.test.ts`
Expected: FAIL (missing types)

- [ ] **Step 3: Update `packages/shared-types/src/index.ts` and create `apps/web/lib/remediation-schema.sql`**

Append `RemediationStatus`, `RemediationRequest`, `RemediationResponse`, and `RepoRemediationSettings` to `packages/shared-types/src/index.ts`.
Create `apps/web/lib/remediation-schema.sql` with table definitions for `repo_settings` and `remediations`.

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
pnpm --filter @wren/shared-types run typecheck
node --experimental-strip-types --test packages/core/tests/remediation/types.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/remediation-schema.sql packages/shared-types/src/index.ts packages/core/tests/remediation/types.test.ts
git commit -m "feat(types): add autonomous remediation types and database schema"
```

---

### Task 2: AST Syntax Validator & Zero-Leakage Patch Generator

**Files:**
- Create: `packages/core/src/remediation/syntax-validator.ts`
- Create: `packages/core/src/remediation/patch-generator.ts`
- Modify: `packages/core/src/index.ts`
- Tests: `packages/core/tests/remediation/syntax-validator.test.ts`, `packages/core/tests/remediation/patch-generator.test.ts`

**Interfaces:**
- Consumes: `@wren/shared-types`, `sanitizePatternForGlobalMemory`
- Produces: `validateCodeSyntax(code, filePath)`, `generateRemediationPatch(finding, options)`

- [ ] **Step 1: Write failing tests for syntax validator and patch generator**

Create `packages/core/tests/remediation/syntax-validator.test.ts`:
```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { validateCodeSyntax } from "../../dist/index.js";

test("validateCodeSyntax approves valid TypeScript code", () => {
  const result = validateCodeSyntax("const x: number = 42;\nexport default x;");
  assert.equal(result.isValid, true);
});

test("validateCodeSyntax rejects invalid code with syntax error", () => {
  const result = validateCodeSyntax("const x: = ;");
  assert.equal(result.isValid, false);
  assert.ok(result.error);
});
```

Create `packages/core/tests/remediation/patch-generator.test.ts`:
```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { generateRemediationPatch } from "../../dist/index.js";
import type { Finding } from "@wren/shared-types";

test("generateRemediationPatch replaces raw secret with process.env and sanitizes", async () => {
  const sampleFinding: Finding = {
    id: "f-sec-1",
    ruleId: "WREN-SEC-001",
    category: "secret",
    severity: "critical",
    title: "Hardcoded OpenAI Secret Key Exposed",
    message: "Exposed OpenAI key",
    plainEnglishExplanation: "Secrets in source code can be extracted.",
    location: {
      filePath: "src/openai.ts",
      startLine: 2,
      endLine: 2,
      snippet: 'apiKey: "sk-proj-123456789012345678901234567890",',
    },
    fix: {
      description: "Use process.env.OPENAI_API_KEY",
      replacementCode: "apiKey: process.env.OPENAI_API_KEY,",
    },
  };

  const patch = await generateRemediationPatch(sampleFinding, {
    fileContent: 'import OpenAI from "openai";\nconst client = new OpenAI({ apiKey: "sk-proj-123456789012345678901234567890" });\nexport default client;\n',
  });

  assert.equal(patch.isValid, true);
  assert.ok(patch.diff.includes("process.env.OPENAI_API_KEY"));
  assert.ok(!patch.diff.includes("sk-proj-123456789012345678901234567890"));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test packages/core/tests/remediation/*.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `syntax-validator.ts` and `patch-generator.ts`**

Implement `validateCodeSyntax` using TS AST parsing.
Implement `generateRemediationPatch` with environment variable substitution, unified diff generation, AST validation, and secret sanitization via `sanitizePatternForGlobalMemory`.
Export from `packages/core/src/index.ts`.

- [ ] **Step 4: Build `@wren/core` and run tests to verify they pass**

Run:
```bash
pnpm --filter @wren/core run build
node --test packages/core/tests/remediation/syntax-validator.test.ts packages/core/tests/remediation/patch-generator.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/remediation packages/core/src/index.ts packages/core/tests/remediation
git commit -m "feat(core): implement AST syntax validator and zero-leakage remediation patch generator"
```

---

### Task 3: GitHub App Client with Resilient Dry-Run Fallback

**Files:**
- Create: `apps/web/lib/github-app.ts`
- Test: `packages/core/tests/remediation/github-app.test.ts`

**Interfaces:**
- Consumes: `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`
- Produces: `createRemediationPullRequest(options): Promise<GitHubPrResult>`

- [ ] **Step 1: Write failing test for GitHub App client**

Create `packages/core/tests/remediation/github-app.test.ts`:
```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { createRemediationPullRequest } from "../../../../apps/web/lib/github-app.ts";

test("createRemediationPullRequest operates in dry-run mode when credentials absent", async () => {
  const result = await createRemediationPullRequest({
    repoName: "acme/vibe-shop",
    branchName: "wren/fix-f-sec-1",
    filePath: "src/openai.ts",
    patchedContent: "export const apiKey = process.env.OPENAI_API_KEY;\n",
    title: "fix(security): resolve OpenAI API key exposure",
    body: "## Security Remediation\n\nAbstracted secret to process.env.",
  });

  assert.equal(result.success, true);
  assert.equal(result.isDryRun, true);
  assert.ok(result.prUrl);
  assert.match(result.prUrl, /pull/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test packages/core/tests/remediation/github-app.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `apps/web/lib/github-app.ts`**

Implement GitHub App client with JWT generation, branch creation, contents commit, and PR opening with dry-run fallback.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test packages/core/tests/remediation/github-app.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/github-app.ts packages/core/tests/remediation/github-app.test.ts
git commit -m "feat(web): implement GitHub App client with dry-run and test fallback"
```

---

### Task 4: Remediation Dispatcher & Inngest Background Function

**Files:**
- Create: `apps/web/lib/remediation-dispatcher.ts`
- Create: `apps/web/inngest/functions/execute-remediation.ts`
- Modify: `apps/web/app/api/inngest/route.ts`
- Test: `packages/core/tests/remediation/dispatcher.test.ts`

**Interfaces:**
- Consumes: `generateRemediationPatch`, `createRemediationPullRequest`
- Produces: `dispatchRemediationJob(request): Promise<RemediationResponse>`, `executeRemediationFunction`

- [ ] **Step 1: Write failing test for remediation dispatcher**

Create `packages/core/tests/remediation/dispatcher.test.ts`:
```typescript
import test from "node:test";
import assert from "node:assert/strict";
import {
  dispatchRemediationJob,
  getRemediationRecord,
} from "../../../../apps/web/lib/remediation-dispatcher.ts";

test("dispatchRemediationJob returns queued status and initiates background execution", async () => {
  const result = await dispatchRemediationJob({
    scanId: "scan-test-rem",
    findingId: "f-123",
    repoName: "acme/vibe-shop",
  });

  assert.equal(result.success, true);
  assert.equal(result.status, "queued");
  assert.ok(result.remediationId);

  const record = await getRemediationRecord(result.remediationId);
  assert.ok(record);
  assert.equal(record.id, result.remediationId);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test packages/core/tests/remediation/dispatcher.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `remediation-dispatcher.ts` and `execute-remediation.ts`**

Implement dispatcher with local background worker fallback and register `executeRemediationFunction` in `apps/web/app/api/inngest/route.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test packages/core/tests/remediation/dispatcher.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/remediation-dispatcher.ts apps/web/inngest/functions/execute-remediation.ts apps/web/app/api/inngest/route.ts packages/core/tests/remediation/dispatcher.test.ts
git commit -m "feat(web): implement remediation dispatcher and Inngest execution function"
```

---

### Task 5: Remediation & Repo Settings API Routes

**Files:**
- Create: `apps/web/app/api/remediations/route.ts`
- Create: `apps/web/app/api/remediations/[id]/route.ts`
- Create: `apps/web/app/api/repos/[owner]/[repo]/settings/route.ts`
- Test: `packages/core/tests/remediation/api-remediations.test.ts`

**Interfaces:**
- Consumes: `dispatchRemediationJob`, `getRemediationRecord`, `getRepoSettings`, `updateRepoSettings`
- Produces: `POST /api/remediations`, `GET /api/remediations/[id]`, `GET/PATCH /api/repos/[owner]/[repo]/settings`

- [ ] **Step 1: Write failing test for remediation API routes**

Create `packages/core/tests/remediation/api-remediations.test.ts`:
```typescript
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

test("GET and PATCH repo settings enforces default false for opt-in", async () => {
  const getReq = new Request("http://localhost:3000/api/repos/acme/vibe-shop/settings");
  const getRes = await getSettings(getReq, {
    params: Promise.resolve({ owner: "acme", repo: "vibe-shop" }),
  });
  const data = await getRes.json();
  assert.equal(data.autoRemediateEnabled, false);

  // Enable opt-in
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test packages/core/tests/remediation/api-remediations.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement API route handlers**

Implement `apps/web/app/api/remediations/route.ts`, `apps/web/app/api/remediations/[id]/route.ts`, and `apps/web/app/api/repos/[owner]/[repo]/settings/route.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test packages/core/tests/remediation/api-remediations.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/remediations apps/web/app/api/repos packages/core/tests/remediation/api-remediations.test.ts
git commit -m "feat(web): add remediation and repository settings API routes"
```

---

### Task 6: CLI `wren fix` Command & Full Monorepo Verification

**Files:**
- Create: `packages/cli/src/commands/fix.ts`
- Modify: `packages/cli/src/cli.ts`
- Modify: `packages/cli/src/index.ts`
- Test: `packages/cli/tests/commands/fix.test.ts`

**Interfaces:**
- Consumes: `generateRemediationPatch`, `runScan`
- Produces: `runFixCommand(findingId, options): Promise<number>`

- [ ] **Step 1: Write failing test for `wren fix` CLI command**

Create `packages/cli/tests/commands/fix.test.ts`:
```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { runFixCommand, ExitCode } from "../../dist/index.js";

test("runFixCommand generates patch and outputs diff cleanly", async () => {
  const exitCode = await runFixCommand("WREN-SEC-001", {
    targetPath: ".",
    dryRun: true,
  });
  assert.equal(exitCode, ExitCode.SUCCESS);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter wren-security test`
Expected: FAIL

- [ ] **Step 3: Implement `packages/cli/src/commands/fix.ts` and register command in `src/cli.ts`**

Add `wren fix [finding-id]` command with options `--dry-run`, `--apply-locally`, `--open-pr`.
Export from `packages/cli/src/index.ts`.

- [ ] **Step 4: Rebuild CLI and run test to verify it passes**

Run:
```bash
pnpm --filter wren-security run build
node --test packages/cli/tests/commands/fix.test.ts
```
Expected: PASS

- [ ] **Step 5: Verify full test suite, build, and typecheck across workspace**

Run:
```bash
pnpm --filter @wren/core test
pnpm --filter wren-security test
pnpm --filter web run build
pnpm typecheck
```
Expected: All tests pass, 0 typecheck errors, Next.js build succeeds.

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/commands/fix.ts packages/cli/src/cli.ts packages/cli/src/index.ts packages/cli/tests/commands/fix.test.ts
git commit -m "feat(cli): implement wren fix command with terminal diff preview and pr creation"
```
