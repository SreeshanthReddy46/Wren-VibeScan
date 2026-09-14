# Accuracy & Evaluation Framework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a 100-snippet ground-truth evaluation benchmark (50 vulnerable, 50 clean) measuring precision, recall, and false-positive rates, integrate a confidence threshold gating mechanism, and wire an adversarial critic judge into the deep reasoning loop.

**Architecture:** Build `packages/core/src/eval/` containing the ground truth dataset, runner, and metrics calculator. Update `packages/cli/src/engine/agent-loop.ts` to enforce a confidence cutoff (default 0.80) and invoke an adversarial critic pass (`evaluateVerdictWithCritic`) before returning verdicts. Expose `pnpm eval` and `pnpm test:eval` for continuous regression testing.

**Tech Stack:** TypeScript, Node.js test runner (`node:test`), Anthropic Claude SDK, `@wren/core`, `@wren/cli`.

## Global Constraints
- Absolute Zero Code Comments: Never write `//`, `/* */`, or `--` comments in any code files.
- Git Commit Directive: Do not run `git commit` or `git push` until explicitly commanded by the user.

---

### Task 1: Ground Truth Dataset (100 Labeled Snippets)

**Files:**
- Create: `packages/core/src/eval/dataset.ts`
- Create: `packages/core/src/eval/types.ts`
- Test: `packages/core/tests/eval/dataset.test.ts`

**Interfaces:**
- Produces:
  - `export interface GroundTruthSnippet { id: string; name: string; category: Category; expectedRuleId?: string; expectedVulnerable: boolean; code: string; fileName: string; }`
  - `export const GROUND_TRUTH_DATASET: GroundTruthSnippet[]` (array of exactly 100 items: 50 vulnerable, 50 clean)

- [ ] **Step 1: Define dataset types in `packages/core/src/eval/types.ts`**
- [ ] **Step 2: Create ground truth dataset in `packages/core/src/eval/dataset.ts` with 50 vulnerable and 50 clean code snippets across Secrets, Auth, Database, Configuration, and Dependencies**
- [ ] **Step 3: Write test in `packages/core/tests/eval/dataset.test.ts` to verify 100 snippets exist, balanced 50/50, with valid syntax and metadata**
- [ ] **Step 4: Run test to verify it passes**

---

### Task 2: Evaluation Benchmark Runner & Metrics Calculator

**Files:**
- Create: `packages/core/src/eval/metrics.ts`
- Create: `packages/core/src/eval/runner.ts`
- Create: `scripts/run-eval.mjs`
- Test: `packages/core/tests/eval/runner.test.ts`

**Interfaces:**
- Produces:
  - `export interface EvalMetrics { total: number; truePositives: number; falsePositives: number; trueNegatives: number; falseNegatives: number; precision: number; recall: number; f1Score: number; falsePositiveRate: number; }`
  - `export async function runAccuracyEvaluation(options?: EvalRunnerOptions): Promise<EvalResult>`

- [ ] **Step 1: Implement metrics calculation formulae in `packages/core/src/eval/metrics.ts`**
- [ ] **Step 2: Implement evaluation runner in `packages/core/src/eval/runner.ts` that runs static + AST scanner on temporary files generated from snippets**
- [ ] **Step 3: Implement `scripts/run-eval.mjs` to format output into an ASCII scorecard table and persist to `benchmarks/accuracy-history.json`**
- [ ] **Step 4: Write test in `packages/core/tests/eval/runner.test.ts`**
- [ ] **Step 5: Run tests to verify runner accuracy**

---

### Task 3: Confidence Threshold Gating in Agent Loop

**Files:**
- Modify: `packages/cli/src/engine/agent-loop.ts`
- Test: `packages/cli/tests/engine/agent-loop-threshold.test.ts`

**Interfaces:**
- Consumes: `AgentLoopOptions.confidenceThreshold` (default `0.80`)
- Produces: `AgentLoopResult.verdict = "NEEDS_MANUAL_REVIEW"` when `confidence < confidenceThreshold`

- [ ] **Step 1: Add `confidenceThreshold?: number` to `AgentLoopOptions`**
- [ ] **Step 2: In `packages/cli/src/engine/agent-loop.ts`, gate verdicts where `confidence < (options.confidenceThreshold ?? 0.80)` as `NEEDS_MANUAL_REVIEW`**
- [ ] **Step 3: Write unit test in `packages/cli/tests/engine/agent-loop-threshold.test.ts`**
- [ ] **Step 4: Run tests to verify confidence gating**

---

### Task 4: Critic Judge Pass in CLI Deep Reasoning Loop

**Files:**
- Modify: `packages/cli/src/engine/agent-loop.ts`
- Test: `packages/cli/tests/engine/agent-critic.test.ts`

**Interfaces:**
- Consumes: `evaluateVerdictWithCritic` from `@wren/core`
- Produces: Evaluates rubric on candidate true positive findings, overrules unverified ones, and emits critic trace step

- [ ] **Step 1: Wire Critic pass after primary reasoning verdict in `packages/cli/src/engine/agent-loop.ts`**
- [ ] **Step 2: Record critic rubric step in `agent_traces`**
- [ ] **Step 3: Write unit test in `packages/cli/tests/engine/agent-critic.test.ts` verifying overrule and rubric recording**
- [ ] **Step 4: Run tests to verify critic behavior**

---

### Task 5: Package Scripts & End-to-End Evaluation Verification

**Files:**
- Modify: `package.json` (add `"eval"` and `"test:eval"` scripts)
- Export from `packages/core/src/index.ts`
- Export from `packages/cli/src/index.ts`

- [ ] **Step 1: Add `"eval": "node scripts/run-eval.mjs"` and `"test:eval": "node scripts/run-eval.mjs --assert-thresholds"` to root `package.json`**
- [ ] **Step 2: Re-export eval runner and dataset from `@wren/core`**
- [ ] **Step 3: Execute `pnpm eval` and verify scorecard output and accuracy benchmarks**
- [ ] **Step 4: Run monorepo typecheck and test suites**
