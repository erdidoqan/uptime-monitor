-- Add use_tr_proxy column to monitors table
-- This allows monitors to optionally route requests through a Turkey-based proxy server
-- to avoid geo-blocking issues with some websites

ALTER TABLE monitors ADD COLUMN use_tr_proxy INTEGER DEFAULT 0;
