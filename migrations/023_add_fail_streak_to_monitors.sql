-- Add fail_streak to monitors table for false positive prevention
-- Incident will only be created after 2 consecutive failures (like cron_jobs)
ALTER TABLE monitors ADD COLUMN fail_streak INTEGER DEFAULT 0;
