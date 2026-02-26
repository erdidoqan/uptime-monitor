-- Browser test (Real Browser Testing) sonuçlarını saklamak için tablo
-- İki aşamalı: test başlarken INSERT (status=running), bitince UPDATE (sonuçlar)
CREATE TABLE IF NOT EXISTS browser_tests (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  url TEXT NOT NULL,
  target_url TEXT NOT NULL,
  target_browsers INTEGER NOT NULL,
  tabs_per_browser INTEGER NOT NULL DEFAULT 5,
  total_visits INTEGER NOT NULL DEFAULT 0,
  total_ok INTEGER NOT NULL DEFAULT 0,
  total_errors INTEGER NOT NULL DEFAULT 0,
  duration_sec REAL NOT NULL DEFAULT 0,
  -- Web Vitals aggregates (ms cinsinden, CLS *1000 olarak saklanır)
  avg_ttfb INTEGER,
  avg_fcp INTEGER,
  avg_lcp INTEGER,
  avg_cls INTEGER,
  p95_ttfb INTEGER,
  p95_fcp INTEGER,
  p95_lcp INTEGER,
  avg_dom_complete INTEGER,
  avg_page_load INTEGER,
  total_resources INTEGER,
  total_bytes INTEGER,
  js_errors INTEGER NOT NULL DEFAULT 0,
  -- Ramp steps & details (JSON)
  ramp_steps TEXT,
  error_reasons TEXT,
  stopped_reason TEXT,
  ai_analysis TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  ip_address TEXT
);

CREATE INDEX IF NOT EXISTS idx_browser_tests_user_id ON browser_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_browser_tests_created_at ON browser_tests(created_at);
CREATE INDEX IF NOT EXISTS idx_browser_tests_user_created ON browser_tests(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_browser_tests_status ON browser_tests(status);
