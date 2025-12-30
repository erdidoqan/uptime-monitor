-- Add guest cron fields for landing page functionality
-- guest_ip: IP address of the guest user who created the cron job
-- expires_at: Timestamp when the guest cron job expires (7 days from creation)

ALTER TABLE cron_jobs ADD COLUMN guest_ip TEXT;
ALTER TABLE cron_jobs ADD COLUMN expires_at INTEGER;
CREATE INDEX IF NOT EXISTS idx_cron_jobs_expires ON cron_jobs(expires_at);

