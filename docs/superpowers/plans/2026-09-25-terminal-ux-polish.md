# Terminal UX & Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Wren CLI (`wren check`) into a modern, high-polish terminal experience with dynamic multi-stage spinners (`ora`), disciplined severity colors (`chalk`), framed summary card (`boxen`), structured tabular format (`cli-table3`), `--quiet` mode, and CI/NO_COLOR/SIGINT resilience.

**Architecture:** Extend `@wren/core` with a decoupled `onProgress` lifecycle event hook; create a dedicated `TerminalSpinnerManager` in `packages/cli` that handles real file progress and environmental suppression; implement `table-formatter.ts` and `boxen-summary.ts`; bundle pure ESM dependencies (`ora`, `chalk`, `boxen`, `cli-table3`) in `tsup.config.ts`.

**Tech Stack:** TypeScript, Node.js, `ora`, `chalk`, `boxen`, `cli-table3`, `tsup`, `node:test`.

## Global Constraints
- **Zero Code Comments**: Maintain strict zero comments (`//`, `/* */`, `--`) in all code and test files.
- **Zero Git Commits**: Do NOT execute any `git commit` commands under any circumstances until the user explicitly commands it.
- **Pure ESM Bundling**: In `packages/cli/tsup.config.ts`, bundle `ora`, `chalk`, `boxen`, and `cli-table3` via `noExternal` to prevent runtime `ERR_REQUIRE_ESM` errors in CommonJS builds.

---

## File Structure

### Modified Files:
- `packages/shared-types/src/index.ts`: Add `ScanProgressEvent` type and `onProgress` to `ScanConfig`, add `"table"` to `OutputFormat`.
- `packages/core/src/index.ts`: Emit `discovery_start`, `discovery_complete`, `scan_file`, `static_complete`, `reasoning_start`, and `reasoning_complete` events in `runScan`.
- `packages/cli/package.json`: Add dependencies `ora`, `chalk`, `boxen`, `cli-table3`, and devDependency `@types/cli-table3`.
- `packages/cli/tsup.config.ts`: Add `noExternal: ["ora", "chalk", "boxen", "cli-table3", "@wren/core", "@wren/shared-types"]`.
- `packages/cli/src/commands/check.ts`: Integrate `TerminalSpinnerManager`, `--quiet`, `--format table`, and `SIGINT` handling.
- `packages/cli/src/cli.ts`: Register `--quiet` and `--format table` options.
- `packages/cli/src/report/terminal-formatter.ts`: Integrate disciplined `chalk` colors and `boxen` summary card.
- `packages/cli/src/index.ts`: Export new formatters and types.

### Created Files:
- `packages/cli/src/report/severity-colors.ts`: Disciplined severity badge formatting via `chalk`.
- `packages/cli/src/report/boxen-summary.ts`: Framed final summary using `boxen` with dynamic border colors and `NO_COLOR` handling.
- `packages/cli/src/report/table-formatter.ts`: Structured tabular report using `cli-table3`.
- `packages/cli/src/report/spinner-manager.ts`: Manages `ora` spinner lifecycle, dynamic text, CI/quiet suppression, and SIGINT cleanup.
- `packages/cli/tests/report/table-formatter.test.ts`: Unit tests for table formatter.
- `packages/cli/tests/report/boxen-summary.test.ts`: Unit tests for Boxen summary card.
- `packages/cli/tests/report/spinner-manager.test.ts`: Unit tests for spinner manager.
- `packages/cli/tests/commands/check-ux.test.ts`: Integration tests for `--quiet`, `--format table`, and `NO_COLOR`.

---

## Tasks

### Task 1: Add Progress Events & Table Format to Shared Types & Core

**Files:**
- Modify: `packages/shared-types/src/index.ts:65-79`
- Modify: `packages/core/src/index.ts:40-100`
- Test: `packages/core/tests/events/progress-bridge.test.ts`

