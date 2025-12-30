# Vercel Deployment Rehberi

## Gerekli Environment Variables

Vercel dashboard'da aşağıdaki environment variable'ları ayarlayın:

### D1 REST Client (Database Access)
- `D1_REST_URL` = (D1 REST Worker URL'iniz, örn: `https://d1-secret-rest.erdi-doqan.workers.dev`)
- `D1_REST_SECRET` = (D1 REST Worker secret token'ınız)
- `D1_DATABASE_NAME` = (D1 database adınız, örn: `UPTIME_MONITOR`)

**Not:** Cloudflare API variable'ları (`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_D1_DATABASE_ID`, `CLOUDFLARE_D1_API_TOKEN`) **gerekmez** çünkü REST client kullanılıyor. Worker sadece Cloudflare'de çalışır ve kendi environment variable'larına sahiptir.

### NextAuth
- `AUTH_SECRET` = (Rastgele bir secret string, örn: `openssl rand -base64 32`)
- `GOOGLE_CLIENT_ID` = (Google OAuth Client ID)
- `GOOGLE_CLIENT_SECRET` = (Google OAuth Client Secret)

### NEXTAUTH_URL (opsiyonel)
- `NEXTAUTH_URL` = (Vercel deployment URL'iniz, örn: `https://your-app.vercel.app`)

### Vercel API (Status Page Domain Management - Opsiyonel)
- `VERCEL_API_TOKEN` = (Vercel API token'ınız - Settings → Tokens'dan oluşturabilirsiniz)
- `VERCEL_PROJECT_ID` = (Vercel proje ID'niz - Project Settings → General'da bulabilirsiniz)
- `VERCEL_TEAM_ID` = (Opsiyonel - Eğer team hesabı kullanıyorsanız)

**Not:** Bu environment variable'ları ayarlarsanız, status page oluşturulduğunda domain otomatik olarak Vercel'e eklenir. Ayarlanmazsa, domain ekleme işlemi atlanır ve hata oluşturmaz.

## Deployment Adımları

### 1. Vercel CLI ile Deploy

```bash
# Vercel CLI'yi global olarak yükleyin (eğer yoksa)
npm i -g vercel

# Projeyi deploy edin
vercel

# Production'a deploy edin
vercel --prod
```

### 2. Vercel Dashboard ile Deploy

1. https://vercel.com adresine gidin
2. "Add New Project" tıklayın
3. GitHub repository'nizi seçin
4. Environment Variables'ı yukarıdaki değerlerle doldurun
5. "Deploy" tıklayın

## Önemli Notlar

- **Worker ayrı deploy edilir**: `workers/scheduler` klasörü Cloudflare Workers'a deploy edilir ve kendi environment variable'larına sahiptir
- **Database**: D1 database Cloudflare'de, Vercel'den REST client üzerinden erişilebilir
- **Environment Variables**: Next.js uygulaması için sadece REST client ve NextAuth variable'ları Vercel dashboard'da ayarlanmalı
- **Worker Environment Variables**: Worker için Cloudflare API variable'ları Cloudflare Workers dashboard'da ayarlanmalı (Vercel'de değil)

## Build Settings

Vercel otomatik olarak Next.js projelerini algılar. Ekstra ayar gerekmez.

Build Command: `npm run build` (otomatik)
Output Directory: `.next` (otomatik)

