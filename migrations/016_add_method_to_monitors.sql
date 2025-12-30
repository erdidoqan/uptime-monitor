-- Add method column to monitors table
-- Default to 'GET' for backward compatibility
ALTER TABLE monitors ADD COLUMN method TEXT DEFAULT 'GET';

