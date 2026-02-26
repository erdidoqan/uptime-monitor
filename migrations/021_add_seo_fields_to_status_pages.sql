-- Add SEO fields to status_pages table
ALTER TABLE status_pages ADD COLUMN custom_title TEXT;
ALTER TABLE status_pages ADD COLUMN custom_description TEXT;
