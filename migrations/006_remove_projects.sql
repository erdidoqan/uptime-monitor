-- Remove projects system
-- This migration removes project_id from monitors and cron_jobs tables
-- and drops the projects and project_members tables

-- Remove project_id column from monitors table
-- Note: SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
CREATE TABLE IF NOT EXISTS monitors_new (
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

-- Copy data from old table to new table (excluding project_id)
INSERT INTO monitors_new (
  id, name, url, urls, interval_sec, timeout_ms,
  expected_min, expected_max, keyword, is_active, next_run_at,
  locked_at, last_status, last_latency_ms, last_checked_at,
  created_at, recovery_period_sec, confirmation_period_sec
)
SELECT 
  id, name, url, urls, interval_sec, timeout_ms,
  expected_min, expected_max, keyword, is_active, next_run_at,
  locked_at, last_status, last_latency_ms, last_checked_at,
  created_at, recovery_period_sec, confirmation_period_sec
FROM monitors;

-- Drop old table and rename new table
DROP TABLE monitors;
ALTER TABLE monitors_new RENAME TO monitors;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_monitors_next_run ON monitors(next_run_at);

-- Remove project_id column from cron_jobs table
CREATE TABLE IF NOT EXISTS cron_jobs_new (
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

-- Copy data from old table to new table (excluding project_id)
INSERT INTO cron_jobs_new (
  id, name, url, method, headers_json, body,
  cron_expr, interval_sec, timeout_ms,
  expected_min, expected_max, keyword, is_active, next_run_at,
  locked_at, last_status, last_run_at, fail_streak, created_at
)
SELECT 
  id, name, url, method, headers_json, body,
  cron_expr, interval_sec, timeout_ms,
  expected_min, expected_max, keyword, is_active, next_run_at,
  locked_at, last_status, last_run_at, fail_streak, created_at
FROM cron_jobs;

-- Drop old table and rename new table
DROP TABLE cron_jobs;
ALTER TABLE cron_jobs_new RENAME TO cron_jobs;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_cron_jobs_next_run ON cron_jobs(next_run_at);

-- Drop projects and project_members tables
DROP TABLE IF EXISTS project_members;
DROP TABLE IF EXISTS projects;

