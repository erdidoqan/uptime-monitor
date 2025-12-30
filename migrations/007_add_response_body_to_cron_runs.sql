-- Add response_body column to cron_runs table
ALTER TABLE cron_runs ADD COLUMN response_body TEXT;

