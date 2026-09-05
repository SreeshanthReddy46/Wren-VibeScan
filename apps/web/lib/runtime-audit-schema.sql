CREATE TABLE IF NOT EXISTS runtime_agent_events (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  session_id TEXT,
  environment TEXT DEFAULT 'production',
  action TEXT NOT NULL,
  declared_intent TEXT,
  arguments JSONB NOT NULL DEFAULT '{}',
  result JSONB,
  metadata JSONB DEFAULT '{}',
  tripped BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS runtime_alerts (
  id TEXT PRIMARY KEY,
  event_id TEXT REFERENCES runtime_agent_events(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  rule_id TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  severity TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence TEXT NOT NULL,
  suggested_action TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  webhook_sent BOOLEAN DEFAULT FALSE,
  webhook_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS runtime_webhook_configs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  min_severity TEXT DEFAULT 'high',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_runtime_events_agent_id ON runtime_agent_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_runtime_events_created_at ON runtime_agent_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_runtime_alerts_agent_id ON runtime_alerts(agent_id);
CREATE INDEX IF NOT EXISTS idx_runtime_alerts_status ON runtime_alerts(status);
CREATE INDEX IF NOT EXISTS idx_runtime_alerts_created_at ON runtime_alerts(created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE runtime_agent_events, runtime_alerts;
