-- Drop monitor_checks table and its index
-- Monitor checks are now stored in R2, no longer needed in D1

DROP INDEX IF EXISTS idx_monitor_checks_monitor_ts;
DROP TABLE IF EXISTS monitor_checks;

