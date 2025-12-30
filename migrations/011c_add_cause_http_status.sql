-- cause ve http_status sütunlarını ekle (zaten varsa hata verir, görmezden gelin)
ALTER TABLE incidents ADD COLUMN cause TEXT;
ALTER TABLE incidents ADD COLUMN http_status INTEGER;

