-- Scan & Event Schema for Wren VibeScan (Supabase / PostgreSQL)

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
