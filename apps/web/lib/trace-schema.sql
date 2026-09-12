CREATE TABLE IF NOT EXISTS agent_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id TEXT NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  tool_called TEXT,
  tool_input TEXT,
  tool_output TEXT,
  reasoning TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_traces_scan ON agent_traces(scan_id);
CREATE INDEX IF NOT EXISTS idx_agent_traces_step_number ON agent_traces(step_number);

ALTER PUBLICATION supabase_realtime ADD TABLE agent_traces;
