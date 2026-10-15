# Design Specification: Interactive Terminal UI (TUI) with Ink

## 1. Overview & Goals

This specification details the interactive full-screen Terminal User Interface (TUI) for Wren CLI (`wren-security`). Built with Ink (React for the terminal), running `wren-security` with no arguments opens a rich, split-pane dashboard instead of dumping static text into the terminal scrollback.

### Key Objectives
- **Zero-Argument Default**: Running `wren-security` (or `wren`) with no arguments in an interactive terminal (TTY) launches the interactive full-screen TUI.
- **Split-Pane Layout**:
  - **Left Pane**: Findings list sorted strictly by severity (`CRITICAL` -> `HIGH` -> `MEDIUM` -> `LOW` -> `INFO`) with live selection cursor and windowed scrolling.
  - **Right Pane**: Detailed view of the selected finding containing file path, line numbers, code snippet with syntax context, and tabbed views for agent reasoning vs fix diff preview.
- **Keyboard Shortcuts**:
  - `↑` / `k` and `↓` / `j`: Navigate findings list.
  - `e`: Switch to Overview & Reasoning tab.
  - `f`: Switch to Fix Preview tab (showing colorized git diff).
  - `i`: Open ignore prompt (`[s] Session only`, `[p] Persist to .wrenignore`, `[Esc] Cancel`).
  - `q` / `Ctrl+C`: Clean exit, restoring normal terminal buffer.
- **Alternate Screen Buffer**: Uses terminal alternate screen buffer (`\x1b[?1049h` / `\x1b[?1049l`) so the user's terminal history is left completely clean upon quitting.
- **CI & Non-TTY Graceful Fallback**: If running in CI or non-TTY environment, running with no arguments falls back to the headless standard scan.

---

## 2. Architecture & Component Decomposition

```
┌────────────────────────────────────────────────────────┐
│                   CLI Entrypoint (cli.ts)              │
│  - Checks process.argv.slice(2).length === 0           │
│  - If TTY & !CI: startInteractiveTui(".")              │
│  - Else: runCheckCommand(".", options)                 │
└──────────────────────────┬─────────────────────────────┘
                           │ launches Ink app
                           ▼
┌────────────────────────────────────────────────────────┐
│                   App.tsx (Root Component)             │
│  - State: scanning -> dashboard -> exiting             │
│  - Captures terminal resize                            │
│  - Manages selected finding & active tab               │
└──────────────┬───────────────────────────┬─────────────┘
               │                           │
               ▼                           ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│  FindingsList (Left)     │  │  FindingDetail (Right)   │
│  - Sorted by severity    │  │  - Location & Rule ID    │
│  - Windowed scrolling    │  │  - Code context snippet  │
│  - Selection indicator   │  │  - [e] Reasoning / [f] Fix│
└──────────────────────────┘  └──────────────────────────┘
               │                           │
               └─────────────┬─────────────┘
                             ▼
┌────────────────────────────────────────────────────────┐
│                   StatusBar.tsx                        │
│  - Shortcut guide: [↑/↓] [e] [f] [i] [q]               │
│  - Inline ignore prompt & feedback message             │
└────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Component Specifications

### 3.1 Dependencies & Bundling
- `ink`: `^5.0.0`
- `react`: `^18.2.0` (or `^19.0.0` compatible with Ink 5)
- `@types/react`: `^18.2.0` or `^19.0.0`
- `tsup.config.ts`: Add `ink`, `react`, `react-dom` to `noExternal` to bundle all runtime dependencies into self-contained `dist/cli.js`.
- `tsconfig.json`: Add `"jsx": "react-jsx"`.

### 3.2 State Management
```ts
export interface TuiFindingItem extends Finding {
  id: string;
}

export interface TuiState {
  status: "scanning" | "ready" | "error";
  scanResult: ScanResult | null;
  findings: TuiFindingItem[];
  selectedIndex: number;
  activeTab: "overview" | "fix";
  ignorePrompt: {
    active: boolean;
    finding: TuiFindingItem | null;
  } | null;
  ignoredFindingIds: Set<string>;
  windowOffset: number;
  errorMessage: string | null;
}
```

### 3.3 Keyboard Actions & Event Handling
- Handled via Ink's `useInput((input, key) => ...)`:
  - `key.upArrow` / `input === 'k'`: Decrement `selectedIndex` (min 0).
  - `key.downArrow` / `input === 'j'`: Increment `selectedIndex` (max `findings.length - 1`).
  - `input === 'e'`: Set `activeTab = 'overview'`.
  - `input === 'f'`: Set `activeTab = 'fix'`.
  - `input === 'i'`: Open ignore confirmation prompt.
  - When ignore prompt is active:
    - `input === 's'`: Session ignore (remove from active list, re-index).
    - `input === 'p'`: Append ignore rule/file to `.wrenignore` and remove from active list.
    - `key.escape`: Dismiss prompt.
  - `input === 'q'` or `key.ctrl && input === 'c'`: Exit application.

### 3.4 Terminal Buffer Lifecycle
```ts
export function enterAlternateScreen(): void {
  if (process.stdout.isTTY) {
    process.stdout.write("\x1b[?1049h\x1b[H");
  }
}

export function exitAlternateScreen(): void {
  if (process.stdout.isTTY) {
    process.stdout.write("\x1b[?1049l");
  }
}
```

---

## 4. Verification Plan

1. **Unit & Component Tests**:
   - `packages/cli/tests/ui/findings-list.test.ts`: Verify severity sorting and selection cursor navigation.
   - `packages/cli/tests/ui/finding-detail.test.ts`: Verify code snippet formatting and reasoning/fix tab toggling.
   - `packages/cli/tests/ui/ignore-flow.test.ts`: Verify session ignore and `.wrenignore` persistence.
2. **CLI Entrypoint Test**:
   - Verify bare `wren` launches TUI in TTY and falls back to text scan in non-TTY/CI.
3. **Full Monorepo Suite**:
   - `pnpm --filter wren-security test`
   - `pnpm -r typecheck`
   - `pnpm build`
4. **Behavioral Invariants**:
   - Zero comments (`//`, `/* */`, `--`) across all code and test files.
