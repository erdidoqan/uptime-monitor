-- Banlı IP'leri saklamak için tablo
CREATE TABLE IF NOT EXISTS banned_ips (
  ip TEXT PRIMARY KEY,
  reason TEXT,
  banned_by TEXT, -- admin user id
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_banned_ips_created ON banned_ips(created_at);
