-- Test error routes table
-- Used to configure which HTTP status codes should be returned for specific URL paths
CREATE TABLE IF NOT EXISTS test_error_routes (
  id TEXT PRIMARY KEY,
  path TEXT UNIQUE NOT NULL, -- URL path, e.g. '/test-errors' or '/api/test-errors'
  status_code INTEGER NOT NULL, -- HTTP status code: 200, 404, 500, etc.
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_test_error_routes_path ON test_error_routes(path);

