# Interactive Terminal UI (TUI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-screen interactive Terminal UI (TUI) for `wren-security` using Ink (React for the terminal) that launches when invoked with no arguments in interactive terminal sessions, featuring a severity-sorted findings list, code context, agent reasoning, fix diff previews, and hotkeys.

**Architecture:** A modular React/Ink application in `packages/cli/src/ui/` with alternate screen buffer support, windowed left-pane navigation, right-pane detail views with tab toggles (`e` for reasoning, `f` for fix preview), inline ignore workflow (`i`), and clean quit (`q`), bundled into standalone `dist/cli.js`.

**Tech Stack:** React, Ink (`ink@5.0.1`), TypeScript, `tsup`, `node:test`.

## Global Constraints

- Zero code comments (`//`, `/* */`, `--`) across all touched or created source and test files.
- Zero git commits until and unless explicitly instructed by the user.
- Complete strict typing with zero TypeScript compiler errors (`tsc --noEmit`).
- No external runtime peer dependencies required when end users run `npx wren-security`.

---

### Task 1: Add Ink & React Dependencies and Configure Tooling

**Files:**
- Modify: `packages/cli/package.json`
- Modify: `packages/cli/tsconfig.json`
- Modify: `packages/cli/tsup.config.ts`

**Interfaces:**
- Consumes: `package.json`, `tsconfig.json`, `tsup.config.ts`
- Produces: Installed `ink@5.0.1`, `react@^18.2.0`, `@types/react@^18.2.0`, JSX compilation support, and bundling configuration.

- [ ] **Step 1: Install `ink`, `react`, and React types in `packages/cli`**

Run: `pnpm --filter wren-security add ink@5.0.1 react@18.2.0`
Run: `pnpm --filter wren-security add -D @types/react@18.2.0 ink-testing-library`

- [ ] **Step 2: Update `packages/cli/tsconfig.json` to enable React JSX**

Update `packages/cli/tsconfig.json`:
```json
{
  "extends": "../config/tsconfig/node.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "jsx": "react-jsx"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Update `packages/cli/tsup.config.ts` to bundle Ink and React**

Update `packages/cli/tsup.config.ts` to include `"ink"`, `"react"`, `"react-dom"` in `noExternal`:
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
    "ink",
    "react",
    "react-dom",
    "@wren/core",
    "@wren/shared-types",
  ],
});
```

- [ ] **Step 4: Verify build succeeds with new configuration**

Run: `pnpm --filter wren-security build`
Expected: Build success with DTS generated.

---

### Task 2: Screen Buffer & Terminal Lifecycle Helpers

**Files:**
- Create: `packages/cli/src/ui/screen-buffer.ts`
- Create: `packages/cli/tests/ui/screen-buffer.test.ts`

**Interfaces:**
- Consumes: `process.stdout.isTTY`, ANSI escape sequences
- Produces: `enterAlternateScreen(): void`, `exitAlternateScreen(): void`

- [ ] **Step 1: Write test for screen buffer helpers**

Create `packages/cli/tests/ui/screen-buffer.test.ts`:
```ts
import test from "node:test";
import assert from "node:assert/strict";
import { enterAlternateScreen, exitAlternateScreen } from "../../dist/index.js";

test("enterAlternateScreen writes escape sequence when TTY", () => {
  let output = "";
  const mockStream = {
    isTTY: true,
    write: (chunk: string) => {
      output += chunk;
      return true;
    },
  };

  enterAlternateScreen(mockStream as any);
  assert.strictEqual(output.includes("\x1b[?1049h"), true);
});

test("exitAlternateScreen writes restore sequence when TTY", () => {
  let output = "";
  const mockStream = {
    isTTY: true,
    write: (chunk: string) => {
      output += chunk;
      return true;
    },
  };

  exitAlternateScreen(mockStream as any);
  assert.strictEqual(output.includes("\x1b[?1049l"), true);
});

test("screen buffer helpers do nothing when not TTY", () => {
  let output = "";
  const mockStream = {
    isTTY: false,
    write: (chunk: string) => {
      output += chunk;
      return true;
    },
  };

  enterAlternateScreen(mockStream as any);
  exitAlternateScreen(mockStream as any);
  assert.strictEqual(output, "");
});
```

- [ ] **Step 2: Implement `packages/cli/src/ui/screen-buffer.ts`**

Create `packages/cli/src/ui/screen-buffer.ts`:
```ts
export function enterAlternateScreen(stream: NodeJS.WriteStream = process.stdout): void {
  if (stream.isTTY) {
    stream.write("\x1b[?1049h\x1b[H\x1b[?25l");
  }
}

export function exitAlternateScreen(stream: NodeJS.WriteStream = process.stdout): void {
  if (stream.isTTY) {
    stream.write("\x1b[?25h\x1b[?1049l");
  }
}
```

