-- incident_events tablosu (timeline için)
-- Bu tablo henüz oluşturulmamışsa oluştur
CREATE TABLE IF NOT EXISTS incident_events (
  id TEXT PRIMARY KEY,
  incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id),
  event_type TEXT NOT NULL, -- 'comment', 'started', 'resolved', 'auto_resolved'
  content TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_incident_events_incident ON incident_events(incident_id, created_at DESC);

