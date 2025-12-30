# Wildcard DNS Yapılandırması (Cloudflare + Vercel)

## Otomatik Subdomain Yönlendirme

Bu yapılandırma ile `*.cronuptime.com` formatındaki tüm subdomain'ler otomatik olarak Vercel'e yönlendirilir ve middleware tarafından status page olarak handle edilir.

## 1. Cloudflare DNS Yapılandırması

### Adım 1: Cloudflare Dashboard'a Git
1. https://dash.cloudflare.com → DNS → Records
2. `cronuptime.com` domain'ini seç

### Adım 2: Wildcard CNAME Kaydı Ekle

**Mevcut Kayıtlar:**
- `cronuptime.com` → A veya CNAME (Vercel'e yönlendirilmeli)
- `www.cronuptime.com` → CNAME (Vercel'e yönlendirilmeli)

**Yeni Kayıt:**
```
Type: CNAME
Name: *
Target: 5a8da7d22c26a582.vercel-dns-016.com (www için kullandığınız aynı CNAME target)
Proxy status: DNS only (Gray Cloud) veya Proxied (Orange Cloud)
TTL: Auto
```

**ÖNEMLİ:** 
- `www` için kullandığınız CNAME target'ını (`5a8da7d22c26a582.vercel-dns-016.com`) wildcard için de kullanın
- `ns1.vercel-dns.com` veya genel `cname.vercel-dns.com` kullanmayın
- Her Vercel projesinin kendine özel CNAME target'ı vardır

**Not:** 
- `*` wildcard karakteri tüm subdomain'leri kapsar
- `digitexa.cronuptime.com`, `test.cronuptime.com`, `xyz.cronuptime.com` gibi tüm subdomain'ler otomatik olarak Vercel'e yönlendirilir

### Adım 3: DNS Kayıt Sırası

Cloudflare'de kayıtlar şu sırada olmalı:

1. `cronuptime.com` (root domain) → Vercel
2. `www.cronuptime.com` → Vercel  
3. `*` (wildcard) → Vercel

**Önemli:** Wildcard kaydı, spesifik kayıtlardan sonra gelmelidir. Cloudflare otomatik olarak en spesifik kaydı kullanır.

## 2. Vercel Domain Yapılandırması

### Adım 1: Vercel Dashboard
1. https://vercel.com/dashboard → Proje → Settings → Domains

### Adım 2: Wildcard Domain Ekle

**Mevcut Domain'ler:**
- `cronuptime.com`
- `www.cronuptime.com`

**Yeni Domain:**
- `*.cronuptime.com` (wildcard domain)

**Not:** Vercel wildcard domain'leri destekler. `*.cronuptime.com` ekleyerek tüm subdomain'leri kapsayabilirsiniz.

### Adım 3: Domain Doğrulama

Vercel otomatik olarak wildcard domain'i doğrular. DNS kayıtları doğruysa "Valid Configuration" görünür.

## 3. Middleware Yapılandırması

Middleware zaten wildcard subdomain'leri handle ediyor:

```typescript
// middleware.ts
// Herhangi bir *.cronuptime.com subdomain'i otomatik olarak
// /status-public/[subdomain] route'una rewrite edilir
```

**Çalışma Mantığı:**
1. `digitexa.cronuptime.com` isteği gelir
2. Middleware subdomain'i (`digitexa`) algılar
3. `/status-public/digitexa` route'una rewrite eder
4. Status page component'i render edilir

## 4. Test Etme

### DNS Propagation Kontrolü
```bash
# Wildcard DNS kaydını kontrol et
dig *.cronuptime.com CNAME

# Spesifik subdomain'i test et
dig digitexa.cronuptime.com CNAME
nslookup digitexa.cronuptime.com
```

### Tarayıcıda Test
1. `https://digitexa.cronuptime.com` → Status page yüklenmeli
2. `https://test.cronuptime.com` → Status page yüklenmeli (eğer veritabanında varsa)
3. `https://cronuptime.com` → Ana sayfa (status page değil)

## 5. Sorun Giderme

### Problem: Subdomain'ler çalışmıyor
**Çözüm:**
- Cloudflare'de wildcard kaydının doğru olduğundan emin ol
- Vercel'de wildcard domain'in eklendiğini kontrol et
- DNS propagation için 24-48 saat bekle

### Problem: Ana domain (cronuptime.com) çalışmıyor
**Çözüm:**
- Root domain kaydının wildcard'tan önce geldiğinden emin ol
- Cloudflare'de kayıt sırasını kontrol et

### Problem: "Invalid Configuration" hatası (Vercel'de wildcard domain)
**Çözüm:**
- **ÖNEMLİ:** Vercel nameserver değişikliği istiyor ama Cloudflare kullanıyorsanız **nameserver değiştirmenize gerek yok!**
- Cloudflare'de wildcard CNAME kaydı oluşturun:
  - `cronuptime.com` için kullandığınız CNAME target'ını bulun (Vercel'de `cronuptime.com` domain'inin "Edit" butonuna tıklayarak görebilirsiniz)
  - Aynı target'ı wildcard (`*`) için de kullanın
- Vercel "Invalid Configuration" gösterse bile, Cloudflare'de doğru CNAME kaydı varsa çalışır
- Test: `dig digitexa.cronuptime.com CNAME` komutu ile DNS kaydını kontrol edin
- Eğer CNAME kaydı doğruysa, Vercel'deki "Invalid Configuration" uyarısını görmezden gelebilirsiniz

## 6. Güvenlik Notları

### Wildcard DNS Güvenlik
- Wildcard DNS tüm subdomain'leri kapsar
- Middleware'de subdomain validation yapılıyor
- Sadece veritabanında kayıtlı status page'ler gösterilir
- Kayıtlı olmayan subdomain'ler için 404 döner

### Rate Limiting
- Cloudflare'de rate limiting ayarları yapılabilir
- Vercel'de de rate limiting mevcuttur

## 7. Örnek Yapılandırma

### Cloudflare DNS Kayıtları:
```
Type    Name    Target                              Proxy
A       @       216.150.1.1                        DNS only
CNAME   www     5a8da7d22c26a582.vercel-dns-016.com DNS only
CNAME   *       5a8da7d22c26a582.vercel-dns-016.com DNS only
```

**Not:** 
- Root domain (`cronuptime.com`) için A kaydı: `216.150.1.1` (Vercel IP)
- `www` ve wildcard (`*`) için aynı CNAME target kullanılır: `5a8da7d22c26a582.vercel-dns-016.com`

### Vercel Domain'ler:
- `cronuptime.com`
- `www.cronuptime.com`
- `*.cronuptime.com` (wildcard)

### Sonuç:
- `cronuptime.com` → Ana sayfa
- `www.cronuptime.com` → Ana sayfa
- `digitexa.cronuptime.com` → Status page (otomatik)
- `test.cronuptime.com` → Status page (otomatik)
- `xyz.cronuptime.com` → Status page (otomatik)

## 8. Otomatik Domain Yönetimi (Vercel API)

Status page oluşturulduğunda domain otomatik olarak Vercel'e eklenebilir:

### Environment Variables
Vercel dashboard'da şu environment variable'ları ayarlayın:
- `VERCEL_API_TOKEN` = Vercel API token (Settings → Tokens)
- `VERCEL_PROJECT_ID` = Vercel proje ID (Project Settings → General)
- `VERCEL_TEAM_ID` = (Opsiyonel) Team ID (eğer team hesabı kullanıyorsanız)

### Nasıl Çalışır?
1. Kullanıcı status page oluşturur (örn: subdomain = "digitexa")
2. Sistem otomatik olarak `digitexa.cronuptime.com` domain'ini Vercel'e ekler
3. Status page silindiğinde domain otomatik olarak Vercel'den kaldırılır
4. Subdomain değiştiğinde eski domain kaldırılır, yeni domain eklenir

**Not:** Environment variable'lar ayarlanmazsa, domain ekleme işlemi atlanır ve hata oluşturmaz.

## 9. Performans

- Wildcard DNS kayıtları Cloudflare tarafından cache'lenir
- Middleware'de subdomain lookup cache'lenir (5 dakika TTL)
- Vercel edge network'ü tüm subdomain'leri handle eder