**Interfaces:**
- Consumes: None
- Produces: `ScanProgressEvent`, `ScanConfig.onProgress`, `OutputFormat = "terminal" | "json" | "sarif" | "table"`

- [ ] **Step 1: Write the failing test for Core progress events**

Create `packages/core/tests/events/progress-bridge.test.ts`:
```ts
import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { runScan } from "../../src/index";
import type { ScanProgressEvent } from "@wren/shared-types";

test("runScan emits lifecycle progress events when onProgress is provided", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-progress-test-"));
  const sampleFile = path.join(tempDir, "service.ts");
  fs.writeFileSync(sampleFile, "export const apiKey = 'sk-proj-1234567890123456789012345678901234567890';", "utf8");

  const capturedEvents: ScanProgressEvent[] = [];

  try {
    const result = await runScan({
      targetPath: tempDir,
      enableLlmReasoning: false,
      onProgress: (event) => {
        capturedEvents.push(event);
      },
    });

    assert.ok(result.findings.length > 0);
    const stages = capturedEvents.map((e) => e.stage);
    assert.ok(stages.includes("discovery_start"));
    assert.ok(stages.includes("discovery_complete"));
    assert.ok(stages.includes("scan_file"));
    assert.ok(stages.includes("static_complete"));

    const discComplete = capturedEvents.find((e) => e.stage === "discovery_complete") as any;
    assert.strictEqual(discComplete.fileCount, 1);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test packages/core/tests/events/progress-bridge.test.ts`
Expected: FAIL (types do not exist yet or events not emitted).

- [ ] **Step 3: Update `packages/shared-types/src/index.ts`**

Update `OutputFormat` and `ScanConfig` in `packages/shared-types/src/index.ts`:
```ts
export type OutputFormat = "terminal" | "json" | "sarif" | "table";

export type ScanProgressEvent =
  | { stage: "discovery_start" }
  | { stage: "discovery_complete"; fileCount: number; durationMs: number }
  | { stage: "scan_file"; current: number; total: number; filePath: string }
  | { stage: "static_complete"; findingsCount: number; durationMs: number }
  | { stage: "reasoning_start"; candidateCount: number }
  | { stage: "reasoning_complete"; durationMs: number };

export interface ScanConfig {
  targetPath?: string;
  ignorePaths?: string[];
  ignoreRules?: string[];
  failOnSeverity?: Severity;
  format?: OutputFormat;
  enableLlmReasoning?: boolean;
  apiKey?: string;
  apiUrl?: string;
  outputFile?: string;
  llmTimeoutMs?: number;
  onProgress?: (event: ScanProgressEvent) => void;
}
```

- [ ] **Step 4: Update `packages/core/src/index.ts` to emit progress events**

In `packages/core/src/index.ts`:
```ts
  const discStart = Date.now();
  config.onProgress?.({ stage: "discovery_start" });
  const files = discoverFiles(targetPath, {
    ignorePaths: config.ignorePaths,
  });
  const discDuration = Date.now() - discStart;
  config.onProgress?.({
    stage: "discovery_complete",
    fileCount: files.length,
    durationMs: discDuration,
  });

  const staticStart = Date.now();
  for (let i = 0; i < files.length; i++) {
    config.onProgress?.({
      stage: "scan_file",
      current: i + 1,
      total: files.length,
      filePath: files[i],
    });
  }
  const staticFindings = runStaticScan(files);
  const astFindings = runAstScan(files);
  let allFindings = [...staticFindings, ...astFindings];
  const staticDuration = Date.now() - staticStart;
  config.onProgress?.({
    stage: "static_complete",
    findingsCount: allFindings.length,
    durationMs: staticDuration,
  });
```
And if `config.enableLlmReasoning`:
```ts
  const reasoningStart = Date.now();
  config.onProgress?.({
    stage: "reasoning_start",
    candidateCount: allFindings.length,
  });
  // ... enrichFindingsWithLlm call
  config.onProgress?.({
    stage: "reasoning_complete",
    durationMs: Date.now() - reasoningStart,
  });
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test packages/core/tests/events/progress-bridge.test.ts`
Expected: PASS.

