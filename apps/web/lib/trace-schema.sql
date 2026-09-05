-- apps/web/lib/trace-schema.sql
-- Table for storing detailed step-by-step agent reasoning traces and critic rubric evaluations.

CREATE TABLE IF NOT EXISTS agent_traces (
  id TEXT PRIMARY KEY,
  scan_id TEXT NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  finding_id TEXT NULL,
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

-- Enable Supabase Realtime for live trace streaming
ALTER PUBLICATION supabase_realtime ADD TABLE agent_traces;
