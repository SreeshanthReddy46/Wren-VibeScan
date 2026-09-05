# Specification: Real Agent Loop for Vulnerability Reasoning

## Overview
Move Wren's LLM reasoning from a static single-shot snippet verdict to an autonomous multi-turn agent loop. The agent loop is structured across 4 phases:
1. **Planner**: Evaluates AST and static findings to determine which findings require contextual codebase investigation.
2. **Investigator**: An autonomous multi-turn loop using Anthropic's native tool-use API to inspect files (`read_file`), search project text/regex (`search_codebase`), and identify usage locations (`get_call_sites`).
3. **Verifier**: Tests the accumulated evidence against the initial hypothesis, confirming true positives or ruling out false positives mitigated elsewhere in the project (e.g. Next.js `middleware.ts` or custom wrappers).
4. **Reporter**: Synthesizes verified findings, generates tailored replacement fix diffs, adjusts severities, and emits standardized `@wren/shared-types` `Finding` objects.

---

## 1. Package Architecture & Dependencies

### Package Location
The agent loop lives inside `@wren/core` under `packages/core/src/agent/`.
This allows both the CLI (`wren check --llm`) and backend web route handlers (`/api/scans`) to execute the agent loop against scanned directories without code duplication.

### Dependencies
- `@anthropic-ai/sdk`: Direct integration with Anthropic Messages API with function calling / tool use.
- Zero heavy framework dependencies (no LangGraph, no CrewAI).

### File Structure
```
packages/core/
├── package.json
└── src/
    ├── index.ts                     # Exports runScan and agent options
    ├── llm-reasoning.ts             # Backward-compatible adapter forwarding to agent loop
    └── agent/
        ├── types.ts                 # Interfaces, tool definitions, execution context
        ├── tools.ts                 # read_file, search_codebase, get_call_sites
        ├── planner.ts               # Triages findings needing contextual investigation
        ├── investigator.ts          # Native Anthropic tool-use loop
        ├── verifier.ts              # Evidence verification & false-positive elimination
        ├── reporter.ts              # Finding enrichment and SuggestedFix creation
        └── loop.ts                  # Pipeline orchestrator
```

---

## 2. Pipeline Stages & Data Flow

```
   Static / AST Findings
            │
            ▼
   ┌──────────────────┐
   │    1. PLANNER    │
   └────────┬─────────┘
            │  (Triage: Deep investigation vs Fast-track confirmation)
            ▼
   ┌──────────────────┐
   │ 2. INVESTIGATOR  │ ◄─── Anthropic Tool-Use Loop (max 4 turns)
   └────────┬─────────┘      Tools: read_file, search_codebase, get_call_sites
            │
            ▼
   ┌──────────────────┐
   │   3. VERIFIER    │ ➔ Evaluate evidence vs hypothesis (mitigated or real?)
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────┐
   │   4. REPORTER    │ ➔ Final findings, plain-English summary, diff fixes
   └──────────────────┘
```

### Phase 1: Planner
- Analyzes the findings produced by static regex matching and AST traversal.
- Triages rules into:
  - **Needs Context Investigation**: e.g., missing authentication guards, unprotected API routes, unsanitized database queries, sensitive data exposure across files.
  - **Self-Contained Findings**: e.g., high-entropy hardcoded secrets (API keys, private keys) which do not require cross-file investigation.
- Outputs an investigation queue.

### Phase 2: Investigator
- For each queued finding, invokes Claude (`claude-3-5-sonnet-latest`, fallback to `claude-3-5-haiku-latest` if configured).
- Declares the 3 codebase tools in the API request.
- Handles `tool_use` blocks emitted by Claude:
  1. Executes the tool locally with sandbox enforcement.
  2. Returns the tool output as a `tool_result` content block.
  3. Continues conversation until Claude completes investigation or hits turn limit (default 4 turns).
- Returns the complete investigation transcript and gathered context.

### Phase 3: Verifier
- Evaluates the accumulated findings with a verification prompt.
- Answers the critical question: *“Does the codebase evidence (such as middleware, router wrappers, or input validators) eliminate or mitigate this vulnerability?”*
- Outcomes:
  - `CONFIRMED`: Real vulnerability verified with evidence.
  - `FALSE_POSITIVE`: Mitigated elsewhere in the codebase.
  - `SEVERITY_ADJUSTED`: Vulnerability exists but impact is altered by existing controls.

### Phase 4: Reporter
- Discards or downgrades false positives.
- For confirmed findings:
  - Appends detailed plain-English reasoning detailing the contextual path.
  - Generates concrete, validated `SuggestedFix` (with unified diff and replacement code).
  - Emits enriched `Finding` compliant with `@wren/shared-types`.

---

## 3. Tool Specifications & Sandboxing

### 1. `read_file`
- **Arguments**:
  - `filePath`: relative path within `targetPath`
  - `startLine` (optional, 1-indexed)
  - `endLine` (optional, 1-indexed)
- **Output**: File contents formatted with line numbers.
- **Constraints**:
  - Rejects any path resolving outside `targetPath` (`path.resolve` validation).
  - Caps at 200 lines per read to preserve token budget.

### 2. `search_codebase`
- **Arguments**:
  - `query`: literal or regex string
  - `fileExtension` (optional, e.g. `.ts`, `.tsx`, `.js`)
  - `isRegex` (optional boolean)
- **Output**: Array of matches containing `filePath`, `lineNumber`, and `lineContent`.
- **Constraints**:
  - Automatically skips ignored directories (`.git`, `node_modules`, `.next`, `dist`).
  - Caps at top 15 results.

### 3. `get_call_sites`
- **Arguments**:
  - `identifier`: function, middleware, or variable name (e.g. `authMiddleware`, `verifyToken`, `db.query`)
- **Output**: List of files and line numbers where the identifier is imported or invoked.
- **Constraints**:
  - Uses AST/regex scanning over source files in `targetPath`.
  - Caps at top 10 call sites.

---

## 4. Resilience, Circuit Breakers & Configuration

### Circuit Breakers
1. **Unset or Invalid API Key**: If `ANTHROPIC_API_KEY` is not present and no `apiKey` is provided in `ScanConfig`, returns static findings immediately with `llmReasoningApplied: false`.
2. **Network Timeout / Abort**: Each finding investigation is wrapped in an `AbortController` (default 25s timeout). If it aborts or errors, the finding defaults to its static verdict with zero scan crashes.
3. **Max Turns Cap**: Hard limit of 4 tool turns per finding prevents infinite loops.

### Configuration Options
```typescript
export interface AgentScanConfig {
  apiKey?: string;
  apiUrl?: string;
  model?: string; // default "claude-3-5-sonnet-latest"
  maxToolTurns?: number; // default 4
  timeoutMs?: number; // default 25000ms
  onProgress?: (event: AgentProgressEvent) => void;
}
```

---

## 5. Verification Plan

1. **Automated Unit Tests**:
   - `tools.test.ts`: Validate `read_file` (including path traversal rejection `../../etc/passwd`), `search_codebase`, and `get_call_sites`.
   - `planner.test.ts`: Verify triage logic distinguishes auth/context findings from standalone secrets.
   - `investigator.test.ts`: Verify tool loop with mocked Anthropic API responses (tool_use -> tool_result -> end_turn).
   - `verifier.test.ts`: Verify false positive detection when middleware mitigates a vulnerability.
2. **Build & Monorepo Typecheck**:
   - `pnpm --filter @wren/core run build`
   - `pnpm typecheck` across all 5 workspace packages.
3. **CLI Integration Test**:
   - Run `wren check` on a fixture repository to verify CLI outputs enriched findings correctly.
