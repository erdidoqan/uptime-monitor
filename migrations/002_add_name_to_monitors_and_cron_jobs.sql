-- Add name column to monitors table
ALTER TABLE monitors ADD COLUMN name TEXT;

-- Add name column to cron_jobs table
ALTER TABLE cron_jobs ADD COLUMN name TEXT;

