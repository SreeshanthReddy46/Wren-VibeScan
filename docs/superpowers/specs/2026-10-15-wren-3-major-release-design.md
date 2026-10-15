# Design Specification: Wren 3.0 Major Release

## 1. Overview & Goals

Wren 3.0 represents a major architectural elevation of the security scanner CLI, transforming it into an interactive developer utility with live LLM investigation visibility, safe interactive remediation, file watch mode, and persistent ignore memory.

### Key Objectives
1. **Live Investigation View**: Transparent multi-step execution view showing tool calls (`read_file`, `search_codebase`, `get_call_sites`) and verdict live in the terminal and TUI.
2. **Interactive `wren fix` with Diff Preview**: Colorized unified diff preview with explicit `[y/n/q]` confirmation before writing any changes to disk.
3. **Watch Mode (`wren watch`)**: Real-time incremental file watcher re-scanning modified files on save and maintaining a live dashboard.
4. **Structured Ignore Memory (`.wren/ignore.json`)**: Persistent JSON store recording ignored rules with file paths, hashes, and reasons, with auto-migration from legacy `.wrenignore`.
5. **Semver 3.0.0 & Configuration Relocation**:
   - Version bump to `3.0.0`.
   - Bare `wren-security` launches full-screen Ink TUI by default in interactive TTY.
   - Project configuration relocated to `.wren/` directory.

---

## 2. Architecture & Subsystems

```
┌────────────────────────────────────────────────────────┐
│                   CLI Entrypoint (cli.ts)              │
│  - Bare command in TTY -> startInteractiveTui(".")     │
│  - wren check -> headless / CI scan                    │
│  - wren fix [findingId] -> interactive diff preview    │
│  - wren watch -> incremental change monitoring         │
└──────────────────────────┬─────────────────────────────┘
                           │
       ┌───────────────────┼───────────────────┐
       ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Agent Loop  │    │  Ignore Store│    │ Watch Engine │
│  - Live step │    │  - .wren/    │    │ - Debounce   │
│    streaming │    │    ignore.json│    │ - Changed AST│
│  - Verdicts  │    │  - Migration │    │   rescan     │
└──────────────┘    └──────────────┘    └──────────────┘
```

---

## 3. Subsystem Specifications

### 3.1 Live Investigation View
- **Event Types**:
  - `investigation_start`: Emitted when reasoning starts on a candidate finding.
  - `investigation_step`: Emitted after each tool invocation with formatted tool name and summary:
    - `→ read_file  <filePath>`
    - `→ search     "<query>" (<count> matches)`
    - `→ call_sites <symbol> (<count> sites)`
  - `investigation_verdict`: Emitted when Claude concludes with final verdict, severity badge, and 1-line reason:
    - `→ verdict    <SEVERITY> · <reason>`
- **Output Interfaces**:
  - In `TerminalSpinnerManager`: Formats step arrows with disciplined colors.
  - In `App.tsx` (TUI): Renders live investigation step rows in the detail pane.

### 3.2 Interactive `wren fix`
- **Confirmation Loop**:
  - `wren fix <id>` or `wren fix` (sequential batch review).
  - Displays colorized diff: cyan `@@`, red `-`, green `+`.
  - Prompts: `Apply patch to <filePath>? [y/n/q]`.
  - Keys:
    - `y`: Writes patched content to disk via `fs.writeFileSync`.
    - `n`: Skips current finding without modifying disk.
    - `q`: Aborts fix loop.
  - `--yes` (`-y`): Bypasses prompt for headless CI usage.

### 3.3 Watch Mode (`wren watch`)
- Monitors workspace files matching scan extensions (`.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.json`, `.env*`).
- Ignores `.git/`, `node_modules/`, `dist/`, `.wren/`.
- Debounces file events by 200ms.
- On file change:
  - Clears terminal console.
  - Re-scans modified file.
  - Merges new findings into cached project baseline.
  - Renders timestamped summary card: `[Watching for changes... Last scan: HH:MM:SS · X issues found]`.

### 3.4 Structured Ignore Memory (`.wren/ignore.json`)
- **Schema**:
  ```json
  {
    "version": "1.0.0",
    "ignores": [
      {
        "id": "ign-1",
        "ruleId": "WREN-SEC-001",
        "filePath": "src/api.ts",
        "reason": "Test fixture / internal mock",
        "ignoredAt": "2026-10-15T13:40:00.000Z"
      }
    ]
  }
  ```
- **Preset Reasons**:
  1. False positive / intentional pattern
  2. Test fixture / internal mock
  3. Mitigated by external boundary / WAF
  4. Custom write-in
- **Legacy Migration**:
  - If `.wrenignore` exists and `.wren/ignore.json` does not exist:
  - Parses `.wrenignore` lines.
  - Generates `.wren/ignore.json` entries with reason `"Migrated from .wrenignore"`.

---

## 4. Verification Plan

1. **Unit & Integration Tests**:
   - `packages/cli/tests/engine/live-investigation.test.ts`: Verify trace streaming events.
   - `packages/cli/tests/commands/fix-interactive.test.ts`: Verify diff display and confirmation prompts.
   - `packages/cli/tests/commands/watch.test.ts`: Verify incremental watch debouncing and re-scanning.
   - `packages/cli/tests/ignore/ignore-store.test.ts`: Verify `.wren/ignore.json` CRUD and `.wrenignore` migration.
2. **Full Monorepo Suite**:
   - `pnpm --filter wren-security test`
   - `pnpm --filter @wren/core test`
   - `pnpm test:eval`
   - `pnpm -r typecheck`
   - `pnpm build`
3. **Behavioral Invariants**:
   - Zero comments (`//`, `/* */`, `--`) across all code and test files.
   - Zero git commits created.
