CREATE TABLE IF NOT EXISTS traffic_campaigns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  daily_visitors INTEGER NOT NULL DEFAULT 50,
  browsers_per_run INTEGER NOT NULL DEFAULT 3,
  tabs_per_browser INTEGER NOT NULL DEFAULT 10,
  traffic_source TEXT NOT NULL DEFAULT 'organic',
  session_duration TEXT NOT NULL DEFAULT 'realistic',
  use_proxy INTEGER NOT NULL DEFAULT 0,
  start_hour INTEGER NOT NULL DEFAULT 9,
  end_hour INTEGER NOT NULL DEFAULT 22,
  is_active INTEGER NOT NULL DEFAULT 1,
  next_run_at INTEGER,
  locked_at INTEGER,
  last_run_at INTEGER,
  last_status TEXT,
  total_runs INTEGER NOT NULL DEFAULT 0,
  total_visits_sent INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_traffic_campaigns_user_id ON traffic_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_traffic_campaigns_next_run ON traffic_campaigns(next_run_at);
CREATE INDEX IF NOT EXISTS idx_traffic_campaigns_active ON traffic_campaigns(is_active, next_run_at);
