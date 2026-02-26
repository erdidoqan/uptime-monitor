-- Remove foreign key constraint from status_pages table
-- SQLite doesn't support ALTER TABLE DROP CONSTRAINT, so we need to recreate the table

-- Step 1: Create new table without foreign key
CREATE TABLE status_pages_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_name TEXT NOT NULL,
  subdomain TEXT NOT NULL UNIQUE,
  custom_domain TEXT,
  logo_url TEXT,
  logo_link_url TEXT,
  contact_url TEXT,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Step 2: Copy data
INSERT INTO status_pages_new SELECT * FROM status_pages;

-- Step 3: Drop old table
DROP TABLE status_pages;

-- Step 4: Rename new table
ALTER TABLE status_pages_new RENAME TO status_pages;

-- Step 5: Recreate index
CREATE INDEX IF NOT EXISTS idx_status_pages_user_id ON status_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_status_pages_subdomain ON status_pages(subdomain);