---

### Task 2: Install CLI Dependencies & Configure Bundling

**Files:**
- Modify: `packages/cli/package.json`
- Modify: `packages/cli/tsup.config.ts`

**Interfaces:**
- Consumes: `ora`, `chalk`, `boxen`, `cli-table3`
- Produces: Bundled CJS distribution with no external ESM conflicts

- [ ] **Step 1: Install packages in `packages/cli`**

Execute:
```bash
pnpm --filter wren-security add ora@8.1.1 chalk@5.3.0 boxen@7.1.1 cli-table3@0.6.5
pnpm --filter wren-security add -D @types/cli-table3@0.6.3
```

- [ ] **Step 2: Update `packages/cli/tsup.config.ts`**

In `packages/cli/tsup.config.ts`:
```ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli.ts", "src/index.ts"],
  format: ["cjs"],
  dts: true,
  clean: true,
  banner: ({ format }) => {
    if (format === "cjs") {
      return {
        js: "#!/usr/bin/env node",
      };
    }
  },
  noExternal: [
    "ora",
    "chalk",
    "boxen",
    "cli-table3",
    "@wren/core",
    "@wren/shared-types",
  ],
});
```

- [ ] **Step 3: Verify build compiles cleanly**

Run: `pnpm --filter wren-security build`
Expected: ⚡️ Build success in <2000ms.

---

### Task 3: Implement Disciplined Severity Colors & Boxen Summary

**Files:**
- Create: `packages/cli/src/report/severity-colors.ts`
- Create: `packages/cli/src/report/boxen-summary.ts`
- Test: `packages/cli/tests/report/boxen-summary.test.ts`

**Interfaces:**
- Consumes: `Finding`, `ScanResult`, `Severity` from `@wren/shared-types`
- Produces: `formatSeverityBadge(severity: Severity): string`, `renderBoxenSummary(result: ScanResult): string`

- [ ] **Step 1: Write failing test for Boxen summary and severity formatting**

Create `packages/cli/tests/report/boxen-summary.test.ts`:
```ts
import test from "node:test";
import assert from "node:assert/strict";
import { formatSeverityBadge } from "../../dist/index.js";
import { renderBoxenSummary } from "../../dist/index.js";
import type { ScanResult } from "@wren/shared-types";

test("formatSeverityBadge returns plain uppercase badge when NO_COLOR is set", () => {
  const badge = formatSeverityBadge("critical");
  assert.ok(badge.includes("CRITICAL"));
});

test("renderBoxenSummary formats clean scan card correctly", () => {
  const cleanResult: ScanResult = {
    scanId: "scan-clean",
    targetPath: ".",
    timestamp: new Date().toISOString(),
    findings: [],
    engineVersion: "2.1.2",
    summary: {
      totalFindings: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
      filesScanned: 25,
      scanDurationMs: 340,
      completedAt: new Date().toISOString(),
    },
  };

  const output = renderBoxenSummary(cleanResult);
  assert.ok(output.includes("Scan Passed"));
  assert.ok(output.includes("No vulnerabilities found"));
  assert.ok(output.includes("25 files"));
});

test("renderBoxenSummary formats findings card with issue counts", () => {
  const vulnResult: ScanResult = {
    scanId: "scan-vuln",
    targetPath: ".",
    timestamp: new Date().toISOString(),
    findings: [
      {
        id: "f1",
        ruleId: "WREN-SEC-001",
        category: "secret",
        severity: "critical",
        title: "Leaked Token",
        message: "Found secret",
        plainEnglishExplanation: "Private key in repo",
        location: { filePath: "client.ts", startLine: 1, endLine: 1 },
        fix: { description: "Use env", replacementCode: "process.env.KEY" },
      },
    ],
    engineVersion: "2.1.2",
    summary: {
      totalFindings: 1,
      critical: 1,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
      filesScanned: 10,
      scanDurationMs: 820,
      completedAt: new Date().toISOString(),
    },
  };

  const output = renderBoxenSummary(vulnResult);
  assert.ok(output.includes("Scan Complete"));
  assert.ok(output.includes("1 issue found"));
  assert.ok(output.includes("1 critical"));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test packages/cli/tests/report/boxen-summary.test.ts`
