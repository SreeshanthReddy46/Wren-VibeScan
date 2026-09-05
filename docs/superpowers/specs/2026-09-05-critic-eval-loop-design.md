# Specification: Critic / Eval Loop & Agent Tracing Engine

## 1. Overview & Objectives
Wren VibeScan incorporates an internal **Critic/Judge eval loop** and **observability trace collector** directly into the agent pipeline. Inspired by eval discipline from Lucida, this ensures every agent verdict is independently scored against a rigorous rubric before being shown to users, while logging every reasoning step as debugging and prompt-optimization data.

- **Independent Second-Pass Judge**: Every candidate finding verdict from the `Verifier` is scrutinized by a dedicated `CriticJudge` model pass.
- **Strict Scoring Rubric**: Scores findings on **Evidence Quality** (0.0 – 1.0), **False-Positive Risk** (0.0 – 1.0), and **Confidence** (0.0 – 1.0).
- **Automated Overrule & Downgrade**: If evidence quality is insufficient (< 0.70) or false-positive risk is high (> 0.50), the Critic overrules the verdict to `FALSE_POSITIVE` or `INCONCLUSIVE`, preventing false alarms from reaching the user.
- **Deep Observability (`agent_traces`)**: Logs the complete chain-of-thought, tool invocations, inputs, outputs, judge scoring, and execution durations for every agent decision.
- **Dual Persistence**: Persists traces to PostgreSQL / Supabase `agent_traces` table and locally to `.wren/traces/<scan-id>.json` for offline/CLI execution.
- **Interactive Web Inspector**: Expandable "Reasoning Trace & Rubric" drawer in the Web Dashboard allowing developers to inspect judge decisions and evidence citations.

---

## 2. Architecture & Data Flow

```
   ┌────────────────────────────────────────────────────────────────────────┐
   │                            Scanner Engine                              │
   └───────────────────────────────────┬────────────────────────────────────┘
                                       │
                                       ▼
                             [Phase 1: Planner]  ───────► [Trace: Planner]
                                       │
                                       ▼
                          [Phase 2: Investigator] ──────► [Trace: Investigator]
                                       │
                                       ▼
                            [Phase 3: Verifier]   ──────► [Trace: Verifier]
                                       │
                                       ▼
                       ┌───────────────────────────────┐
                       │      Phase 4: Critic Judge    │
                       └───────────────┬───────────────┘
                                       │
             ┌─────────────────────────┴─────────────────────────┐
             ▼                                                   ▼
  [Passes Rubric Criteria]                           [Fails Rubric Criteria]
  - Evidence Quality >= 0.70                         - Evidence Quality < 0.70 OR
  - False-Positive Risk <= 0.50                      - False-Positive Risk > 0.50
             │                                                   │
             ▼                                                   ▼
  [Verdict Confirmed]                                [Overruled / Downgraded]
  Enrich finding with Critic Rubric                  Mark FALSE_POSITIVE / INCONCLUSIVE
             │                                                   │
             └─────────────────────────┬─────────────────────────┘
                                       │
                                       ▼
                            [Trace: Critic Judge]
                                       │
                                       ▼
                           [Phase 5: Reporter]   ───────► [Trace: Reporter]
                                       │
                                       ▼
                      ┌─────────────────────────────────┐
                      │    Dual Trace Persistence       │
                      │ 1. PostgreSQL: agent_traces     │
                      │ 2. Local: .wren/traces/<id>.json│
                      └─────────────────────────────────┘
```

---

## 3. Critic Scoring Rubric & Overrule Invariants

The Critic evaluates findings against a standardized 3-dimensional rubric:

| Rubric Dimension | Range | Description | Acceptance Threshold |
|---|---|---|---|
| **Evidence Quality** | `0.0 – 1.0` | Checks whether the agent verified concrete call sites, configuration, or sanitization functions vs. making assumptions based solely on local snippets. | `>= 0.70` |
| **False-Positive Risk** | `0.0 – 1.0` | Estimates the probability that framework controls (e.g. Next.js router isolation, ORM prepared statements, CSRF tokens) neutralize the vulnerability. | `<= 0.50` |
| **Confidence Score** | `0.0 – 1.0` | Mathematical conviction in the final classification. | `>= 0.75` |

