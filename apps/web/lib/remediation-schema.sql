CREATE TABLE IF NOT EXISTS repo_settings (
  repo_name TEXT PRIMARY KEY,
  installation_id BIGINT NULL,
  auto_remediate_enabled BOOLEAN NOT NULL DEFAULT false,
  min_severity TEXT NOT NULL DEFAULT 'critical',
  branch_prefix TEXT NOT NULL DEFAULT 'wren/fix-',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS remediations (
  id TEXT PRIMARY KEY,
  scan_id TEXT NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  finding_id TEXT NOT NULL REFERENCES scan_findings(id) ON DELETE CASCADE,
  repo_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  branch_name TEXT NOT NULL,
  pr_number INT NULL,
  pr_url TEXT NULL,
  patch_diff TEXT NULL,
  explanation TEXT NULL,
  error_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ NULL
);

ALTER PUBLICATION supabase_realtime ADD TABLE repo_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE remediations;
