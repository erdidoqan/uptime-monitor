-- Add guest fields to monitors table for guest monitor functionality
ALTER TABLE monitors ADD COLUMN guest_ip TEXT;
ALTER TABLE monitors ADD COLUMN expires_at INTEGER;
ALTER TABLE monitors ADD COLUMN user_id TEXT;

-- Create index for guest IP lookup
CREATE INDEX IF NOT EXISTS idx_monitors_guest_ip ON monitors(guest_ip);
