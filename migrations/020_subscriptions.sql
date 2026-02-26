-- Subscriptions table for Polar integration
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  polar_customer_id TEXT,
  polar_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'inactive',
  plan TEXT DEFAULT 'pro',
  current_period_end INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_polar_customer_id ON subscriptions(polar_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