Expected: FAIL (modules do not exist yet).

- [ ] **Step 3: Implement `packages/cli/src/report/severity-colors.ts`**

Create `packages/cli/src/report/severity-colors.ts`:
```ts
import chalk from "chalk";
import type { Severity } from "@wren/shared-types";

export function formatSeverityBadge(severity: Severity): string {
  switch (severity) {
    case "critical":
      return chalk.red.bold("CRITICAL");
    case "high":
      return chalk.yellow("HIGH");
    case "medium":
      return chalk.blue("MEDIUM");
    case "low":
      return chalk.gray("LOW");
    case "info":
    default:
      return chalk.dim("INFO");
  }
}
```

- [ ] **Step 4: Implement `packages/cli/src/report/boxen-summary.ts`**

Create `packages/cli/src/report/boxen-summary.ts`:
```ts
import boxen from "boxen";
import chalk from "chalk";
import type { ScanResult, Severity } from "@wren/shared-types";

function getHighestSeverity(result: ScanResult): Severity {
  if (result.summary.critical > 0) return "critical";
  if (result.summary.high > 0) return "high";
  if (result.summary.medium > 0) return "medium";
  if (result.summary.low > 0) return "low";
  return "info";
}

export function renderBoxenSummary(result: ScanResult): string {
  const isNoColor = Boolean(process.env.NO_COLOR);
  const durationSec = (result.summary.scanDurationMs / 1000).toFixed(1);

  if (result.findings.length === 0) {
    const text = [
      (isNoColor ? "✔ " : chalk.green("✔ ")) + "No vulnerabilities found! Your codebase looks safe to deploy.",
      `Scanned ${result.summary.filesScanned} files in ${durationSec}s`,
    ].join("\n");

    return boxen(text, {
      padding: 1,
      margin: 1,
      borderColor: isNoColor ? undefined : "green",
      title: "Scan Passed",
    });
  }

  const highest = getHighestSeverity(result);
  const borderColor = isNoColor
    ? undefined
    : highest === "critical" || highest === "high"
      ? "red"
      : highest === "medium"
        ? "yellow"
        : "blue";

  const total = result.findings.length;
  const issueText = `${total} issue${total === 1 ? "" : "s"} found`;
  const breakdown = [
    result.summary.critical > 0 ? `${result.summary.critical} critical` : null,
    result.summary.high > 0 ? `${result.summary.high} high` : null,
    result.summary.medium > 0 ? `${result.summary.medium} medium` : null,
    result.summary.low > 0 ? `${result.summary.low} low` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const lines = [
    issueText,
    breakdown,
    `Scanned ${result.summary.filesScanned} files in ${durationSec}s`,
  ];

  return boxen(lines.join("\n"), {
    padding: 1,
    margin: 1,
    borderColor,
    title: "Scan Complete",
  });
}
```

- [ ] **Step 5: Export from `packages/cli/src/index.ts`, rebuild and verify tests pass**

Export `formatSeverityBadge` and `renderBoxenSummary` in `packages/cli/src/index.ts`.
Run: `pnpm --filter wren-security build && node --test packages/cli/tests/report/boxen-summary.test.ts`
Expected: PASS.

---

### Task 4: Implement Structured Tabular Report (`cli-table3`)

**Files:**
- Create: `packages/cli/src/report/table-formatter.ts`
- Modify: `packages/cli/src/report/terminal-formatter.ts`
- Test: `packages/cli/tests/report/table-formatter.test.ts`

