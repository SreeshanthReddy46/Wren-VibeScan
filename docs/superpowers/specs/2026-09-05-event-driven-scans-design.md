# Specification: Event-Driven Scan Architecture with Inngest & Supabase Realtime

## 1. Overview & Objective
Transform the scan execution pipeline from a blocking, synchronous HTTP request-response cycle into an asynchronous, event-driven architecture.
- **Immediate Response**: Scanning requests submit the job, receive a queued `scanId` with a live dashboard URL in milliseconds, and exit or poll cleanly.
- **Asynchronous Execution**: Jobs run via **Inngest** (with durable multi-step functions, retries, and offline background runner fallback).
- **Live Live-Ticking Streaming**: Findings and investigation steps are persisted into Supabase tables (`scans`, `scan_findings`, `scan_events`) and broadcast live via **Supabase Realtime**, allowing the dashboard and CLI to stream results item-by-item without staring at a blank spinner.

---

## 2. Event-Driven Flow Architecture

```
  ┌──────────────┐
  │  CLI / Web   │
  └──────┬───────┘
         │ 1. POST /api/scans (Target repo, path, options)
         ▼
  ┌──────────────┐
  │ Next.js API  │ ──► Generates scanId, sets status='queued' in Supabase
  └──────┬───────┘ ──► Responds 202 Accepted { scanId, dashboardUrl }
         │
         │ 2. Dispatches event 'scan.requested'
         ▼
  ┌──────────────┐
  │ Inngest /    │
  │ Event Worker │
  └──────┬───────┘
         │
         ├── Step 1: scan.started ──► Updates scans table (status: 'running')
         │
         ├── Step 2: static-ast-pass ──► Emits finding.discovered
         │
         ├── Step 3: agent-loop-pass ──► Investigates & Verifies findings
         │                               Emits finding.verified (with rationale & diff)
         │                               Upserts into scan_findings table
         │
         └── Step 4: scan.completed ──► Updates scans table (status: 'completed')
                                        Emits scan.completed
                                                  │
                                                  ▼
                                      ┌───────────────────────┐
                                      │   Supabase Realtime   │
                                      │   (postgres_changes)  │
                                      └───────────┬───────────┘
                                                  │
                       ┌──────────────────────────┴──────────────────────────┐
                       ▼                                                     ▼
             ┌──────────────────┐                                  ┌──────────────────┐
             │  Live Dashboard  │                                  │   CLI Progress   │
             │ (useScanRealtime)│                                  │   (wren check)   │
             └──────────────────┘                                  └──────────────────┘
```

---

## 3. Database Schema (`scans`, `scan_findings`, `scan_events`)

```sql
-- 1. Scans Table
CREATE TABLE IF NOT EXISTS scans (
  id TEXT PRIMARY KEY,
  repo_name TEXT NULL,
  branch TEXT NULL,
  commit_hash TEXT NULL,
  status TEXT NOT NULL DEFAULT 'queued',     -- 'queued' | 'running' | 'completed' | 'failed'
  progress_stage TEXT NULL,                  -- 'init' | 'static' | 'agent' | 'completed'
  findings_count INT NOT NULL DEFAULT 0,
  critical_count INT NOT NULL DEFAULT 0,
  high_count INT NOT NULL DEFAULT 0,
  medium_count INT NOT NULL DEFAULT 0,
  low_count INT NOT NULL DEFAULT 0,
  duration_ms INT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ NULL
);

-- 2. Scan Findings Table
CREATE TABLE IF NOT EXISTS scan_findings (
  id TEXT PRIMARY KEY,
  scan_id TEXT NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  rule_id TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  plain_english_explanation TEXT NOT NULL,
  file_path TEXT NOT NULL,
  start_line INT NOT NULL,
  end_line INT NOT NULL,
  snippet TEXT NULL,
  suggested_fix JSONB NULL,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verified_rationale TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Scan Events Table
CREATE TABLE IF NOT EXISTS scan_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id TEXT NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,                  -- 'scan.started' | 'finding.discovered' | 'finding.verified' | 'scan.completed'
  stage TEXT NOT NULL,
  message TEXT NOT NULL,
  payload JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Enable Supabase Realtime Replication
ALTER PUBLICATION supabase_realtime ADD TABLE scans;
ALTER PUBLICATION supabase_realtime ADD TABLE scan_findings;
ALTER PUBLICATION supabase_realtime ADD TABLE scan_events;
```

---

## 4. Components & Package Layout

### 1. `apps/web/inngest/`
- **`client.ts`**: Inngest client initialization with fallback mode detection.
- **`events.ts`**: Type definitions for Inngest events (`scan.requested`, `scan.progress`, `scan.completed`).
- **`functions/execute-scan.ts`**: Inngest durable multi-step scan workflow orchestrating `@wren/core`.
- **`app/api/inngest/route.ts`**: Next.js route handler exposing `serve({ client, functions: [...] })`.

### 2. `apps/web/lib/scan-runner.ts`
- **`dispatchScanJob(scanId, payload)`**: Dispatches to Inngest or runs through in-process background runner fallback if Inngest keys are not configured (ensuring local tests & offline development pass).

### 3. `apps/web/hooks/use-scan-realtime.ts`
- React hook subscribing to Supabase Realtime changes for `scan_findings` and `scans` by `scanId`.

### 4. `packages/cli/src/commands/check.ts`
- Added `--async` flag to exit immediately with scan ID.
- Default mode streams progress steps directly in the terminal before finalizing exit code.

---

## 5. Verification Plan

1. **Unit & Integration Tests**:
   - `events.test.ts`: Verify event payload typing and schemas.
   - `scan-runner.test.ts`: Test async dispatch, queue status, and step progression.
   - `api-scans.test.ts`: Test `POST /api/scans` returns 202 Accepted with `scanId` and `queued` status immediately, and `GET /api/scans/:id` returns findings.
2. **Build & Monorepo Typecheck**:
   - `pnpm --filter web run build`
   - `pnpm typecheck` across all 5 workspace packages.
3. **CLI Scan Test**:
   - Run `wren check --async` to confirm instantaneous return.
