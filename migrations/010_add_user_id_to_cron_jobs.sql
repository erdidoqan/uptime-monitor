-- Add user_id to cron_jobs table for user-specific cron job access
-- This fixes the security issue where all cron jobs were visible to all users

ALTER TABLE cron_jobs ADD COLUMN user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_cron_jobs_user_id ON cron_jobs(user_id);

-- Also add user_id to monitors table for consistency
ALTER TABLE monitors ADD COLUMN user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_monitors_user_id ON monitors(user_id);

