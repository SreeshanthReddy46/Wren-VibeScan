# Wren 3.0 Major Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Wren 3.0 Major Release featuring a live agent investigation view, interactive `wren fix` with colored diff confirmation, incremental `wren watch` mode, structured ignore memory in `.wren/ignore.json` with auto-migration, and semver 3.0.0 bump.

**Architecture:** Event-driven streaming from `runDeepReasoningLoop`, interactive readline/TUI confirmation loops in `fix`, filesystem debouncing watch loop in `watch`, and unified JSON ignore persistence with legacy `.wrenignore` migration.

**Tech Stack:** TypeScript, Node.js (`fs/promises`, `readline/promises`), React, Ink, `picocolors`, `chalk`.

## Global Constraints

- Zero code comments (`//`, `/* */`, `--`) across all touched or created source and test files.
- Zero git commits until and unless explicitly instructed by the user.
- Complete strict typing with zero TypeScript compiler errors (`tsc --noEmit`).
- 100% test pass rate across all workspace packages.

---

### Task 1: Structured Ignore Memory (`.wren/ignore.json` & Migration)

**Files:**
- Create: `packages/cli/src/ignore/ignore-store.ts`
- Create: `packages/cli/tests/ignore/ignore-store.test.ts`
- Modify: `packages/cli/src/index.ts`

**Interfaces:**
- Consumes: `Finding`, file system
- Produces:
  - `loadIgnoreStore(targetDir: string): IgnoreStore`
  - `addIgnoreEntry(targetDir: string, entry: Omit<IgnoreEntry, "id" | "ignoredAt">): void`
  - `isFindingIgnored(finding: Finding, store: IgnoreStore): boolean`
  - `migrateLegacyWrenignore(targetDir: string): boolean`

- [ ] **Step 1: Write tests for ignore store and migration**

Create `packages/cli/tests/ignore/ignore-store.test.ts`:
```ts
import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import type { Finding } from "@wren/shared-types";
import {
  loadIgnoreStore,
  addIgnoreEntry,
  isFindingIgnored,
  migrateLegacyWrenignore,
} from "../../dist/index.js";

test("loadIgnoreStore returns empty store when no ignore file exists", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-ign-test-"));
  try {
    const store = loadIgnoreStore(tempDir);
    assert.strictEqual(store.version, "1.0.0");
    assert.strictEqual(store.ignores.length, 0);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("addIgnoreEntry persists entry to .wren/ignore.json", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-ign-test-"));
  try {
    addIgnoreEntry(tempDir, {
      ruleId: "WREN-SEC-001",
      filePath: "src/api.ts",
      reason: "Test fixture mock",
    });

    const store = loadIgnoreStore(tempDir);
    assert.strictEqual(store.ignores.length, 1);
    assert.strictEqual(store.ignores[0].ruleId, "WREN-SEC-001");
    assert.strictEqual(store.ignores[0].filePath, "src/api.ts");
    assert.strictEqual(store.ignores[0].reason, "Test fixture mock");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("isFindingIgnored correctly matches rule and path", () => {
  const store = {
    version: "1.0.0",
    ignores: [
      {
        id: "ign-1",
        ruleId: "WREN-SEC-001",
        filePath: "src/api.ts",
        reason: "Test",
        ignoredAt: new Date().toISOString(),
      },
    ],
  };

  const matchingFinding: Finding = {
    ruleId: "WREN-SEC-001",
    severity: "critical",
    title: "Test",
    plainEnglishExplanation: "Test",
    location: { filePath: "src/api.ts", startLine: 1, endLine: 1 },
  };

  const nonMatchingFinding: Finding = {
    ruleId: "WREN-SEC-002",
    severity: "high",
    title: "Test",
    plainEnglishExplanation: "Test",
    location: { filePath: "src/api.ts", startLine: 1, endLine: 1 },
  };

  assert.strictEqual(isFindingIgnored(matchingFinding, store), true);
  assert.strictEqual(isFindingIgnored(nonMatchingFinding, store), false);
});

test("migrateLegacyWrenignore migrates lines from .wrenignore to .wren/ignore.json", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-mig-test-"));
  try {
    fs.writeFileSync(path.join(tempDir, ".wrenignore"), "tests/fixtures/**\nsrc/legacy.ts\n", "utf8");
    const migrated = migrateLegacyWrenignore(tempDir);
    assert.strictEqual(migrated, true);

    const store = loadIgnoreStore(tempDir);
    assert.strictEqual(store.ignores.length, 2);
    assert.strictEqual(store.ignores[0].filePath, "tests/fixtures/**");
    assert.strictEqual(store.ignores[1].filePath, "src/legacy.ts");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Implement `packages/cli/src/ignore/ignore-store.ts`**

Create `packages/cli/src/ignore/ignore-store.ts`:
```ts
import * as fs from "fs";
import * as path from "path";
import type { Finding } from "@wren/shared-types";

