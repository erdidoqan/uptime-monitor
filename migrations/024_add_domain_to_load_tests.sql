-- Domain kolonu: günlük domain bazlı test limiti için
ALTER TABLE load_tests ADD COLUMN domain TEXT;

-- Mevcut kayıtlar için domain'i target_url'den doldur (best-effort)
-- Not: SQLite'da URL parse fonksiyonu yok, uygulama katmanında yapılacak

-- Hızlı sorgular için indexler
CREATE INDEX IF NOT EXISTS idx_load_tests_domain ON load_tests(domain);
CREATE INDEX IF NOT EXISTS idx_load_tests_user_domain ON load_tests(user_id, domain, created_at);
