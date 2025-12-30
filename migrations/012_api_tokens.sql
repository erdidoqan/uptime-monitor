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

