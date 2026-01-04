-- Add advanced settings columns to monitors table
ALTER TABLE monitors ADD COLUMN recovery_period_sec INTEGER;
ALTER TABLE monitors ADD COLUMN confirmation_period_sec INTEGER;


