- [ ] **Step 3: Export from `packages/cli/src/index.ts` and verify test passes**

Export in `packages/cli/src/index.ts`:
```ts
export { enterAlternateScreen, exitAlternateScreen } from "./ui/screen-buffer";
```
Run: `pnpm --filter wren-security build && node --test packages/cli/tests/ui/screen-buffer.test.ts`
Expected: PASS.

---

### Task 3: Findings Data Model & Severity Sorting

**Files:**
- Create: `packages/cli/src/ui/model.ts`
- Create: `packages/cli/tests/ui/model.test.ts`

**Interfaces:**
- Consumes: `Finding`, `Severity` from `@wren/shared-types`
- Produces: `sortFindingsBySeverity(findings: Finding[]): Finding[]`, `formatSeverityColor(severity: Severity): string`

- [ ] **Step 1: Write test for findings sorting and filtering**

Create `packages/cli/tests/ui/model.test.ts`:
```ts
import test from "node:test";
import assert from "node:assert/strict";
import type { Finding } from "@wren/shared-types";
import { sortFindingsBySeverity } from "../../dist/index.js";

test("sortFindingsBySeverity orders findings from CRITICAL to INFO", () => {
  const dummyFindings: Finding[] = [
    {
      ruleId: "RULE-LOW",
      severity: "low",
      title: "Low item",
      plainEnglishExplanation: "Low",
      location: { filePath: "a.ts", startLine: 1, endLine: 1 },
    },
    {
      ruleId: "RULE-CRIT",
      severity: "critical",
      title: "Crit item",
      plainEnglishExplanation: "Crit",
      location: { filePath: "b.ts", startLine: 2, endLine: 2 },
    },
    {
      ruleId: "RULE-MED",
      severity: "medium",
      title: "Med item",
      plainEnglishExplanation: "Med",
      location: { filePath: "c.ts", startLine: 3, endLine: 3 },
    },
    {
      ruleId: "RULE-HIGH",
      severity: "high",
      title: "High item",
      plainEnglishExplanation: "High",
      location: { filePath: "d.ts", startLine: 4, endLine: 4 },
    },
  ];

  const sorted = sortFindingsBySeverity(dummyFindings);
  assert.strictEqual(sorted[0].severity, "critical");
  assert.strictEqual(sorted[1].severity, "high");
  assert.strictEqual(sorted[2].severity, "medium");
  assert.strictEqual(sorted[3].severity, "low");
});
```

- [ ] **Step 2: Implement `packages/cli/src/ui/model.ts`**

Create `packages/cli/src/ui/model.ts`:
```ts
import type { Finding, Severity } from "@wren/shared-types";

const SEVERITY_WEIGHTS: Record<Severity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

export function sortFindingsBySeverity(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    const diff = (SEVERITY_WEIGHTS[b.severity] || 0) - (SEVERITY_WEIGHTS[a.severity] || 0);
    if (diff !== 0) return diff;
    return a.location.filePath.localeCompare(b.location.filePath);
  });
}
```

- [ ] **Step 3: Export from `packages/cli/src/index.ts` and verify test passes**

Export in `packages/cli/src/index.ts`:
```ts
export { sortFindingsBySeverity } from "./ui/model";
```
Run: `pnpm --filter wren-security build && node --test packages/cli/tests/ui/model.test.ts`
Expected: PASS.

---

### Task 4: UI Components — Header & Left Pane (FindingsList)

**Files:**
- Create: `packages/cli/src/ui/components/Header.tsx`
- Create: `packages/cli/src/ui/components/FindingsList.tsx`
- Create: `packages/cli/tests/ui/findings-list.test.ts`

**Interfaces:**
- Consumes: `findings: Finding[]`, `selectedIndex: number`, `windowOffset: number`, `targetPath: string`
- Produces: `Header` component, `FindingsList` component

- [ ] **Step 1: Write test for Header & FindingsList components**

