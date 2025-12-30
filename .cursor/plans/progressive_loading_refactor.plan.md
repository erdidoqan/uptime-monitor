# Progressive Loading ve Caching Refactor

## Sorun

Monitor detay sayfasında tüm sayfa API'den data gelmesini bekliyor. Bu kötü bir kullanıcı deneyimi oluşturuyor.

## Çözüm

Sayfa server-side'da hemen yüklensin, API'den gelen datalar sonradan progressive olarak gösterilsin. Checks datası cache'lenebilir.

## Yaklaşım

### 1. Server-side API Client

- `lib/server-api-client.ts` oluştur
- Cookie'den auth token'ı al
- Server-side fetch için kullanılacak

### 2. Cache Utility

- `lib/cache.ts` oluştur
- Memory cache (Map) + localStorage fallback
- Checks datası için cache key: `monitor-checks-${monitorId}-${timeRange}-${startDate}`

### 3. Sayfa Yapısı

- Ana sayfa: Server Component (initial monitor datası)
- `MonitorChecksClient` component: Client Component (checks datası progressive loading)
- `MonitorStatsClient` component: Client Component (stats hesaplama)

### 4. Suspense Boundaries

- Checks datası için Suspense boundary
- Her bölüm kendi loading state'ini yönetir

### 5. Loading States

- Tüm sayfa loading state'i kaldırılacak
- Sadece ilgili bölümlerde skeleton gösterilecek

## Dosya Yapısı

```javascript
app/(dashboard)/monitors/[id]/
  page.tsx (Server Component - initial monitor data)
  monitor-checks.tsx (Client Component - checks data)
  monitor-stats.tsx (Client Component - stats calculation)

lib/
  server-api-client.ts (Server-side API client)
  cache.ts (Cache utility)
```



## Implementation Steps

1. Server-side API client oluştur
2. Cache utility oluştur