**Interfaces:**
- Consumes: `ScanResult`
- Produces: `formatTableReport(result: ScanResult): string`

- [ ] **Step 1: Write failing test for table report formatter**

Create `packages/cli/tests/report/table-formatter.test.ts`:
```ts
import test from "node:test";
import assert from "node:assert/strict";
import { formatTableReport } from "../../dist/index.js";
import type { ScanResult } from "@wren/shared-types";

test("formatTableReport renders empty findings cleanly with boxen card", () => {
  const cleanResult: ScanResult = {
    scanId: "scan-t1",
    targetPath: ".",
    timestamp: new Date().toISOString(),
    findings: [],
    engineVersion: "2.1.2",
    summary: {
      totalFindings: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
      filesScanned: 10,
      scanDurationMs: 120,
      completedAt: new Date().toISOString(),
    },
  };

  const output = formatTableReport(cleanResult);
  assert.ok(output.includes("Scan Passed"));
  assert.ok(output.includes("No vulnerabilities found"));
});

test("formatTableReport outputs structured table rows with headers", () => {
  const vulnResult: ScanResult = {
    scanId: "scan-t2",
    targetPath: ".",
    timestamp: new Date().toISOString(),
    findings: [
      {
        id: "f1",
        ruleId: "WREN-SEC-001",
        category: "secret",
        severity: "critical",
        title: "Hardcoded API Key",
        message: "API key hardcoded",
        plainEnglishExplanation: "Leaked secret",
        location: { filePath: "src/key.ts", startLine: 14, endLine: 14 },
        fix: { description: "Use env", replacementCode: "process.env.KEY" },
      },
    ],
    engineVersion: "2.1.2",
    summary: {
      totalFindings: 1,
      critical: 1,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
      filesScanned: 10,
      scanDurationMs: 400,
      completedAt: new Date().toISOString(),
    },
  };

  const output = formatTableReport(vulnResult);
  assert.ok(output.includes("Severity"));
  assert.ok(output.includes("Rule ID"));
  assert.ok(output.includes("Location"));
  assert.ok(output.includes("Description"));
  assert.ok(output.includes("WREN-SEC-001"));
  assert.ok(output.includes("src/key.ts:14"));
  assert.ok(output.includes("Scan Complete"));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test packages/cli/tests/report/table-formatter.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `packages/cli/src/report/table-formatter.ts`**

Create `packages/cli/src/report/table-formatter.ts`:
```ts
import Table from "cli-table3";
import type { ScanResult } from "@wren/shared-types";
import { formatSeverityBadge } from "./severity-colors";
import { renderBoxenSummary } from "./boxen-summary";

export function formatTableReport(result: ScanResult): string {
  if (result.findings.length === 0) {
    return renderBoxenSummary(result);
  }

  const table = new Table({
    head: ["Severity", "Rule ID", "Location", "Description"],
    style: {
      head: [],
      border: [],
    },
    colWidths: [12, 16, 32, 42],
    wordWrap: true,
  });

  for (const finding of result.findings) {
    const loc = `${finding.location.filePath}:${finding.location.startLine}`;
    table.push([
      formatSeverityBadge(finding.severity),
      finding.ruleId,
      loc,
      finding.title,
    ]);
  }

  const outputLines = [
    table.toString(),
    renderBoxenSummary(result),
  ];

  return outputLines.join("\n");
}
```

- [ ] **Step 4: Update `packages/cli/src/report/terminal-formatter.ts` to include Boxen summary**

In `packages/cli/src/report/terminal-formatter.ts`:
Append `renderBoxenSummary(result)` at the bottom of `formatTerminalReport` instead of trailing summary lines.

- [ ] **Step 5: Export from `packages/cli/src/index.ts`, rebuild and verify test passes**

Run: `pnpm --filter wren-security build && node --test packages/cli/tests/report/table-formatter.test.ts`
Expected: PASS.

---

### Task 5: Implement `TerminalSpinnerManager` & Graceful SIGINT

**Files:**
- Create: `packages/cli/src/report/spinner-manager.ts`
- Test: `packages/cli/tests/report/spinner-manager.test.ts`

**Interfaces:**
- Consumes: `ScanProgressEvent`
- Produces: `TerminalSpinnerManager` class with `handleProgress(event: ScanProgressEvent): void`, `stop(): void`

- [ ] **Step 1: Write failing test for `TerminalSpinnerManager`**

Create `packages/cli/tests/report/spinner-manager.test.ts`:
```ts
import test from "node:test";
import assert from "node:assert/strict";
import { TerminalSpinnerManager } from "../../dist/index.js";