### Overrule Policy
If `evidenceQuality < 0.70` OR `falsePositiveRisk > 0.50`:
1. The verdict is automatically overridden to `FALSE_POSITIVE` (or `INCONCLUSIVE`).
2. The finding is marked `is_suppressed = true` and filtered out by `Reporter` so it does not trigger build failures or developer fatigue.
3. The reason is explicitly documented in the trace:
   `[Critic Overrule: Insufficient Evidence (quality: 0.55)] Failed to confirm call site reachability in router handler.`

---

## 4. Database Schema (`apps/web/lib/trace-schema.sql`)

```sql
CREATE TABLE IF NOT EXISTS agent_traces (
  id TEXT PRIMARY KEY,
  scan_id TEXT NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  finding_id TEXT NULL REFERENCES scan_findings(id) ON DELETE CASCADE,
  step TEXT NOT NULL,                                -- 'planner' | 'investigator' | 'verifier' | 'critic' | 'reporter'
  input JSONB NOT NULL,
  output JSONB NOT NULL,
  reasoning TEXT,
  confidence_score NUMERIC(4, 3),                   -- e.g. 0.950
  rubric JSONB NULL,                                 -- { evidenceQuality, falsePositiveRisk, confidenceScore, critique }
  duration_ms INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_traces_scan ON agent_traces(scan_id);
CREATE INDEX IF NOT EXISTS idx_agent_traces_finding ON agent_traces(finding_id);
CREATE INDEX IF NOT EXISTS idx_agent_traces_step ON agent_traces(step);

ALTER PUBLICATION supabase_realtime ADD TABLE agent_traces;
```

---

## 5. Component Layout & Interfaces

### 1. Critic Judge Engine (`packages/core/src/agent/critic.ts`)
- **`evaluateVerdictWithCritic(finding, verification, config, injectedClient)`**:
  - Sends verification and accumulated evidence to the Critic prompt.
  - Returns `CriticEvaluationResult`:
    ```ts
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
    ```

### 2. Agent Trace Collector (`packages/core/src/agent/tracer.ts`)
- **`AgentTracer` class**:
  - `startSpan(step, findingId, input)`
  - `finishSpan(span, output, reasoning, confidenceScore, rubric)`
  - `getTraces(): AgentTraceRecord[]`
  - `flushToDisk(targetPath, scanId)`

### 3. Agent Loop Integration (`packages/core/src/agent/loop.ts`)
- Instantiates `AgentTracer` for the entire scan session.
- Records spans for Planner, Investigator turns, Verifier, Critic, and Reporter.
- Calls Critic Judge after Verifier; overrides verdict if rubric fails.
- Flushes traces to memory and exports to `ScanResult`.

### 4. Trace Dispatcher & API (`apps/web/lib/trace-dispatcher.ts` & `apps/web/app/api/scans/[id]/traces/route.ts`)
- `recordAgentTraceBatch(traces)`: Writes trace records into PostgreSQL `agent_traces`.
- `GET /api/scans/[id]/traces`: Returns JSON array of traces for dashboard consumption.

### 5. Web UI Reasoning Trace Drawer (`apps/web/components/traces/trace-drawer.tsx`)
- Slide-over / modal drawer on the scan dashboard.
- Displays interactive step-by-step trace timeline:
  - Planner triage decisions.
  - Investigator tool invocations (`read_file`, `search_codebase`, etc.).
  - Verifier hypothesis outcome.
  - Critic Rubric card with gauges for Evidence Quality, False-Positive Risk, and Judge Confidence.

---

## 6. Verification & Test Plan

1. **Unit Tests**:
   - `packages/core/tests/agent/critic.test.ts`:
     - Verify Critic approves verdicts with high evidence quality (>= 0.7) and low risk (<= 0.5).
     - Verify Critic overrules verdicts with poor evidence or high false-positive risk.
   - `packages/core/tests/agent/tracer.test.ts`:
     - Test span creation, rubric serialization, and local file flushing.
   - `packages/core/tests/agent/api-traces.test.ts`:
     - Test `GET /api/scans/[id]/traces` endpoint and batch insertion.
2. **Integration Test**:
   - Run end-to-end agent loop with mock client, verifying trace collection and Critic overrule filtering.
3. **Monorepo Build & Typecheck**:
   - `pnpm typecheck` clean across all 5 workspace packages.
   - `pnpm --filter web run build` clean production build.
