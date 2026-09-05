# Specification: Autonomous Remediation Agent with GitHub App Integration

## 1. Overview & Objectives
Wren VibeScan moves beyond identifying vulnerabilities to autonomously remediating them by generating verified code patches and opening actual GitHub Pull Requests via an official GitHub App.

- **Automated Fix Generation**: Inspects finding context, surrounding code, and call sites to generate a unified git diff patch.
- **Strict Zero-Leakage Guarantee**: Any hardcoded secrets (OpenAI keys, Supabase service keys, JWT tokens) are replaced with secure environment variable references (`process.env.XXX`). All patch contents pass through `sanitizePatternForGlobalMemory` before PR submission.
- **AST Syntax Verification**: The modified code is parsed and syntax-checked before branch creation to prevent opening broken or malformed PRs.
- **Explicit Repository Opt-In**: Autonomous remediation is strictly **opt-in per-repository** (default `false`) with configurable severity thresholds (`critical` or `high`).
- **On-Demand & Event-Driven**: Users can click "Fix with PR" on any verified finding in the dashboard or CLI, and automated scans trigger PR creation only when the repo has opt-in enabled.
- **Resilient Fallback**: In local development or test environments without GitHub App credentials, the system runs in dry-run mode, producing the simulated patch diff and mock PR URL.

---

## 2. Architecture & Data Flow

```
                 ┌───────────────────────────────────────────────────────────┐
                 │                       Verified Finding                    │
                 └─────────────────────────────┬─────────────────────────────┘
                                               │
               ┌───────────────────────────────┴───────────────────────────────┐
               ▼                                                               ▼
   [User Clicks "Fix with PR"]                                     [Auto-Remediation Trigger]
   (Dashboard / CLI / API)                                         (Scan completes on repo)
               │                                                               │
               │                                                Check `repo_settings.auto_remediate`
               │                                                (Gated: Default FALSE)
               │                                                               │
               └───────────────────────────────┬───────────────────────────────┘
                                               ▼
                                  POST /api/remediations
                                               │
                                               ▼ Dispatches Inngest Event: `remediation.requested`
                                ┌──────────────────────────────┐
                                │ Inngest: `executeRemediation`│
                                └──────────────┬───────────────┘
                                               │
          ┌────────────────────────────────────┴────────────────────────────────────┐
          ▼                                                                         ▼
   [Remediation Agent Loop]                                                  [Syntax & Secret Guard]
   - Claude 3.5 Sonnet                                                       - Anonymize secrets/PII
   - Reads source file slices                                                - Parse AST syntax validation
   - Generates unified git diff                                              - Abort if syntax fails
          │                                                                         │
          └────────────────────────────────────┬────────────────────────────────────┘
                                               ▼
                                  [GitHub App Client]
                                  - Exchange App Key for Installation Token
                                  - Create branch: `wren/fix-<finding-slug>`
                                  - Commit updated file
                                  - Open Pull Request:
                                    * Title: `fix(security): resolve <Finding Title>`
                                    * Body: Plain English rationale, CWE, testing notes
                                  - Update `remediations` table (status: `pr_opened`)
                                  - Stream event: `remediation.completed` to Supabase Realtime
```

---

## 3. Database Schema (`apps/web/lib/remediation-schema.sql`)

```sql
-- 1. Repository Remediation Opt-in Settings
CREATE TABLE IF NOT EXISTS repo_settings (
  repo_name TEXT PRIMARY KEY,                       -- e.g. "owner/repo"
  installation_id BIGINT NULL,                      -- GitHub App Installation ID
  auto_remediate_enabled BOOLEAN NOT NULL DEFAULT false, -- Explicit Opt-in Guard
  min_severity TEXT NOT NULL DEFAULT 'critical',    -- 'critical' | 'high'
  branch_prefix TEXT NOT NULL DEFAULT 'wren/fix-',  -- Generated branch prefix
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Remediation Jobs & Pull Requests Table
CREATE TABLE IF NOT EXISTS remediations (
  id TEXT PRIMARY KEY,
  scan_id TEXT NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  finding_id TEXT NOT NULL REFERENCES scan_findings(id) ON DELETE CASCADE,
  repo_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',            -- 'queued' | 'generating_patch' | 'syntax_verifying' | 'pr_opened' | 'failed'
  branch_name TEXT NOT NULL,
  pr_number INT NULL,
  pr_url TEXT NULL,
  patch_diff TEXT NULL,
  explanation TEXT NULL,
  error_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ NULL
);

-- 3. Enable Realtime Replication
ALTER PUBLICATION supabase_realtime ADD TABLE repo_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE remediations;
```