export interface IgnoreEntry {
  id: string;
  ruleId: string;
  filePath: string;
  reason: string;
  ignoredAt: string;
}

export interface IgnoreStore {
  version: string;
  ignores: IgnoreEntry[];
}

export const PRESET_IGNORE_REASONS = [
  "False positive / intentional pattern",
  "Test fixture / internal mock",
  "Mitigated by external boundary / WAF",
  "Custom reason",
];

export function getWrenDir(targetDir: string = "."): string {
  return path.join(path.resolve(targetDir), ".wren");
}

export function getIgnoreFilePath(targetDir: string = "."): string {
  return path.join(getWrenDir(targetDir), "ignore.json");
}

export function loadIgnoreStore(targetDir: string = "."): IgnoreStore {
  migrateLegacyWrenignore(targetDir);
  const ignoreFile = getIgnoreFilePath(targetDir);

  if (fs.existsSync(ignoreFile)) {
    try {
      const content = fs.readFileSync(ignoreFile, "utf8");
      return JSON.parse(content) as IgnoreStore;
    } catch {
      return { version: "1.0.0", ignores: [] };
    }
  }

  return { version: "1.0.0", ignores: [] };
}

export function addIgnoreEntry(
  targetDir: string,
  entry: Omit<IgnoreEntry, "id" | "ignoredAt">
): void {
  const store = loadIgnoreStore(targetDir);
  const wrenDir = getWrenDir(targetDir);
  const ignoreFile = getIgnoreFilePath(targetDir);

  if (!fs.existsSync(wrenDir)) {
    fs.mkdirSync(wrenDir, { recursive: true });
  }

  const normalizedPath = entry.filePath.replace(/\\/g, "/");
  const alreadyIgnored = store.ignores.some(
    (item) => item.ruleId === entry.ruleId && item.filePath === normalizedPath
  );

  if (alreadyIgnored) return;

  const newEntry: IgnoreEntry = {
    id: `ign-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    ruleId: entry.ruleId,
    filePath: normalizedPath,
    reason: entry.reason,
    ignoredAt: new Date().toISOString(),
  };

  store.ignores.push(newEntry);
  fs.writeFileSync(ignoreFile, JSON.stringify(store, null, 2), "utf8");
}

export function isFindingIgnored(finding: Finding, store: IgnoreStore): boolean {
  const normalizedPath = finding.location.filePath.replace(/\\/g, "/");
  return store.ignores.some((entry) => {
    const ruleMatch = entry.ruleId === "*" || entry.ruleId === finding.ruleId;
    const pathMatch =
      entry.filePath === "*" ||
      entry.filePath === normalizedPath ||
      normalizedPath.startsWith(entry.filePath.replace(/\*\*$/, ""));
    return ruleMatch && pathMatch;
  });
}

export function migrateLegacyWrenignore(targetDir: string = "."): boolean {
  const legacyFile = path.join(path.resolve(targetDir), ".wrenignore");
  const ignoreFile = getIgnoreFilePath(targetDir);

  if (!fs.existsSync(legacyFile) || fs.existsSync(ignoreFile)) {
    return false;
  }

  const wrenDir = getWrenDir(targetDir);
  if (!fs.existsSync(wrenDir)) {
    fs.mkdirSync(wrenDir, { recursive: true });
  }

  try {
    const lines = fs
      .readFileSync(legacyFile, "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("#"));

    const store: IgnoreStore = {
      version: "1.0.0",
      ignores: lines.map((line, idx) => ({
        id: `migrated-${idx + 1}`,
        ruleId: "*",
        filePath: line.replace(/\\/g, "/"),
        reason: "Migrated from .wrenignore",
        ignoredAt: new Date().toISOString(),
      })),
    };

    fs.writeFileSync(ignoreFile, JSON.stringify(store, null, 2), "utf8");
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 3: Export from `packages/cli/src/index.ts`, rebuild and verify test passes**

Export in `packages/cli/src/index.ts`:
```ts
export {
  loadIgnoreStore,
  addIgnoreEntry,
  isFindingIgnored,
  migrateLegacyWrenignore,
  PRESET_IGNORE_REASONS,
} from "./ignore/ignore-store";
export type { IgnoreEntry, IgnoreStore } from "./ignore/ignore-store";
```
Run: `pnpm --filter wren-security build && node --test packages/cli/tests/ignore/ignore-store.test.ts`
Expected: PASS.

---

### Task 2: Live Investigation View (`check --llm` & TUI)

**Files:**
- Modify: `packages/shared-types/src/index.ts`
- Modify: `packages/cli/src/engine/agent-loop.ts`
- Modify: `packages/cli/src/report/spinner-manager.ts`
- Create: `packages/cli/tests/engine/live-investigation.test.ts`

**Interfaces:**
- Consumes: `ScanProgressEvent`
- Produces: Live streamed step events during deep reasoning

- [ ] **Step 1: Update `packages/shared-types/src/index.ts` with investigation progress events**

Add to `ScanProgressEvent` in `packages/shared-types/src/index.ts`:
```ts
  | { stage: "investigation_start"; target: string; ruleId: string }
  | { stage: "investigation_step"; tool: string; inputSummary: string; outputSummary: string }
  | { stage: "investigation_verdict"; target: string; verdict: string; severity: Severity; explanation: string }
```

- [ ] **Step 2: Update `packages/cli/src/engine/agent-loop.ts` to emit live events**

Add `onProgress?: (event: ScanProgressEvent) => void` to `AgentLoopOptions`.
In `runDeepReasoningLoop`:
- Emit `investigation_start` with target path and rule ID.
- Inside tool execution loop: emit `investigation_step` with tool name and parameter summary.
- On verdict conclusion: emit `investigation_verdict` with verdict and explanation.

- [ ] **Step 3: Update `TerminalSpinnerManager` in `packages/cli/src/report/spinner-manager.ts`**

In `handleProgress(event: ScanProgressEvent)`:
- On `investigation_start`: Log `\n⠋ Investigating ${event.target}` in cyan.
- On `investigation_step`: Log `  → ${event.tool.padEnd(12)} ${event.inputSummary} (${event.outputSummary})` in dimmed gray/yellow.
- On `investigation_verdict`: Log `  → verdict     ${badge} · ${event.explanation}`.

- [ ] **Step 4: Write and verify live investigation test**

Create `packages/cli/tests/engine/live-investigation.test.ts` testing event emission:
Run: `pnpm --filter wren-security build && node --test packages/cli/tests/engine/live-investigation.test.ts`
Expected: PASS.

---

### Task 3: Interactive `wren fix` with Colored Diff Confirmation

**Files:**
- Modify: `packages/cli/src/commands/fix.ts`
- Modify: `packages/cli/src/cli.ts`
- Create: `packages/cli/tests/commands/fix-interactive.test.ts`

**Interfaces:**
- Consumes: `generateRemediationPatch`
- Produces: Interactive prompt loop requesting `[y/n/q]` confirmation before applying patches

- [ ] **Step 1: Write interactive fix tests**

Create `packages/cli/tests/commands/fix-interactive.test.ts`:
```ts
import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { runFixCommand } from "../../dist/index.js";

test("runFixCommand with --yes applies patch immediately without prompting", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-fix-test-"));
  const targetFile = path.join(tempDir, "client.ts");
  fs.writeFileSync(targetFile, 'const apiKey = "process.env.API_SECRET";\n', "utf8");

  try {
    const exitCode = await runFixCommand(undefined, {
      targetPath: tempDir,
      file: "client.ts",
      yes: true,
    });
    assert.strictEqual(exitCode, 0);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Update `packages/cli/src/commands/fix.ts`**

Add `yes?: boolean` to `FixCommandOptions`.
When not `--dry-run`, not `--open-pr`, and not `--yes`:
Prompt user via `readline`: `Apply patch to ${patch.filePath}? [y/n/q] › `:
- If `y`: write patched content to file.
- If `n`: skip without writing.
- If `q`: abort.

- [ ] **Step 3: Update `packages/cli/src/cli.ts`**

Add `-y, --yes` option to `fix` command:
```ts
cli
  .command("fix [findingId]", "Generate and apply remediation patches or open GitHub PRs")
  .option("-y, --yes", "Apply fix automatically without interactive prompt")
```

- [ ] **Step 4: Verify test passes**

Run: `pnpm --filter wren-security build && node --test packages/cli/tests/commands/fix-interactive.test.ts`
Expected: PASS.

---

### Task 4: Watch Mode (`wren watch`)

**Files:**
- Create: `packages/cli/src/commands/watch.ts`
- Modify: `packages/cli/src/cli.ts`
- Modify: `packages/cli/src/index.ts`
- Create: `packages/cli/tests/commands/watch.test.ts`

**Interfaces:**
- Consumes: target path, `runScan`
- Produces: `runWatchCommand(targetPath: string, options: WatchCommandOptions): Promise<void>`

- [ ] **Step 1: Write watch command test**

Create `packages/cli/tests/commands/watch.test.ts`:
```ts
import test from "node:test";
import assert from "node:assert/strict";
import { isWatchableFile } from "../../dist/index.js";

test("isWatchableFile returns true for source code files", () => {
  assert.strictEqual(isWatchableFile("src/index.ts"), true);
  assert.strictEqual(isWatchableFile("app/page.tsx"), true);
  assert.strictEqual(isWatchableFile("server.js"), true);
  assert.strictEqual(isWatchableFile(".env.local"), true);
});

test("isWatchableFile returns false for ignored directories", () => {
  assert.strictEqual(isWatchableFile("node_modules/pkg/index.js"), false);
  assert.strictEqual(isWatchableFile(".git/HEAD"), false);
  assert.strictEqual(isWatchableFile("dist/bundle.js"), false);
});
```

- [ ] **Step 2: Implement `packages/cli/src/commands/watch.ts`**

Create `packages/cli/src/commands/watch.ts`:
```ts
import * as fs from "fs";
import * as path from "path";
import pc from "picocolors";
import { runScan } from "@wren/core";
import { formatTerminalReport } from "../report/terminal-formatter";
import { loadIgnoreStore, isFindingIgnored } from "../ignore/ignore-store";

export interface WatchCommandOptions {
  targetPath?: string;
  debounceMs?: number;
}

export function isWatchableFile(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  if (
    normalized.includes("/node_modules/") ||
    normalized.startsWith("node_modules/") ||
    normalized.includes("/.git/") ||
    normalized.startsWith(".git/") ||
    normalized.includes("/dist/") ||
    normalized.startsWith("dist/") ||
    normalized.includes("/.wren/") ||
    normalized.startsWith(".wren/")
  ) {
    return false;
  }

  const ext = path.extname(normalized).toLowerCase();
  const base = path.basename(normalized);
  return (
    [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"].includes(ext) ||
    base.startsWith(".env")
  );
}

export async function runWatchCommand(
  targetPath: string = ".",
  options: WatchCommandOptions = {}
): Promise<void> {
  const resolvedTarget = path.resolve(targetPath);
  const debounceMs = options.debounceMs ?? 200;
  let timer: NodeJS.Timeout | null = null;
  let isScanning = false;

  console.log(pc.cyan(`\n👀 Wren Watch Mode: Monitoring ${resolvedTarget} for file changes...\n`));

  const triggerScan = async () => {
    if (isScanning) return;
    isScanning = true;

    try {
      if (process.stdout.isTTY) {
        process.stdout.write("\x1b[2J\x1b[H");
      }

      const timestamp = new Date().toLocaleTimeString();
      console.log(pc.bold(pc.cyan(`🦅 Wren Watch Active`)) + pc.dim(` · Last scanned: ${timestamp}`));

      const result = await runScan({
        targetPath: resolvedTarget,
        format: "terminal",
      });

      const store = loadIgnoreStore(resolvedTarget);
      result.findings = result.findings.filter((f) => !isFindingIgnored(f, store));

      console.log(formatTerminalReport(result));
      console.log(pc.dim("\nWatching for changes... Press Ctrl+C to exit.\n"));
    } finally {
      isScanning = false;
    }
  };

  await triggerScan();

  fs.watch(resolvedTarget, { recursive: true }, (eventType, filename) => {
    if (!filename || !isWatchableFile(filename)) return;

    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      triggerScan();
    }, debounceMs);
  });
}
```

- [ ] **Step 3: Register `wren watch` in `packages/cli/src/cli.ts`**

Add `watch` command to `cli.ts`:
```ts
cli
  .command("watch [path]", "Watch codebase for file changes and re-scan automatically")
  .action(async (targetPath = ".") => {
    try {
      await runWatchCommand(targetPath);
    } catch (error) {
      handleCliError(error);
    }
  });
```

- [ ] **Step 4: Verify test passes**

Run: `pnpm --filter wren-security build && node --test packages/cli/tests/commands/watch.test.ts`
Expected: PASS.

---

### Task 5: Version Bump to 3.0.0 & Configuration Relocation

**Files:**
- Modify: `packages/cli/package.json`
- Modify: `packages/cli/src/cli.ts`
- Modify: `packages/cli/src/commands/init.ts`

- [ ] **Step 1: Bump version to 3.0.0 in `packages/cli/package.json`**

Update `version: "3.0.0"` in `packages/cli/package.json`.

- [ ] **Step 2: Update `packages/cli/src/commands/init.ts`**

Update `init` command to generate `.wren/` directory and `.wren/ignore.json` instead of bare `.wrenignore`.

- [ ] **Step 3: Verify CLI version output**

Run: `pnpm --filter wren-security build && node packages/cli/dist/cli.js --version`
Expected: `wren-security/3.0.0`

---

### Task 6: Full Monorepo Verification & Audit

**Files:**
- Verification step across repository

- [ ] **Step 1: Run all CLI tests**
Run: `pnpm --filter wren-security test`
Expected: All 65+ passing tests.

- [ ] **Step 2: Run all Core tests**
Run: `pnpm --filter @wren/core test`
Expected: 70 passing tests.

- [ ] **Step 3: Run accuracy evaluation benchmark**
Run: `pnpm test:eval`
Expected: 100% Precision, 100% Recall.

- [ ] **Step 4: Run monorepo typecheck**
Run: `pnpm -r typecheck`
Expected: 0 errors across all workspace packages.

- [ ] **Step 5: Run monorepo production build**
Run: `pnpm build`
Expected: All Turbo build tasks complete successfully.

- [ ] **Step 6: Grep audit for zero code comments**
Run: Grep search across all new and modified files for `//`, `/*`, and `--`.
Expected: 0 matches.