Create `packages/cli/tests/ui/findings-list.test.ts`:
```ts
import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { render } from "ink-testing-library";
import type { Finding } from "@wren/shared-types";
import { Header } from "../../src/ui/components/Header";
import { FindingsList } from "../../src/ui/components/FindingsList";

test("Header renders issue count and severity breakdown", () => {
  const findings: Finding[] = [
    {
      ruleId: "R1",
      severity: "critical",
      title: "C1",
      plainEnglishExplanation: "E1",
      location: { filePath: "a.ts", startLine: 1, endLine: 1 },
    },
    {
      ruleId: "R2",
      severity: "high",
      title: "H1",
      plainEnglishExplanation: "E2",
      location: { filePath: "b.ts", startLine: 2, endLine: 2 },
    },
  ];

  const { lastFrame } = render(<Header findings={findings} targetPath="." />);
  const frame = lastFrame() || "";
  assert.strictEqual(frame.includes("Total: 2"), true);
  assert.strictEqual(frame.includes("1 Critical"), true);
  assert.strictEqual(frame.includes("1 High"), true);
});

test("FindingsList renders active item indicator", () => {
  const findings: Finding[] = [
    {
      ruleId: "R1",
      severity: "critical",
      title: "Active Finding",
      plainEnglishExplanation: "E1",
      location: { filePath: "a.ts", startLine: 10, endLine: 10 },
    },
  ];

  const { lastFrame } = render(
    <FindingsList findings={findings} selectedIndex={0} windowOffset={0} maxVisible={10} />
  );
  const frame = lastFrame() || "";
  assert.strictEqual(frame.includes("Active Finding"), true);
  assert.strictEqual(frame.includes("CRITICAL"), true);
  assert.strictEqual(frame.includes("a.ts:10"), true);
});
```

- [ ] **Step 2: Implement `packages/cli/src/ui/components/Header.tsx`**

Create `packages/cli/src/ui/components/Header.tsx`:
```tsx
import React from "react";
import { Box, Text } from "ink";
import type { Finding } from "@wren/shared-types";

export interface HeaderProps {
  findings: Finding[];
  targetPath: string;
}

export function Header({ findings, targetPath }: HeaderProps): React.ReactElement {
  const critical = findings.filter((f) => f.severity === "critical").length;
  const high = findings.filter((f) => f.severity === "high").length;
  const medium = findings.filter((f) => f.severity === "medium").length;
  const low = findings.filter((f) => f.severity === "low").length;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={1}
      marginBottom={1}
    >
      <Box justifyContent="space-between">
        <Text bold color="cyan">
          🦅 Wren Security — Interactive Dashboard
        </Text>
        <Text dimColor>Target: {targetPath}</Text>
      </Box>
      <Box marginTop={0}>
        <Text>
          Total: <Text bold>{findings.length}</Text> issues ·{" "}
          <Text color="red" bold>
            {critical} Critical
          </Text>{" "}
          ·{" "}
          <Text color="yellow">
            {high} High
          </Text>{" "}
          ·{" "}
          <Text color="blue">
            {medium} Medium
          </Text>{" "}
          ·{" "}
          <Text color="gray">
            {low} Low
          </Text>
        </Text>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 3: Implement `packages/cli/src/ui/components/FindingsList.tsx`**

Create `packages/cli/src/ui/components/FindingsList.tsx`:
```tsx
import React from "react";
import { Box, Text } from "ink";
import type { Finding, Severity } from "@wren/shared-types";

export interface FindingsListProps {
  findings: Finding[];
  selectedIndex: number;
  windowOffset: number;
  maxVisible?: number;
}

function getBadgeColor(severity: Severity): string {
  switch (severity) {
    case "critical":
      return "red";
    case "high":
      return "yellow";
    case "medium":
      return "blue";
    case "low":
      return "gray";
    default:
      return "white";
  }
}