---

## 4. Component Layout

### 1. Core Remediation Engine (`packages/core/src/remediation/`)
- **`patch-generator.ts`**: Autonomous patch generation logic using Anthropic tool-use loop and context inspection.
- **`syntax-validator.ts`**: Fast AST validator ensuring generated patches compile cleanly without syntax errors.
- **`types.ts`**: Types for patch proposals, diff chunks, and verification results.

### 2. GitHub App Integration (`apps/web/lib/github-app.ts`)
- **`getGitHubAppInstallationToken(installationId)`**: Signs JWT using `GITHUB_APP_PRIVATE_KEY` and requests temporary token.
- **`createRemediationPullRequest(options)`**:
  - Creates remote branch `wren/fix-<finding-slug>-<id>`.
  - Commits patched file via GitHub REST API.
  - Opens pull request with structured security explanation and instructions.
  - Mock fallback mode when running without GitHub credentials.

### 3. Background Job & Inngest (`apps/web/inngest/functions/execute-remediation.ts`)
- Durable multi-step workflow handling `remediation.requested`.
- In-process background runner fallback in `apps/web/lib/remediation-dispatcher.ts` for offline/test environments.

### 4. API Endpoints
- `POST /api/remediations`: Triggers remediation job (returns `202 Accepted`).
- `GET /api/remediations/[id]`: Returns remediation status, diff, and PR link.
- `GET /api/repos/[owner]/[repo]/settings`: Fetches opt-in status.
- `PATCH /api/repos/[owner]/[repo]/settings`: Updates opt-in toggle and minimum severity.

### 5. CLI (`packages/cli/src/commands/fix.ts`)
- `wren fix <finding-id>`: Generates patch for finding, displays colored terminal diff, and allows applying locally or opening a PR.

---

## 5. Security & Zero-Leakage Invariants

1. **No Secret Ingress in PRs**: Raw API keys, JWT secrets, database connection strings, and passwords are never included in the patch or PR body. They are converted into environment variable lookups (e.g. `process.env.OPENAI_API_KEY`) with an `.env.example` update note.
2. **Double Anonymization Pass**: All proposed diffs pass through `sanitizePatternForGlobalMemory` before submission to GitHub.
3. **Strict Opt-in**: The repository setting `auto_remediate_enabled` defaults to `false`. Autonomous PRs are never created without user consent.
4. **Isolated Credentials**: `GITHUB_APP_ID` and `GITHUB_APP_PRIVATE_KEY` remain exclusively on the server side.

---

## 6. Verification & Test Plan

1. **Unit Tests**:
   - `syntax-validator.test.ts`: Verify valid and invalid JavaScript/TypeScript code detection.
   - `patch-generator.test.ts`: Test unified diff creation, secret redactor integration, and environment variable substitution.
   - `remediation-dispatcher.test.ts`: Test queue dispatching, opt-in enforcement, and local runner fallback.
   - `api-remediations.test.ts`: Test `POST /api/remediations` (202 Accepted) and `GET /api/remediations/:id`.
2. **Integration Tests**:
   - Verify GitHub App mock client produces valid branch, commit, and PR payloads.
   - Run end-to-end remediation test fixing a mock hardcoded secret into `process.env.SECRET`.
3. **Monorepo Typecheck & Build**:
   - `pnpm typecheck` clean across all 5 workspace packages.
   - `pnpm --filter web run build` clean production build.
