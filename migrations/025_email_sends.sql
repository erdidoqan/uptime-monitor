-- Email kampanya gonderim kayitlari
CREATE TABLE IF NOT EXISTS email_sends (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  campaign TEXT NOT NULL,
  metadata TEXT,
  sent_at INTEGER NOT NULL,
  opened_at INTEGER,
  clicked_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Abonelikten cikan kullanicilar
CREATE TABLE IF NOT EXISTS email_unsubscribes (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  unsubscribed_at INTEGER NOT NULL,
  reason TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_email_sends_user ON email_sends(user_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_campaign ON email_sends(campaign);
CREATE INDEX IF NOT EXISTS idx_email_sends_user_campaign ON email_sends(user_id, campaign);
CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_user ON email_unsubscribes(user_id);
