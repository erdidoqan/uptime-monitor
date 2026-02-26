-- Load test sonuçlarını saklamak için tablo
-- İki aşamalı: test başlarken INSERT (status=running), bitince UPDATE (sonuçlar)
CREATE TABLE IF NOT EXISTS load_tests (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  url TEXT NOT NULL,
  target_url TEXT NOT NULL,
  target_concurrent_users INTEGER NOT NULL,
  total_requests INTEGER NOT NULL DEFAULT 0,
  total_sent INTEGER NOT NULL DEFAULT 0,
  total_ok INTEGER NOT NULL DEFAULT 0,
  total_errors INTEGER NOT NULL DEFAULT 0,
  duration_sec REAL NOT NULL DEFAULT 0,
  rps INTEGER NOT NULL DEFAULT 0,
  p50 INTEGER,
  p95 INTEGER,
  p99 INTEGER,
  error_reasons TEXT,
  ramp_steps TEXT,
  stopped_reason TEXT,
  request_mode TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  ip_address TEXT
);

CREATE INDEX IF NOT EXISTS idx_load_tests_user_id ON load_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_load_tests_created_at ON load_tests(created_at);
CREATE INDEX IF NOT EXISTS idx_load_tests_user_created ON load_tests(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_load_tests_status ON load_tests(status);
