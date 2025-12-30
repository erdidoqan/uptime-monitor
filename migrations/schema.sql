-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  name TEXT,
  image TEXT,
  created_at INTEGER NOT NULL
);

-- Monitors table
CREATE TABLE IF NOT EXISTS monitors (
  id TEXT PRIMARY KEY,
  name TEXT,
  url TEXT NOT NULL,
  urls TEXT, -- JSON array of URLs for multiple URL support
  interval_sec INTEGER NOT NULL,
  timeout_ms INTEGER NOT NULL,
  expected_min INTEGER,
  expected_max INTEGER,
  keyword TEXT,
  is_active INTEGER DEFAULT 1,
  next_run_at INTEGER,
  locked_at INTEGER,
  last_status TEXT,
  last_latency_ms INTEGER,
  last_checked_at INTEGER,
  created_at INTEGER NOT NULL,
  recovery_period_sec INTEGER,
  confirmation_period_sec INTEGER
);
CREATE INDEX IF NOT EXISTS idx_monitors_next_run ON monitors(next_run_at);

-- Monitor checks table (log)
-- DEPRECATED: Monitor checks are now stored in R2, not in D1
-- This table is kept for reference but should not be created in new deployments
-- Use migration 005_drop_monitor_checks_table.sql to remove from existing databases
-- CREATE TABLE IF NOT EXISTS monitor_checks (
--   id TEXT PRIMARY KEY,
--   monitor_id TEXT NOT NULL,
--   ts INTEGER NOT NULL,
--   status TEXT NOT NULL,
--   http_status INTEGER,
--   latency_ms INTEGER,
--   error TEXT,
--   FOREIGN KEY (monitor_id) REFERENCES monitors(id)
-- );
-- CREATE INDEX IF NOT EXISTS idx_monitor_checks_monitor_ts ON monitor_checks(monitor_id, ts DESC);

-- Cron jobs table
CREATE TABLE IF NOT EXISTS cron_jobs (
  id TEXT PRIMARY KEY,
  name TEXT,
  url TEXT NOT NULL,
  method TEXT NOT NULL,
  headers_json TEXT,
  body TEXT,
  cron_expr TEXT,
  interval_sec INTEGER,
  timeout_ms INTEGER NOT NULL,
  expected_min INTEGER,
  expected_max INTEGER,
  keyword TEXT,
  is_active INTEGER DEFAULT 1,
  next_run_at INTEGER,
  locked_at INTEGER,
  last_status TEXT,
  last_run_at INTEGER,
  fail_streak INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cron_jobs_next_run ON cron_jobs(next_run_at);

-- Cron runs table (log)
CREATE TABLE IF NOT EXISTS cron_runs (
  id TEXT PRIMARY KEY,
  cron_job_id TEXT NOT NULL,
  ts INTEGER NOT NULL,
  status TEXT NOT NULL,
  http_status INTEGER,
  duration_ms INTEGER,
  error TEXT,
  response_body TEXT,
  FOREIGN KEY (cron_job_id) REFERENCES cron_jobs(id)
);
CREATE INDEX IF NOT EXISTS idx_cron_runs_job_ts ON cron_runs(cron_job_id, ts DESC);

-- Incidents table
CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  resolved_at INTEGER,
  last_update_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_incidents_type_source ON incidents(type, source_id, resolved_at);

-- API Tokens table
CREATE TABLE IF NOT EXISTS api_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT,
  token_hash TEXT NOT NULL,
  token_prefix TEXT NOT NULL,
  scopes TEXT NOT NULL, -- JSON array, e.g. ["monitors:read", "cron-jobs:write"]
  last_used_at INTEGER,
  expires_at INTEGER,
  created_at INTEGER NOT NULL,
  revoked_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_api_tokens_user_id ON api_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_api_tokens_token_hash ON api_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_api_tokens_revoked ON api_tokens(revoked_at) WHERE revoked_at IS NULL;