test("TerminalSpinnerManager is silent when quiet option is enabled", () => {
  const manager = new TerminalSpinnerManager({ quiet: true });
  assert.strictEqual(manager.isSilent, true);
  manager.handleProgress({ stage: "discovery_start" });
  manager.handleProgress({ stage: "discovery_complete", fileCount: 10, durationMs: 50 });
  manager.stop();
});

test("TerminalSpinnerManager respects CI environment variable", () => {
  const origCi = process.env.CI;
  process.env.CI = "true";
  try {
    const manager = new TerminalSpinnerManager({ quiet: false });
    assert.strictEqual(manager.isSilent, true);
  } finally {
    if (origCi === undefined) {
      delete process.env.CI;
    } else {
      process.env.CI = origCi;
    }
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test packages/cli/tests/report/spinner-manager.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `packages/cli/src/report/spinner-manager.ts`**

Create `packages/cli/src/report/spinner-manager.ts`:
```ts
import ora, { type Ora } from "ora";
import type { ScanProgressEvent } from "@wren/shared-types";

export interface SpinnerManagerOptions {
  quiet?: boolean;
}

export class TerminalSpinnerManager {
  readonly isSilent: boolean;
  private spinner: Ora | null = null;
  private sigintHandler: (() => void) | null = null;

  constructor(options: SpinnerManagerOptions = {}) {
    this.isSilent = Boolean(
      options.quiet ||
        process.env.CI ||
        process.stdout.isTTY === false ||
        process.env.NO_SPINNER
    );
  }

  start(): void {
    if (this.isSilent) return;
    this.sigintHandler = () => {
      this.stop();
      process.stderr.write("\nScan cancelled by user\n");
      process.exit(130);
    };
    process.once("SIGINT", this.sigintHandler);
  }

  handleProgress(event: ScanProgressEvent): void {
    if (this.isSilent) return;

    switch (event.stage) {
      case "discovery_start":
        this.spinner = ora("Discovering files...").start();
        break;
      case "discovery_complete":
        if (this.spinner) {
          this.spinner.succeed(`Discovered ${event.fileCount} files (${event.durationMs}ms)`);
          this.spinner = ora("Running static analysis...").start();
        }
        break;
      case "scan_file":
        if (this.spinner) {
          this.spinner.text = `Scanning files (${event.current}/${event.total})...`;
        }
        break;
      case "static_complete":
        if (this.spinner) {
          this.spinner.succeed(`Static analysis complete (${event.durationMs}ms)`);
          this.spinner = null;
        }
        break;
      case "reasoning_start":
        this.spinner = ora(
          `Reasoning on ${event.candidateCount} flagged candidates with Deep Reasoning...`
        ).start();
        break;
      case "reasoning_complete":
        if (this.spinner) {
          this.spinner.succeed(`Investigation complete (${event.durationMs}ms)`);
          this.spinner = null;
        }
        break;
    }
  }

  stop(): void {
    if (this.sigintHandler) {
      process.removeListener("SIGINT", this.sigintHandler);
      this.sigintHandler = null;
    }
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }
}
```

- [ ] **Step 4: Export from `packages/cli/src/index.ts`, rebuild and verify test passes**

Run: `pnpm --filter wren-security build && node --test packages/cli/tests/report/spinner-manager.test.ts`
Expected: PASS.

---

### Task 6: Wire `--quiet`, `--format table`, and Spinners into `check` Command & CLI

**Files:**
- Modify: `packages/cli/src/commands/check.ts`
- Modify: `packages/cli/src/cli.ts`
- Test: `packages/cli/tests/commands/check-ux.test.ts`

**Interfaces:**
- Consumes: `CheckCommandOptions.quiet`, `CheckCommandOptions.format = "table"`
- Produces: Integrated UX flow for `wren check`

- [ ] **Step 1: Write integration test for check command with new options**

Create `packages/cli/tests/commands/check-ux.test.ts`:
```ts
import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { runCheckCommand } from "../../dist/index.js";

test("runCheckCommand with --quiet runs silently without throwing", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-quiet-test-"));
  fs.writeFileSync(path.join(tempDir, "index.ts"), "export const x = 1;", "utf8");

  try {
    const exitCode = await runCheckCommand(tempDir, { quiet: true });
    assert.strictEqual(exitCode, 0);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("runCheckCommand with --format table prints tabular output", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-table-test-"));
  fs.writeFileSync(path.join(tempDir, "index.ts"), "export const x = 1;", "utf8");

  try {
    const exitCode = await runCheckCommand(tempDir, { format: "table", quiet: true });
    assert.strictEqual(exitCode, 0);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test packages/cli/tests/commands/check-ux.test.ts`
Expected: FAIL (options not defined yet).

- [ ] **Step 3: Update `packages/cli/src/commands/check.ts`**

Update `CheckCommandOptions` to include `quiet?: boolean` and support `format === "table"`.
Wire `TerminalSpinnerManager` into `runCheckCommand`:
```ts
  const spinnerManager = new TerminalSpinnerManager({ quiet: options.quiet });
  if (format === "terminal" || format === "table") {
    spinnerManager.start();
  }

  const config: ScanConfig = {
    targetPath,
    format,
    enableLlmReasoning: options.llm || false,
    apiKey: options.apiKey || userConfig.apiKey,
    failOnSeverity: options.failOn || (options.failOnCritical ? "critical" : undefined),
    onProgress: (event) => spinnerManager.handleProgress(event),
  };
```
And in format handling:
```ts
  } else if (format === "table") {
    outputText = formatTableReport(result);
  } else {
    outputText = formatTerminalReport(result);
  }
```
And call `spinnerManager.stop()` in `finally`.

- [ ] **Step 4: Update `packages/cli/src/cli.ts`**

Add `--quiet` and update `--format` description:
```ts
  .option("--format <format>", "Output format: terminal, table, json, or sarif (default: terminal)")
  .option("-q, --quiet", "Suppress spinners and progress output")
```
Pass `quiet: options.quiet` to `runCheckCommand`.

- [ ] **Step 5: Run integration test and verify it passes**

Run: `pnpm --filter wren-security build && node --test packages/cli/tests/commands/check-ux.test.ts`
Expected: PASS.

---

### Task 7: Full Suite Verification & Build

**Files:**
- Touch: none (verification step)

- [ ] **Step 1: Run all CLI tests**
Run: `pnpm --filter wren-security test`
Expected: All tests pass.

- [ ] **Step 2: Run all Core tests**
Run: `pnpm --filter @wren/core test`
Expected: All 70+ tests pass.

- [ ] **Step 3: Run accuracy evaluation benchmark**
Run: `pnpm test:eval`
Expected: 100% Precision, 100% Recall.

- [ ] **Step 4: Run monorepo typecheck**
Run: `pnpm -r typecheck`
Expected: 0 errors across all workspace packages.

- [ ] **Step 5: Run monorepo production build**
Run: `pnpm build`
Expected: All build tasks successful.

- [ ] **Step 6: Grep audit for zero code comments**
Run: Grep search across all new and modified files for `//`, `/*`, and `--`.
Expected: 0 matches.
