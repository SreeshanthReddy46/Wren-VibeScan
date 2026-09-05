-- Autonomous Remediation Schema for Wren VibeScan (Supabase / PostgreSQL)

-- 1. Repository Remediation Opt-in Settings
CREATE TABLE IF NOT EXISTS repo_settings (
  repo_name TEXT PRIMARY KEY,                       -- e.g. "acme-corp/vibe-shop"
  installation_id BIGINT NULL,                      -- GitHub App Installation ID
  auto_remediate_enabled BOOLEAN NOT NULL DEFAULT false, -- Explicit Opt-in Guard (never default true)
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

-- 3. Enable Realtime Streaming
ALTER PUBLICATION supabase_realtime ADD TABLE repo_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE remediations;
