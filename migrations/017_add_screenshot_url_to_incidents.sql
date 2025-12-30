-- Add screenshot_url column to incidents table
-- This column stores the R2 public URL of the screenshot taken when the incident was created
ALTER TABLE incidents ADD COLUMN screenshot_url TEXT;

