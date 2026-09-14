# Design Specification: Phase 1 Accuracy & Evaluation Framework

## Overview
Phase 1 establishes a scientific, metric-driven evaluation methodology for Wren's security detection and deep reasoning engine. Instead of relying on qualitative impression, accuracy is quantified through a ground truth benchmark of 100 labeled code snippets (50 confirmed vulnerable, 50 clean/mitigated), a confidence threshold gating mechanism, an adversarial critic judge pass, and regression tracking across runs.

---

## 1. Ground Truth Benchmark Dataset (100 Labeled Snippets)

### Structure
The dataset is implemented in `packages/core/src/eval/dataset.ts` as an array of strongly-typed test cases:

```typescript
export interface GroundTruthSnippet {
  id: string;
  name: string;
  category: "secret" | "auth" | "database" | "configuration" | "dependency";
  expectedRuleId?: string;
  expectedVulnerable: boolean;
  code: string;
  fileName: string;
  mitigationNotes?: string;
}
```

### Coverage (50 Vulnerable + 50 Clean)

1. **Secrets (20 snippets: 10 vulnerable, 10 clean)**:
   - Vulnerable: Committed OpenAI (`sk-proj-...`), Stripe live keys (`sk_live_...`), Anthropic Claude (`sk-ant-...`), AWS Access Keys (`AKIA...`), GitHub Personal Access Tokens (`ghp_...`), PostgreSQL/MySQL plaintext connection URIs with embedded passwords, `NEXT_PUBLIC_SERVICE_ROLE_KEY` environment inlining.
   - Clean: References to `process.env.*`, secret managers, masked mock keys, redacted examples in non-code docs.

2. **Authentication & Authorization (30 snippets: 15 vulnerable, 15 clean)**:
   - Vulnerable: Next.js App Router mutating endpoints (`POST`, `DELETE`, `PUT`, `PATCH` in `route.ts`) without session validation; Supabase `service_role` key imported and executed inside client components (`"use client"`).
   - Clean: Mutating handlers with `auth()`, `getServerSession()`, `supabase.auth.getUser()`, or route-level middleware protection; client components strictly using `NEXT_PUBLIC_SUPABASE_ANON_KEY` with Row Level Security (RLS).

3. **Database Security & Injection (30 snippets: 15 vulnerable, 15 clean)**:
   - Vulnerable: Firestore/Firebase rules containing `allow read, write: if true;`; SQL queries constructed via raw template string interpolation (`db.query(\`SELECT * FROM users WHERE id = ${id}\`)`).
   - Clean: Firebase rules enforcing `request.auth != null` and owner checking; parameterized queries (`db.query('SELECT * FROM users WHERE id = $1', [id])`); ORM calls using Prisma/Drizzle type-safe builders.

4. **Configuration & Headers (20 snippets: 10 vulnerable, 10 clean)**:
   - Vulnerable: CORS headers setting `Access-Control-Allow-Origin: *` while accepting credentials; missing helmet security headers; insecure cookie options (`secure: false`, `httpOnly: false`).
   - Clean: CORS configured with explicit allowed origin arrays (`process.env.ALLOWED_ORIGINS`); strict cookie options (`httpOnly: true`, `secure: true`, `sameSite: "lax"`).

---

## 2. Evaluation Runner & Metric Engine

### Architecture
`packages/core/src/eval/runner.ts` executes Wren against the dataset in memory or temporary isolated directories without polluting the workspace.

### Core Metrics Formulae
- **True Positives ($TP$)**: Vulnerable snippet correctly flagged with expected finding.
- **False Positives ($FP$)**: Clean snippet incorrectly flagged as vulnerable.
- **True Negatives ($TN$)**: Clean snippet correctly passed with zero findings.
- **False Negatives ($FN$)**: Vulnerable snippet missed by the scanner.
- **Precision**: $\frac{TP}{TP + FP}$
- **Recall**: $\frac{TP}{TP + FN}$
- **F1 Score**: $2 \cdot \frac{\text{Precision} \cdot \text{Recall}}{\text{Precision} + \text{Recall}}$
- **False Positive Rate (FPR)**: $\frac{FP}{FP + TN}$

### Output & History
- Terminal scorecard formatted as an ASCII table summarizing overall Precision, Recall, F1, and FPR, plus per-category breakdowns.
- Persists results to `benchmarks/accuracy-history.json` with timestamp, engine version, and detailed confusion matrix to detect regressions over time.

---

## 3. Confidence Threshold Gating

### Mechanism
In `packages/cli/src/engine/agent-loop.ts`, whenever the LLM reasoning agent produces a verdict without tool calls:
- Default threshold: `0.80` (80% confidence). Configurable via `AgentLoopOptions.confidenceThreshold`.
- If `confidence < confidenceThreshold`:
  - Finding verdict is converted to `"NEEDS_MANUAL_REVIEW"`.
  - Finding explanation is updated with: `[Needs Manual Review: Agent confidence (X.XX) is below required threshold (0.80)].`
  - Finding is categorized for manual triage rather than asserted as an absolute true positive.

---

## 4. Adversarial Critic Judge Pass

### Architecture
Integrate `evaluateVerdictWithCritic` into `packages/cli/src/engine/agent-loop.ts` as a second LLM evaluation pass:
- When the first pass concludes a finding is a `TRUE_POSITIVE`:
  1. The Critic LLM evaluates the finding against the strict rubric:
     - `evidenceQuality` (0.0 - 1.0): Did the investigator locate concrete call sites or execution paths?
     - `falsePositiveRisk` (0.0 - 1.0): Do framework protections (ORM, sanitizers, middleware) mitigate it?
     - `confidenceScore` (0.0 - 1.0): Critic conviction.
  2. Overrule Policy:
     - If `evidenceQuality < 0.70` and `falsePositiveRisk > 0.50`: Overrule to `FALSE_POSITIVE` (suppressed).
     - If `evidenceQuality < 0.70` and `falsePositiveRisk <= 0.50`: Demote to `NEEDS_MANUAL_REVIEW`.
  3. The critic evaluation and rubric are recorded as a step in `agent_traces`.

---

## 5. CLI & Workspace Commands

- `pnpm eval`: Runs the evaluation runner against the 100-snippet benchmark, logs the scorecard, and appends to history.
- `pnpm test:eval`: Automated test asserting:
  - Overall Precision $\ge 90\%$
  - Overall Recall $\ge 90\%$
  - Zero fatal unhandled exceptions during scan evaluation.