export function FindingsList({
  findings,
  selectedIndex,
  windowOffset,
  maxVisible = 12,
}: FindingsListProps): React.ReactElement {
  const visibleFindings = findings.slice(windowOffset, windowOffset + maxVisible);

  if (findings.length === 0) {
    return (
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="green"
        padding={1}
        width="45%"
      >
        <Text color="green" bold>
          ✔ No vulnerabilities detected!
        </Text>
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="gray"
      padding={1}
      width="45%"
    >
      <Box marginBottom={1} justifyContent="space-between">
        <Text bold underline>
          FINDINGS ({selectedIndex + 1}/{findings.length})
        </Text>
      </Box>

      {visibleFindings.map((finding, idx) => {
        const actualIndex = windowOffset + idx;
        const isSelected = actualIndex === selectedIndex;
        const badgeColor = getBadgeColor(finding.severity);

        return (
          <Box key={`${finding.ruleId}-${finding.location.filePath}-${finding.location.startLine}-${idx}`} flexDirection="column" marginBottom={1}>
            <Box>
              <Text color="cyan">{isSelected ? "▶ " : "  "}</Text>
              <Text bold color={badgeColor}>
                [{finding.severity.toUpperCase()}]
              </Text>
              <Text> </Text>
              <Text bold={isSelected} wrap="truncate-end">
                {finding.title}
              </Text>
            </Box>
            <Box paddingLeft={4}>
              <Text dimColor>
                {finding.location.filePath}:{finding.location.startLine}
              </Text>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
```

- [ ] **Step 4: Verify test passes**

Run: `pnpm --filter wren-security build && node --test packages/cli/tests/ui/findings-list.test.ts`
Expected: PASS.

---

### Task 5: UI Components — Right Pane (FindingDetail & Tabs)

**Files:**
- Create: `packages/cli/src/ui/components/FindingDetail.tsx`
- Create: `packages/cli/tests/ui/finding-detail.test.ts`

**Interfaces:**
- Consumes: `finding: Finding | null`, `activeTab: "overview" | "fix"`
- Produces: `FindingDetail` component

- [ ] **Step 1: Write test for FindingDetail component**

Create `packages/cli/tests/ui/finding-detail.test.ts`:
```ts
import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { render } from "ink-testing-library";
import type { Finding } from "@wren/shared-types";
import { FindingDetail } from "../../src/ui/components/FindingDetail";

test("FindingDetail renders overview and reasoning tab", () => {
  const finding: Finding = {
    ruleId: "WREN-SEC-001",
    cwe: "CWE-798",
    severity: "critical",
    title: "Hardcoded API Key",
    plainEnglishExplanation: "An active secret token was found hardcoded.",
    location: {
      filePath: "src/auth.ts",
      startLine: 14,
      endLine: 14,
      snippet: 'const apiKey = "sk-proj-12345";',
    },
  };

  const { lastFrame } = render(<FindingDetail finding={finding} activeTab="overview" />);
  const frame = lastFrame() || "";
  assert.strictEqual(frame.includes("WREN-SEC-001"), true);
  assert.strictEqual(frame.includes("CWE-798"), true);
  assert.strictEqual(frame.includes("src/auth.ts:14"), true);
  assert.strictEqual(frame.includes("An active secret token was found"), true);
  assert.strictEqual(frame.includes('const apiKey = "sk-proj-12345";'), true);
});

test("FindingDetail renders fix preview tab when active", () => {
  const finding: Finding = {
    ruleId: "WREN-SEC-001",
    severity: "critical",
    title: "Hardcoded API Key",
    plainEnglishExplanation: "Explanation",
    location: { filePath: "src/auth.ts", startLine: 14, endLine: 14 },
    fix: {
      description: "Use environment variable",
      diff: '- const apiKey = "sk-proj-12345";\n+ const apiKey = process.env.API_KEY;',
    },
  };

  const { lastFrame } = render(<FindingDetail finding={finding} activeTab="fix" />);
  const frame = lastFrame() || "";
  assert.strictEqual(frame.includes("Use environment variable"), true);
  assert.strictEqual(frame.includes("+ const apiKey = process.env.API_KEY;"), true);
});
```

- [ ] **Step 2: Implement `packages/cli/src/ui/components/FindingDetail.tsx`**

Create `packages/cli/src/ui/components/FindingDetail.tsx`:
```tsx
import React from "react";
import { Box, Text } from "ink";
import type { Finding } from "@wren/shared-types";

export interface FindingDetailProps {
  finding: Finding | null;
  activeTab: "overview" | "fix";
}

export function FindingDetail({ finding, activeTab }: FindingDetailProps): React.ReactElement {
  if (!finding) {
    return (
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="gray"
        padding={1}
        width="55%"
      >
        <Text dimColor>No finding selected.</Text>
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="gray"
      padding={1}
      width="55%"
    >
      <Box marginBottom={1} justifyContent="space-between">
        <Text bold color="cyan">
          {finding.ruleId}
          {finding.cwe ? ` (${finding.cwe})` : ""}
        </Text>
        <Box>
          <Text bold color={activeTab === "overview" ? "green" : "gray"}>
            [e] Overview
          </Text>
          <Text> </Text>
          <Text bold color={activeTab === "fix" ? "green" : "gray"}>
            [f] Fix Preview
          </Text>
        </Box>
      </Box>

      <Box marginBottom={1}>
        <Text bold>{finding.title}</Text>
      </Box>

      <Box marginBottom={1}>
        <Text dimColor>File: </Text>
        <Text underline>
          {finding.location.filePath}:{finding.location.startLine}
        </Text>
      </Box>

      {finding.location.snippet ? (
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor="gray"
          paddingX={1}
          marginBottom={1}
        >
          <Text dimColor>Code Context:</Text>
          <Text color="red">
            {finding.location.startLine} | {finding.location.snippet}
          </Text>
        </Box>
      ) : null}

      {activeTab === "overview" ? (
        <Box flexDirection="column">
          <Text bold color="yellow">
            Explanation & Impact:
          </Text>
          <Text>{finding.plainEnglishExplanation}</Text>
        </Box>
      ) : (
        <Box flexDirection="column">
          <Text bold color="green">
            Suggested Remediation:
          </Text>
          {finding.fix ? (
            <Box flexDirection="column" marginTop={1}>
              <Text italic>{finding.fix.description}</Text>
              {finding.fix.diff ? (
                <Box flexDirection="column" marginTop={1} paddingX={1} borderStyle="single" borderColor="gray">
                  {finding.fix.diff.split("\n").map((line, i) => {
                    const isAdd = line.startsWith("+");
                    const isDel = line.startsWith("-");
                    return (
                      <Text
                        key={i}
                        color={isAdd ? "green" : isDel ? "red" : undefined}
                      >
                        {line}
                      </Text>
                    );
                  })}
                </Box>
              ) : null}
            </Box>
          ) : (
            <Text dimColor>No automated fix patch available for this rule.</Text>
          )}
        </Box>
      )}
    </Box>
  );
}
```

- [ ] **Step 3: Verify test passes**

Run: `pnpm --filter wren-security build && node --test packages/cli/tests/ui/finding-detail.test.ts`
Expected: PASS.

---

### Task 6: UI Components — Status Bar & Ignore Prompt Flow

**Files:**
- Create: `packages/cli/src/ui/components/StatusBar.tsx`
- Create: `packages/cli/src/ui/ignore-handler.ts`
- Create: `packages/cli/tests/ui/status-bar.test.ts`

**Interfaces:**
- Consumes: `ignoreActive: boolean`, `feedback: string | null`, `appendIgnoreEntry(filePath: string, ruleId: string): void`
- Produces: `StatusBar` component, `handleIgnoreAction` helper

- [ ] **Step 1: Write test for status bar and ignore helper**

Create `packages/cli/tests/ui/status-bar.test.ts`:
```ts
import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { render } from "ink-testing-library";
import { StatusBar } from "../../src/ui/components/StatusBar";
import { appendIgnoreRule } from "../../src/ui/ignore-handler";

test("StatusBar renders keyboard shortcut legend", () => {
  const { lastFrame } = render(<StatusBar ignoreActive={false} feedback={null} />);
  const frame = lastFrame() || "";
  assert.strictEqual(frame.includes("[↑/↓] Navigate"), true);
  assert.strictEqual(frame.includes("[e] Explain"), true);
  assert.strictEqual(frame.includes("[f] Fix"), true);
  assert.strictEqual(frame.includes("[i] Ignore"), true);
  assert.strictEqual(frame.includes("[q] Quit"), true);
});

test("StatusBar renders ignore prompt when active", () => {
  const { lastFrame } = render(<StatusBar ignoreActive={true} feedback={null} />);
  const frame = lastFrame() || "";
  assert.strictEqual(frame.includes("[s] Session only"), true);
  assert.strictEqual(frame.includes("[p] Persist to .wrenignore"), true);
  assert.strictEqual(frame.includes("[Esc] Cancel"), true);
});

test("appendIgnoreRule writes rule and path entry to .wrenignore", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-ignore-test-"));
  try {
    appendIgnoreRule(tempDir, "src/key.ts", "WREN-SEC-001");
    const content = fs.readFileSync(path.join(tempDir, ".wrenignore"), "utf8");
    assert.strictEqual(content.includes("src/key.ts"), true);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Implement `packages/cli/src/ui/ignore-handler.ts`**

Create `packages/cli/src/ui/ignore-handler.ts`:
```ts
import * as fs from "fs";
import * as path from "path";

export function appendIgnoreRule(targetDir: string, filePath: string, ruleId: string): void {
  const ignoreFilePath = path.join(targetDir, ".wrenignore");
  const normalizedPath = filePath.replace(/\\/g, "/");
  const lineToAppend = `${normalizedPath}\n`;

  if (fs.existsSync(ignoreFilePath)) {
    const existing = fs.readFileSync(ignoreFilePath, "utf8");
    if (!existing.includes(normalizedPath)) {
      fs.appendFileSync(ignoreFilePath, lineToAppend, "utf8");
    }
  } else {
    fs.writeFileSync(ignoreFilePath, lineToAppend, "utf8");
  }
}
```

- [ ] **Step 3: Implement `packages/cli/src/ui/components/StatusBar.tsx`**

Create `packages/cli/src/ui/components/StatusBar.tsx`:
```tsx
import React from "react";
import { Box, Text } from "ink";

export interface StatusBarProps {
  ignoreActive: boolean;
  feedback: string | null;
}

export function StatusBar({ ignoreActive, feedback }: StatusBarProps): React.ReactElement {
  return (
    <Box
      flexDirection="row"
      justifyContent="space-between"
      borderStyle="single"
      borderColor="cyan"
      paddingX={1}
      marginTop={1}
    >
      {ignoreActive ? (
        <Box>
          <Text bold color="yellow">
            Ignore finding?{" "}
          </Text>
          <Text bold color="green">
            [s] Session only
          </Text>
          <Text> · </Text>
          <Text bold color="cyan">
            [p] Persist to .wrenignore
          </Text>
          <Text> · </Text>
          <Text color="gray">
            [Esc] Cancel
          </Text>
        </Box>
      ) : (
        <Box>
          <Text dimColor>[↑/↓] Navigate</Text>
          <Text dimColor> · </Text>
          <Text dimColor>[e] Explain</Text>
          <Text dimColor> · </Text>
          <Text dimColor>[f] Fix</Text>
          <Text dimColor> · </Text>
          <Text dimColor>[i] Ignore</Text>
          <Text dimColor> · </Text>
          <Text dimColor>[q] Quit</Text>
        </Box>
      )}

      {feedback ? (
        <Box>
          <Text bold color="green">
            {feedback}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
}
```

- [ ] **Step 4: Verify test passes**

Run: `pnpm --filter wren-security build && node --test packages/cli/tests/ui/status-bar.test.ts`
Expected: PASS.

---

### Task 7: Root TUI App & Screen Buffer Integration

**Files:**
- Create: `packages/cli/src/ui/App.tsx`
- Create: `packages/cli/src/ui/index.tsx`
- Create: `packages/cli/tests/ui/app.test.ts`

**Interfaces:**
- Consumes: `runScan`, `Header`, `FindingsList`, `FindingDetail`, `StatusBar`, `enterAlternateScreen`, `exitAlternateScreen`
- Produces: `startInteractiveTui(targetPath: string): Promise<number>`

- [ ] **Step 1: Write integration test for App component**

Create `packages/cli/tests/ui/app.test.ts`:
```ts
import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { render } from "ink-testing-library";
import type { Finding } from "@wren/shared-types";
import { App } from "../../src/ui/App";

test("App renders initial scan results and supports keyboard inputs", () => {
  const initialFindings: Finding[] = [
    {
      ruleId: "R1",
      severity: "critical",
      title: "Crit Issue",
      plainEnglishExplanation: "Explanation 1",
      location: { filePath: "a.ts", startLine: 1, endLine: 1 },
    },
    {
      ruleId: "R2",
      severity: "medium",
      title: "Med Issue",
      plainEnglishExplanation: "Explanation 2",
      location: { filePath: "b.ts", startLine: 2, endLine: 2 },
    },
  ];

  const { lastFrame, stdin } = render(
    <App targetPath="." initialFindings={initialFindings} onExit={() => {}} />
  );

  let frame = lastFrame() || "";
  assert.strictEqual(frame.includes("Crit Issue"), true);

  stdin.write("f");
  frame = lastFrame() || "";
  assert.strictEqual(frame.includes("Fix Preview"), true);
});
```

- [ ] **Step 2: Implement `packages/cli/src/ui/App.tsx`**

Create `packages/cli/src/ui/App.tsx`:
```tsx
import React, { useState, useEffect } from "react";
import { Box, Text, useInput, useApp } from "ink";
import type { Finding } from "@wren/shared-types";
import { Header } from "./components/Header";
import { FindingsList } from "./components/FindingsList";
import { FindingDetail } from "./components/FindingDetail";
import { StatusBar } from "./components/StatusBar";
import { sortFindingsBySeverity } from "./model";
import { appendIgnoreRule } from "./ignore-handler";

export interface AppProps {
  targetPath: string;
  initialFindings: Finding[];
  onExit: (exitCode: number) => void;
}

export function App({ targetPath, initialFindings, onExit }: AppProps): React.ReactElement {
  const { exit } = useApp();
  const [findings, setFindings] = useState<Finding[]>(() => sortFindingsBySeverity(initialFindings));
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"overview" | "fix">("overview");
  const [ignoreActive, setIgnoreActive] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [windowOffset, setWindowOffset] = useState<number>(0);

  const maxVisible = 10;
  const currentFinding = findings[selectedIndex] || null;

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  useInput((input, key) => {
    if (ignoreActive) {
      if (input === "s") {
        if (currentFinding) {
          const updated = findings.filter((_, i) => i !== selectedIndex);
          setFindings(updated);
          if (selectedIndex >= updated.length && updated.length > 0) {
            setSelectedIndex(updated.length - 1);
          }
          setFeedback(`Ignored for session: ${currentFinding.title}`);
        }
        setIgnoreActive(false);
      } else if (input === "p") {
        if (currentFinding) {
          appendIgnoreRule(targetPath, currentFinding.location.filePath, currentFinding.ruleId);
          const updated = findings.filter((_, i) => i !== selectedIndex);
          setFindings(updated);
          if (selectedIndex >= updated.length && updated.length > 0) {
            setSelectedIndex(updated.length - 1);
          }
          setFeedback(`Saved to .wrenignore: ${currentFinding.title}`);
        }
        setIgnoreActive(false);
      } else if (key.escape) {
        setIgnoreActive(false);
      }
      return;
    }

    if (key.upArrow || input === "k") {
      if (selectedIndex > 0) {
        const nextIndex = selectedIndex - 1;
        setSelectedIndex(nextIndex);
        if (nextIndex < windowOffset) {
          setWindowOffset(nextIndex);
        }
      }
    } else if (key.downArrow || input === "j") {
      if (selectedIndex < findings.length - 1) {
        const nextIndex = selectedIndex + 1;
        setSelectedIndex(nextIndex);
        if (nextIndex >= windowOffset + maxVisible) {
          setWindowOffset(nextIndex - maxVisible + 1);
        }
      }
    } else if (input === "e") {
      setActiveTab("overview");
    } else if (input === "f") {
      setActiveTab("fix");
    } else if (input === "i") {
      if (findings.length > 0) {
        setIgnoreActive(true);
      }
    } else if (input === "q" || (key.ctrl && input === "c")) {
      const hasCritical = findings.some((f) => f.severity === "critical");
      const exitCode = hasCritical ? 1 : 0;
      exit();
      onExit(exitCode);
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Header findings={findings} targetPath={targetPath} />
      <Box flexDirection="row" flexGrow={1}>
        <FindingsList
          findings={findings}
          selectedIndex={selectedIndex}
          windowOffset={windowOffset}
          maxVisible={maxVisible}
        />
        <FindingDetail finding={currentFinding} activeTab={activeTab} />
      </Box>
      <StatusBar ignoreActive={ignoreActive} feedback={feedback} />
    </Box>
  );
}
```

- [ ] **Step 3: Implement `packages/cli/src/ui/index.tsx`**

Create `packages/cli/src/ui/index.tsx`:
```tsx
import React from "react";
import { render } from "ink";
import { runScan } from "@wren/core";
import { App } from "./App";
import { enterAlternateScreen, exitAlternateScreen } from "./screen-buffer";

export async function startInteractiveTui(targetPath: string = "."): Promise<number> {
  enterAlternateScreen();

  const scanResult = await runScan({
    targetPath,
    format: "terminal",
  });

  return new Promise<number>((resolve) => {
    let resolved = false;

    const cleanupAndResolve = (code: number) => {
      if (!resolved) {
        resolved = true;
        exitAlternateScreen();
        resolve(code);
      }
    };

    const instance = render(
      <App
        targetPath={targetPath}
        initialFindings={scanResult.findings}
        onExit={(code) => {
          cleanupAndResolve(code);
        }}
      />
    );

    instance.waitUntilExit().then(() => {
      cleanupAndResolve(0);
    });
  });
}
```

- [ ] **Step 4: Verify test passes**

Run: `pnpm --filter wren-security build && node --test packages/cli/tests/ui/app.test.ts`
Expected: PASS.

---

### Task 8: Wire Zero-Argument TUI Dispatch in CLI

**Files:**
- Modify: `packages/cli/src/cli.ts`
- Modify: `packages/cli/src/index.ts`
- Create: `packages/cli/tests/commands/cli-dispatch.test.ts`

**Interfaces:**
- Consumes: `process.argv`, `process.stdout.isTTY`, `startInteractiveTui`
- Produces: Seamless launch of TUI on bare command invocation

- [ ] **Step 1: Write CLI dispatch test**

Create `packages/cli/tests/commands/cli-dispatch.test.ts`:
```ts
import test from "node:test";
import assert from "node:assert/strict";
import { shouldLaunchTui } from "../../dist/index.js";

test("shouldLaunchTui returns true for empty args in interactive TTY", () => {
  const result = shouldLaunchTui([], true, false);
  assert.strictEqual(result, true);
});

test("shouldLaunchTui returns false when CI is set", () => {
  const result = shouldLaunchTui([], true, true);
  assert.strictEqual(result, false);
});

test("shouldLaunchTui returns false when stdout is not TTY", () => {
  const result = shouldLaunchTui([], false, false);
  assert.strictEqual(result, false);
});

test("shouldLaunchTui returns false when subcommand check is provided", () => {
  const result = shouldLaunchTui(["check"], true, false);
  assert.strictEqual(result, false);
});

test("shouldLaunchTui returns false when help or version flags are passed", () => {
  assert.strictEqual(shouldLaunchTui(["--help"], true, false), false);
  assert.strictEqual(shouldLaunchTui(["-v"], true, false), false);
});
```

- [ ] **Step 2: Implement `shouldLaunchTui` in `packages/cli/src/ui/index.tsx`**

Add to `packages/cli/src/ui/index.tsx`:
```tsx
export function shouldLaunchTui(
  argv: string[],
  isTTY: boolean = Boolean(process.stdout.isTTY),
  isCI: boolean = Boolean(process.env.CI)
): boolean {
  if (!isTTY || isCI) return false;
  const filtered = argv.filter((arg) => !arg.startsWith("-"));
  const flags = argv.filter((arg) => arg.startsWith("-"));
  if (flags.includes("--help") || flags.includes("-h") || flags.includes("--version") || flags.includes("-v")) {
    return false;
  }
  return filtered.length === 0 && flags.length === 0;
}
```

- [ ] **Step 3: Update `packages/cli/src/cli.ts`**

Update `packages/cli/src/cli.ts` to check `shouldLaunchTui` before parsing commands:
```ts
import { cac } from "cac";
import pc from "picocolors";
import { runCheckCommand } from "./commands/check";
import { runFixCommand } from "./commands/fix";
import { runInitCommand } from "./commands/init";
import { runLoginCommand } from "./commands/login";
import { runLogoutCommand } from "./commands/logout";
import { reportCrash } from "./telemetry/crash-reporter";
import { ExitCode } from "./utils/exit-codes";
import { startInteractiveTui, shouldLaunchTui } from "./ui";

function handleCliError(error: unknown): void {
  reportCrash(error);
  const isDebug = Boolean(process.env.DEBUG || process.env.WREN_VERBOSE);
  if (isDebug && error instanceof Error && error.stack) {
    console.error(error.stack);
  } else {
    console.error(pc.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
  }
  process.exit(ExitCode.FATAL_ERROR);
}

const args = process.argv.slice(2);
if (shouldLaunchTui(args)) {
  startInteractiveTui(".")
    .then((code) => process.exit(code))
    .catch((err) => handleCliError(err));
} else {
  const cli = cac("wren-security");

  cli
    .command("[path]", "Scan codebase for AI-generated security vulnerabilities")
    .alias("check")
    .alias("scan")
    .option("--fail-on-critical", "Exit with code 1 if critical vulnerabilities are found")
    .option("--fail-on <severity>", "Exit with code 1 if issues at or above severity are found (critical, high, medium)")
    .option("--format <format>", "Output format: terminal, table, json, or sarif (default: terminal)")
    .option("-q, --quiet", "Suppress spinners and progress output")
    .option("--llm", "Enable LLM reasoning enrichment")
    .option("--async", "Submit scan asynchronously and return immediately with dashboard link")
    .option("-o, --output <file>", "Write report to output file")
    .option("--api-key <key>", "Wren or Claude API key")
    .action(async (targetPath = ".", options) => {
      try {
        const exitCode = await runCheckCommand(targetPath, {
          failOnCritical: options.failOnCritical,
          failOn: options.failOn,
          format: options.format,
          llm: options.llm,
          output: options.output,
          apiKey: options.apiKey,
          async: options.async,
          quiet: options.quiet,
        });
        process.exit(exitCode);
      } catch (error) {
        handleCliError(error);
      }
    });

  cli
    .command("init", "Initialize Wren configuration (.wrenignore and .wrenrc.json)")
    .action(() => {
      try {
        runInitCommand();
      } catch (error) {
        handleCliError(error);
      }
    });

  cli
    .command("login [token]", "Authenticate local CLI with Wren Cloud")
    .action(async (token) => {
      try {
        await runLoginCommand(token);
      } catch (error) {
        handleCliError(error);
      }
    });

  cli
    .command("logout", "Log out and remove stored Wren credentials")
    .action(() => {
      try {
        runLogoutCommand();
      } catch (error) {
        handleCliError(error);
      }
    });

  cli
    .command("fix [findingId]", "Generate and apply remediation patches or open GitHub PRs")
    .option("--dry-run", "Preview the patch without modifying any files")
    .option("--apply-locally", "Apply the patch directly to local working tree")
    .option("--open-pr", "Dispatch autonomous remediation agent to open a pull request")
    .option("--repo <repo>", "Target GitHub repository (owner/repo)")
    .option("--file <file>", "Target file path to patch")
    .action(async (findingId, options) => {
      try {
        const exitCode = await runFixCommand(findingId, {
          dryRun: options.dryRun,
          applyLocally: options.applyLocally,
          openPr: options.openPr,
          repo: options.repo,
          file: options.file,
        });
        process.exit(exitCode);
      } catch (error) {
        handleCliError(error);
      }
    });

  let version = "2.1.2";
  try {
    version = require("../package.json").version;
  } catch {}

  cli.help();
  cli.version(version);

  try {
    cli.parse();
  } catch (error) {
    handleCliError(error);
  }
}
```

- [ ] **Step 4: Export from `packages/cli/src/index.ts` and verify test passes**

Export in `packages/cli/src/index.ts`:
```ts
export { startInteractiveTui, shouldLaunchTui } from "./ui";
```
Run: `pnpm --filter wren-security build && node --test packages/cli/tests/commands/cli-dispatch.test.ts`
Expected: PASS.

---

### Task 9: Full Monorepo Verification & Audit

**Files:**
- Verification step across repository

- [ ] **Step 1: Run all CLI tests**
Run: `pnpm --filter wren-security test`
Expected: 50+ passing tests.

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
