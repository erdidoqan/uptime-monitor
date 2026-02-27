'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Globe, Search, Share2, Zap, Timer, Hourglass, Users, Calculator, Crown, Rss, Loader2, X, ExternalLink } from 'lucide-react';

type TrafficSource = 'direct' | 'organic' | 'social';
type SessionDuration = 'fast' | 'realistic' | 'long';

const FREE_MAX_DAILY = 50;
const PRO_MAX_DAILY = 2000;

const POLAR_CHECKOUT_URL =
  'https://buy.polar.sh/polar_cl_pbGzjD0Vi4y7yngJdFz03qka4EnPzE5JalPGR0mqJ8o';

async function openPolarCheckout() {
  try {
    const { PolarEmbedCheckout } = await import('@polar-sh/checkout/embed');
    await PolarEmbedCheckout.create(POLAR_CHECKOUT_URL, { theme: 'dark' });
  } catch {
    window.open(POLAR_CHECKOUT_URL, '_blank');
  }
}

export function CreateCampaignForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [limitLoaded, setLimitLoaded] = useState(false);

  useEffect(() => {
    api.get<{ hasActiveSubscription: boolean }>('/subscription')
      .then((res) => setIsPro(res.hasActiveSubscription))
      .catch(() => {})
      .finally(() => setLimitLoaded(true));
  }, []);

  const [urlPool, setUrlPool] = useState<string[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [discoverSource, setDiscoverSource] = useState<'rss' | 'sitemap' | 'none' | null>(null);
  const [discoverError, setDiscoverError] = useState<string | null>(null);

  const maxDaily = isPro ? PRO_MAX_DAILY : FREE_MAX_DAILY;

  const [form, setForm] = useState({
    name: '',
    url: '',
    daily_visitors: 50,
    traffic_source: 'organic' as TrafficSource,
    session_duration: 'realistic' as SessionDuration,
    use_proxy: false,
    browsers_per_run: 3,
    tabs_per_browser: 10,
  });

  const estimates = useMemo(() => {
    const visitsPerRun = form.browsers_per_run * form.tabs_per_browser;
    const runsPerDay = Math.ceil(form.daily_visitors / visitsPerRun);
    return { visitsPerRun, runsPerDay };
  }, [form.daily_visitors, form.browsers_per_run, form.tabs_per_browser]);

  async function handleDiscover() {
    if (!form.url.trim() || !form.url.startsWith('http')) {
      setDiscoverError('Önce geçerli bir URL girin');
      return;
    }
    setDiscovering(true);
    setDiscoverError(null);
    setDiscoverSource(null);
    try {
      const res = await api.post<{ urls: string[]; source: 'rss' | 'sitemap' | 'none' }>(
        '/traffic-campaigns/discover',
        { url: form.url }
      );
      setDiscoverSource(res.source);
      if (res.urls.length > 0) {
        setUrlPool(res.urls);
      } else {
        setUrlPool([]);
        setDiscoverError('RSS veya Sitemap bulunamadı. Tüm trafik ana URL\'e gönderilecek.');
      }
    } catch (err) {
      if (err instanceof ApiError && (err as any).requiresPro) {
        setDiscoverError('Bu özellik Pro plana özeldir.');
      } else {
        setDiscoverError('URL keşfi sırasında hata oluştu');
      }
    } finally {
      setDiscovering(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError('Kampanya adı gerekli');
      return;
    }
    if (!form.url.trim() || !form.url.startsWith('http')) {
      setError('Geçerli bir URL girin (https://...)');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/traffic-campaigns', {
        name: form.name,
        url: form.url,
        daily_visitors: form.daily_visitors,
        browsers_per_run: form.browsers_per_run,
        tabs_per_browser: form.tabs_per_browser,
        traffic_source: form.traffic_source,
        session_duration: form.session_duration,
        use_proxy: form.use_proxy ? 1 : 0,
        url_pool: urlPool.length > 0 ? urlPool : null,
      });
      router.push('/traffic-campaigns');
    } catch (err) {
      console.error('Failed to create campaign:', err);
      if (err instanceof ApiError) {
        setError(err.message || 'Kampanya oluşturulamadı');
      } else {
        setError('Kampanya oluşturulamadı');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-12">
        {/* Basic info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <h2 className="text-lg font-semibold mb-2">Kampanya bilgileri</h2>
            <p className="text-sm text-muted-foreground">
              Trafik göndermek istediğiniz web sitesini ve kampanya detaylarını belirleyin.
            </p>
          </div>

          <div className="lg:col-span-2">
            <Card className="border gap-0">
              <CardContent className="px-6 py-6 space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Kampanya adı</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Örn: Ana sayfa trafik kampanyası"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Hedef URL</Label>
                  <Input
                    type="url"
                    value={form.url}
                    onChange={(e) => setForm((prev) => ({ ...prev, url: e.target.value }))}
                    placeholder="https://example.com"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Trafik gönderilecek web sayfasının tam adresi.
                  </p>

                  {isPro ? (
                    <div className="space-y-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={discovering || !form.url.trim()}
                        onClick={(e) => { e.preventDefault(); handleDiscover(); }}
                        className="gap-2"
                      >
                        {discovering ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Rss className="h-4 w-4" />
                        )}
                        {discovering ? 'Keşfediliyor...' : 'Sayfa Linklerini Yükle'}
                      </Button>

                      {discoverSource && discoverSource !== 'none' && urlPool.length > 0 && (
                        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              {discoverSource === 'rss' ? 'RSS' : 'Sitemap'} — {urlPool.length} sayfa bulundu
                            </span>
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); setUrlPool([]); setDiscoverSource(null); }}
                              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              Temizle
                            </button>
                          </div>
                          <div className="max-h-48 overflow-y-auto space-y-1">
                            {urlPool.map((u, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs group">
                                <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="truncate flex-1">{new URL(u).pathname}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setUrlPool(prev => prev.filter((_, idx) => idx !== i));
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                >
                                  <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                </button>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Trafik bu sayfalar arasında dağıtılacak.
                          </p>
                        </div>
                      )}

                      {discoverError && (
                        <p className="text-xs text-amber-500">{discoverError}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      <Crown className="h-3 w-3 inline mr-1" />
                      Pro ile site sayfalarınızı otomatik keşfedebilirsiniz.{' '}
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); openPolarCheckout(); }}
                        className="text-purple-400 hover:text-purple-300 font-medium cursor-pointer"
                      >
                        Pro&apos;ya geç →
                      </button>
                    </p>
                  )}
                </div>

                <div className="border-t -mx-6" />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Günlük ziyaretçi</Label>
                    <span className="text-sm font-semibold text-primary">{form.daily_visitors}/gün</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={maxDaily}
                    step={10}
                    value={Math.min(form.daily_visitors, maxDaily)}
                    onChange={(e) => setForm((prev) => ({ ...prev, daily_visitors: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>10</span>
                    {isPro ? (
                      <>
                        <span>500</span>
                        <span>1000</span>
                        <span>2000</span>
                      </>
                    ) : (
                      <>
                        <span>30</span>
                        <span>50</span>
                      </>
                    )}
                  </div>
                  {!isPro && (
                    <p className="text-xs text-muted-foreground">
                      Ücretsiz planda günlük en fazla {FREE_MAX_DAILY} ziyaretçi.{' '}
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); openPolarCheckout(); }}
                        className="text-purple-400 hover:text-purple-300 font-medium cursor-pointer"
                      >
                        Pro ile 2000&apos;e kadar →
                      </button>
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Traffic source */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <h2 className="text-lg font-semibold mb-2">Trafik kaynağı</h2>
            <p className="text-sm text-muted-foreground">
              Ziyaretçilerin hangi kaynaktan geldiği görünsün? Analytics raporlarınızda bu kaynak görünecektir.
            </p>
          </div>

          <div className="lg:col-span-2">
            <Card className="border gap-0">
              <CardContent className="px-6 py-6">
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setForm((prev) => ({ ...prev, traffic_source: 'direct' })); }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      form.traffic_source === 'direct'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    <Globe className="h-5 w-5" />
                    <span className="text-sm font-medium">Doğrudan</span>
                    <span className="text-xs text-muted-foreground text-center">Direkt URL ziyareti</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setForm((prev) => ({ ...prev, traffic_source: 'organic' })); }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      form.traffic_source === 'organic'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    <Search className="h-5 w-5" />
                    <span className="text-sm font-medium">Organik</span>
                    <span className="text-xs text-muted-foreground text-center">Google, Bing, Yahoo</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setForm((prev) => ({ ...prev, traffic_source: 'social' })); }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      form.traffic_source === 'social'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    <Share2 className="h-5 w-5" />
                    <span className="text-sm font-medium">Sosyal</span>
                    <span className="text-xs text-muted-foreground text-center">Facebook, X, Instagram</span>
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Session duration */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <h2 className="text-lg font-semibold mb-2">Oturum süresi</h2>
            <p className="text-sm text-muted-foreground">
              Ziyaretçilerin sayfada ne kadar kalacağını belirler. Daha uzun oturumlar daha düşük bounce rate sağlar.
            </p>
          </div>

          <div className="lg:col-span-2">
            <Card className="border gap-0">
              <CardContent className="px-6 py-6">
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setForm((prev) => ({ ...prev, session_duration: 'fast' })); }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      form.session_duration === 'fast'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    <Zap className="h-5 w-5" />
                    <span className="text-sm font-medium">Hızlı</span>
                    <span className="text-xs text-muted-foreground text-center">~2s kalma</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setForm((prev) => ({ ...prev, session_duration: 'realistic' })); }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      form.session_duration === 'realistic'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    <Timer className="h-5 w-5" />
                    <span className="text-sm font-medium">Gerçekçi</span>
                    <span className="text-xs text-muted-foreground text-center">~15s, düşük bounce rate</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setForm((prev) => ({ ...prev, session_duration: 'long' })); }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      form.session_duration === 'long'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    <Hourglass className="h-5 w-5" />
                    <span className="text-sm font-medium">Uzun</span>
                    <span className="text-xs text-muted-foreground text-center">~30s, çok düşük bounce rate</span>
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Proxy settings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <h2 className="text-lg font-semibold mb-2">Ek ayarlar</h2>
            <p className="text-sm text-muted-foreground">
              Kampanya 7/24 çalışır ve ziyaretçileri güne eşit dağıtır.
            </p>
          </div>

          <div className="lg:col-span-2">
            <Card className="border gap-0">
              <CardContent className="px-6 py-6 space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="use_proxy"
                    checked={form.use_proxy}
                    onCheckedChange={(checked) => setForm((prev) => ({ ...prev, use_proxy: checked === true }))}
                  />
                  <Label htmlFor="use_proxy" className="text-sm font-semibold cursor-pointer">
                    🇹🇷 Türk kullanıcılar
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Trafik Türkiye IP adreslerinden gönderilir. Türkiye hedefli siteler için önerilir.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Estimates */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <h2 className="text-lg font-semibold mb-2">Tahmini bilgiler</h2>
            <p className="text-sm text-muted-foreground">
              Seçimlerinize göre hesaplanan tahmini kampanya performansı.
            </p>
          </div>

          <div className="lg:col-span-2">
            <Card className="border gap-0">
              <CardContent className="px-6 py-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted/30">
                    <Users className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                    <div className="text-lg font-semibold">{form.daily_visitors}</div>
                    <div className="text-xs text-muted-foreground">Günlük ziyaretçi</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/30">
                    <Calculator className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                    <div className="text-lg font-semibold">{estimates.visitsPerRun}</div>
                    <div className="text-xs text-muted-foreground">Çalıştırma başına ziyaret</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/30">
                    <Zap className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                    <div className="text-lg font-semibold">{estimates.runsPerDay}</div>
                    <div className="text-xs text-muted-foreground">Günlük çalıştırma</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-6 p-4 rounded-md bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive">{error}</p>
          {!isPro && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); openPolarCheckout(); }}
              className="mt-3 w-full py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold text-sm cursor-pointer hover:from-purple-600 hover:to-pink-600 transition-colors flex items-center justify-center gap-2"
            >
              <Crown className="h-4 w-4" />
              Pro Planına Geç — $5/ay
            </button>
          )}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          İptal
        </Button>
        <Button type="submit" disabled={submitting || !limitLoaded}>
          {submitting ? 'Oluşturuluyor...' : 'Kampanya Oluştur'}
        </Button>
      </div>
    </form>
  );
}
