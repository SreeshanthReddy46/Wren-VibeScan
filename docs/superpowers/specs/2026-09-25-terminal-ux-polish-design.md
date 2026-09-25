# Design Specification: Terminal UX & Visual Polish

## 1. Overview & Goals

This specification details the terminal user experience improvements for Wren CLI (`wren check`). It elevates the CLI from a plain text tool to a modern, high-polish developer security utility matching modern terminal design standards (such as Turbo, Prisma, and Vite), while preserving speed and signal discipline.

### Key Objectives
- **Dynamic Multi-Stage Spinners (`ora`)**: Visual progress indicators for file discovery, static pattern analysis, and deep reasoning investigation.
- **Disciplined Severity Palette (`chalk`)**: Color strictly reserved for severity badges (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFO`) and final pass/fail signals.
- **Framed Summary Artifact (`boxen`)**: High-contrast, bordered completion card displaying issue breakdown, file count, and scan duration.
- **Structured Tabular Report (`cli-table3`)**: Alternative `--format table` output for compact overview.
- **CI, Quiet & Color Invariants**: Automatic suppression of animations in non-TTY/CI environments, support for `--quiet`, native `NO_COLOR` compliance, and clean `SIGINT` (Ctrl+C) handling.

---

## 2. Architecture & Data Flow

```
┌────────────────────────────────────────────────────────┐
│                   CLI (check.ts)                       │
│  - Parses flags (--format table, --quiet, etc.)        │
│  - Initializes TerminalSpinnerManager                  │
│  - Captures SIGINT signal                              │
└──────────────────────────┬─────────────────────────────┘
                           │ passes config + onProgress
                           ▼
┌────────────────────────────────────────────────────────┐
│                   @wren/core (runScan)                 │
│  - Discovers files (emits discovery_start / complete)  │
│  - Scans files (emits scan_file / static_complete)     │
│  - Deep reasoning (emits reasoning_start / complete)   │
└──────────────────────────┬─────────────────────────────┘
                           │ returns ScanResult
                           ▼
┌────────────────────────────────────────────────────────┐
│                   Formatters                           │
│  - terminal-formatter.ts: detailed narrative + boxen   │
│  - table-formatter.ts: cli-table3 + boxen              │
│  - json-formatter.ts / sarif-formatter.ts (unchanged)  │
└────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Component Specifications

### 3.1 Progress Bridge (`@wren/shared-types` & `@wren/core`)

#### Event Interface
In `packages/shared-types/src/index.ts`:
```ts
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

In `packages/core/src/index.ts` (`runScan`):
- Call `config.onProgress?.({ stage: "discovery_start" })` before discovery.
- Call `config.onProgress?.({ stage: "discovery_complete", fileCount: files.length, durationMs })`.
- During file analysis, periodically or on each file emit `config.onProgress?.({ stage: "scan_file", current, total, filePath })`.
- Emit `config.onProgress?.({ stage: "static_complete", findingsCount, durationMs })`.
- If LLM reasoning is active, emit `reasoning_start` and `reasoning_complete`.

### 3.2 Terminal Spinner Manager (`packages/cli/src/report/spinner-manager.ts`)

#### Responsibilities
- Encapsulate `ora` instance.
- Determine whether output should be interactive or silent:
  - Enabled if `!options.quiet && !process.env.CI && process.stdout.isTTY !== false && !process.env.NO_SPINNER`.
  - Silent if in CI, non-interactive shell, or `--quiet` passed.
- Methods:
  - `startDiscovery()`: `ora("Discovering files...").start()`
  - `finishDiscovery(count, duration)`: `spinner.succeed("Discovered " + count + " files (" + duration + "ms)")`
  - `updateFileProgress(current, total, file)`: `spinner.text = "Scanning files (" + current + "/" + total + ")..."`
  - `finishStaticScan(findingsCount, duration)`: `spinner.succeed("Static analysis complete (" + duration + "ms)")`
  - `startReasoning(count)`: `ora("Reasoning on " + count + " flagged candidates with Deep Reasoning...").start()`
  - `finishReasoning(duration)`: `spinner.succeed("Investigation complete (" + duration + "ms)")`
  - `stop()`: Halts spinner immediately without output.

#### Graceful SIGINT Handling
- Registers `process.once("SIGINT", ...)` during scan run.
- When triggered, calls `spinnerManager.stop()`, logs `\nScan cancelled by user\n`, and exits with code 130.

### 3.3 Disciplined Severity Palette (`chalk`)

In `packages/cli/src/report/severity-colors.ts`:
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
All contextual metadata (rule ID, file path, line numbers) use uncolored text with `chalk.dim` for prefixes (`at`, `rule:`).

### 3.4 Boxen Framed Summary (`packages/cli/src/report/boxen-summary.ts`)

#### Layout & Behavior
- Uses `boxen` to render a framed card.
- Respects `NO_COLOR`: if `process.env.NO_COLOR` is present, border color is omitted.
- **Clean scan**:
  - Title: `"Scan Passed"`
  - Border color: `"green"`
  - Body:
    `✔ No vulnerabilities found! Your codebase looks safe to deploy.`
    `Scanned ${filesScanned} files in ${durationMs}ms`
- **Vulnerabilities found**:
  - Title: `"Scan Complete"`
  - Border color: highest severity (`red` if critical or high, `yellow` if medium, `blue` if low)
  - Body:
    `${total} issues found`
    `${critical} critical · ${high} high · ${medium} medium · ${low} low`
    `Scanned ${filesScanned} files in ${durationMs}ms`

### 3.5 Tabular Formatter (`packages/cli/src/report/table-formatter.ts`)

#### Layout
- Uses `cli-table3`.
- Added support for `--format table` in CLI options and `OutputFormat = "terminal" | "json" | "sarif" | "table"`.
- Table columns:
  - `Severity` (width ~12)
  - `Rule ID` (width ~16)
  - `Location` (width ~30, formatted as `filePath:startLine`)
  - `Issue` (width ~40, title or message snippet)
- If 0 findings, outputs standard clean message and boxen card.
- Appends the Boxen summary card directly beneath the table.

---

## 4. Dependencies & Bundling Configuration

### Package Updates (`packages/cli/package.json`)
```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "0.123.0",
    "boxen": "7.1.1",
    "cac": "6.7.14",
    "chalk": "5.3.0",
    "cli-table3": "0.6.5",
    "ora": "8.1.1",
    "picocolors": "1.1.1"
  },
  "devDependencies": {
    "@types/cli-table3": "0.6.3"
  }
}
```

### Bundler Configuration (`packages/cli/tsup.config.ts`)
```ts
noExternal: [
  "ora",
  "chalk",
  "boxen",
  "cli-table3",
  "@wren/core",
  "@wren/shared-types"
]
```

---

## 5. Verification Plan

### Automated Unit & Integration Tests
1. **`spinner-manager.test.ts`**:
   - Asserts spinner is disabled when `CI=true`.
   - Asserts spinner is disabled when `quiet=true`.
   - Asserts stage transitions function without throwing in non-TTY environments.
2. **`table-formatter.test.ts`**:
   - Asserts table rows serialize correctly with headers and values.
   - Asserts zero-findings case generates valid output with summary.
3. **`boxen-summary.test.ts`**:
   - Asserts box contains correct numbers and titles.
   - Asserts border colors adapt to highest severity.
   - Asserts `NO_COLOR` environment variable suppresses ANSI color codes in borders.
4. **`check-command.test.ts`**:
   - Asserts `wren check --format table` exits with expected code.
   - Asserts `wren check --quiet` outputs clean minimal text without spinners.
5. **Full Suite**:
   - `pnpm --filter wren-security test`
   - `pnpm --filter @wren/core test`
   - `pnpm test:eval`
   - `pnpm -r typecheck`
   - `pnpm build`

### Behavioral Invariants
- **Zero Code Comments**: No `//`, `/* */`, or `--` comments in any source or test file.
- **Zero Git Commits**: No commits will be created; all changes remain in working directory.
