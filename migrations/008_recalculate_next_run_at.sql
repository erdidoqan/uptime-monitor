-- This migration recalculates next_run_at for all active cron jobs
-- Note: This is a data migration, not a schema change
-- The actual recalculation should be done via API or application code
-- This file is just a placeholder to document the need for recalculation

-- To recalculate next_run_at, use the API endpoint:
-- POST /api/cron-jobs/recalculate-all
-- Or update via application code using calculateNextRun function

