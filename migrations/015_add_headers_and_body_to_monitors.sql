-- Add headers_json and body columns to monitors table
-- These columns are used to store HTTP headers and request body for monitor requests
ALTER TABLE monitors ADD COLUMN headers_json TEXT;
ALTER TABLE monitors ADD COLUMN body TEXT;

