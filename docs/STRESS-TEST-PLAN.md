# URL / Endpoint Stress Test – Analiz ve Uygulama Planı

## Ne yapmak istiyoruz?

Bir URL veya API endpoint’ini **yük altında test etmek**:
- Aynı anda kaç istek kaldırıyor?
- Yanıt süreleri (latency) yük artınca nasıl değişiyor?
- Hata oranı ne?

---

## Metrikler (stress test çıktısı)

| Metrik | Açıklama |
|--------|----------|
| **Total requests** | Toplam atılan istek sayısı |
| **Success / Error count** | Başarılı vs hatalı (timeout, 5xx, network error) |
| **Success rate %** | Başarılı / total |
| **Duration** | Test süresi (saniye) |
| **RPS (requests/sec)** | Saniyede ortalama istek |
| **Latency min / max / avg** | ms cinsinden |
| **Latency p50, p95, p99** | Yüzdelik dilimler (median, 95., 99. percentile) |

İsteğe bağlı: status code dağılımı (200: 950, 503: 50 gibi).

---

## Seçenek 1: Uygulama içi (Next.js API)

**Artıları:** Tek yerden tetiklenir, monitörle entegre, UI’da “Stress test” butonu eklenebilir.  
**Eksileri:** Vercel/serverless timeout (örn. 60 sn), tek instance → gerçek paralellik sınırlı.

### Nasıl yapılır?

1. **Endpoint:** `POST /api/stress-test` veya `POST /api/monitors/[id]/stress-test`
2. **Body örneği:**
   ```json
   {
     "url": "https://example.com/api/health",
     "method": "GET",
     "concurrency": 10,
     "duration_sec": 20,
     "timeout_ms": 5000
   }
   ```
3. **Limitler:** `concurrency` 5–30, `duration_sec` 15–45 (Vercel timeout’a göre).
4. **Algoritma:**
   - `duration_sec` boyunca döngü
   - Her iterasyonda `concurrency` kadar istek `Promise.all` ile at
   - Her isteğin başlangıç/bitiş zamanı ve success/error kaydet
   - Süre bitince latency’leri sıralayıp min/max/avg, p50/p95/p99 hesapla
5. **Response:** Yukarıdaki metrikleri JSON döndür.

### Teknik not

- İstekleri **doğrudan Next.js’ten** atarsan tüm trafik tek Vercel instance’ından çıkar; “dağıtık” load test olmaz ama endpoint’in kendi davranışını (latency, timeout, 5xx) görmek için yeterli olur.
- TR proxy kullanılacaksa her istek proxy’ye gideceği için proxy de yüklenir; bunu parametreyle (use_tr_proxy) aç/kapa edebilirsin.

---

## Seçenek 2: Cloudflare Worker ile stress test

**Artıları:** Worker’da paralel istek rahat, timeout/subrequest limitleri belli.  
**Eksileri:** Ayrı worker yazımı, Worker CPU ve subrequest limitleri (örn. 50 subrequest/invocation).

### Nasıl yapılır?

- Ayrı bir Worker: `POST /stress-test` body’de url, concurrency, duration.
- Worker içinde `Promise.all` ile N paralel fetch, süre dolana kadar tekrarla.
- Sonuçları (count, latency array) topla, basit istatistik hesapla, JSON dön.
- Monitör/cron tarafında “TR proxy kullan” mantığı varsa aynı URL’i proxy üzerinden de test etmek için Worker’da proxy’e istek atan path de eklenebilir.

---

## Seçenek 3: Harici araç (k6, Artillery, wrk)

**Artıları:** Gerçek load test, çok yüksek concurrency, raporlama (HTML, CSV).  
**Eksileri:** Kullanıcı kendi ortamında veya CI’da çalıştırır; uygulama içi “tek tık” değil.

### Ne yapılabilir?

- Dokümantasyonda “Stress test nasıl yapılır?” bölümü:
  - k6 veya Artillery örnek script (URL’i parametre alır).
  - İsteğe bağlı: UptimeTR’de “Stress test scriptini indir” butonu → seçilen monitörün URL’i ile doldurulmuş k6/Artillery script indirilir.
- Veya sadece “Şu URL’i stress test etmek için: `k6 run script.js`” gibi kısa rehber.

---

## Öneri (karar için)

- **Hızlı ve entegre çözüm:** Seçenek 1 (Next.js API + basit UI). Concurrency 10–20, duration 20–30 sn ile başlanabilir; ileride limitler artırılabilir veya Seçenek 2’ye taşınabilir.
- **Gerçek yük testi ihtiyacı:** Seçenek 3 (k6/Artillery) + dokümantasyon veya “script indir” özelliği.
- **Daha yüksek paralellik uygulama içinde:** Seçenek 2 (Worker) ile devam.

---

## Sonraki adım

1. **Concurrency ve süre limitlerini** netleştir (örn. max 20 paralel, 25 sn).
2. **API taslağını** yaz (request/response şeması).
3. **İlk implementasyon:** `POST /api/stress-test` + metrik hesaplama (min/max/avg, p50/p95/p99, success rate, RPS).
4. İstersen monitör detay sayfasına “Stress test” butonu ve sonuç özeti alanı eklenir.

Bu plana göre önce hangi seçeneği (1, 2 veya 3) uygulayalım?
