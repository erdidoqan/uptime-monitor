'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Crown, Zap, Clock, Mail, Code, AlertCircle, ExternalLink, Loader2, CheckCircle } from 'lucide-react';

const POLAR_CHECKOUT_URL = 'https://buy.polar.sh/polar_cl_pbGzjD0Vi4y7yngJdFz03qka4EnPzE5JalPGR0mqJ8o';

interface SubscriptionData {
  subscription: {
    id: string;
    status: 'active' | 'inactive' | 'canceled' | 'past_due';
    plan: string;
    current_period_end: number | null;
    created_at: number;
  } | null;
  resourceCount: {
    monitors: number;
    cron_jobs: number;
    total: number;
  };
  canCreateResource: boolean;
  hasActiveSubscription: boolean;
  freeLimit: number;
}

const proFeatures = [
  { icon: Zap, text: 'Sınırsız monitör ve cron job' },
  { icon: Clock, text: '1 dakika minimum kontrol aralığı' },
  { icon: Mail, text: 'E-posta ve webhook bildirimleri' },
  { icon: Code, text: 'Tam API erişimi' },
];

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSubscription() {
      try {
        const response = await api.get<SubscriptionData>('/subscription');
        setData(response);
      } catch (err) {
        console.error('Failed to load subscription:', err);
        setError('Abonelik bilgisi yüklenemedi');
      } finally {
        setLoading(false);
      }
    }
    fetchSubscription();
  }, []);

  // Preload Polar checkout module
  useEffect(() => {
    import('@polar-sh/checkout/embed').catch(console.error);
  }, []);

  // Open checkout modal
  const openCheckout = useCallback(async () => {
    setCheckoutLoading(true);
    try {
      const { PolarEmbedCheckout } = await import('@polar-sh/checkout/embed');
      await PolarEmbedCheckout.create(POLAR_CHECKOUT_URL, { theme: 'dark' });
    } catch {
      // Fallback: open in new tab
      window.open(POLAR_CHECKOUT_URL, '_blank');
    } finally {
      setCheckoutLoading(false);
    }
  }, []);

  const handleManageSubscription = () => {
    // Polar customer portal - kullanıcı burada aboneliğini yönetebilir
    window.open('https://polar.sh/purchases/subscriptions', '_blank');
  };

  if (loading) {
    return (
      <div className="flex flex-col mx-auto px-5 py-8 lg:pt-20 max-w-[800px]">
        <h1 className="text-2xl font-bold mb-6">Ayarlar</h1>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col mx-auto px-5 py-8 lg:pt-20 max-w-[800px]">
        <h1 className="text-2xl font-bold mb-6">Ayarlar</h1>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-500">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const subscription = data?.subscription;
  const hasActiveSubscription = data?.hasActiveSubscription || false;
  const resourceCount = data?.resourceCount || { monitors: 0, cron_jobs: 0, total: 0 };

  return (
    <div className="flex flex-col mx-auto px-5 py-8 lg:pt-20 max-w-[800px]">
      <h1 className="text-2xl font-bold mb-6">Ayarlar</h1>

      <div className="grid gap-6">
        {/* Usage Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle>Kullanım</CardTitle>
            <CardDescription>Mevcut kaynaklarınız</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <span className="text-3xl font-bold">{resourceCount.monitors}</span>
                <p className="text-sm text-muted-foreground mt-1">Monitör</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <span className="text-3xl font-bold">{resourceCount.cron_jobs}</span>
                <p className="text-sm text-muted-foreground mt-1">Cron Job</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {hasActiveSubscription ? (
                    <>
                      <Crown className="h-5 w-5 text-purple-500" />
                      Pro Plan
                    </>
                  ) : (
                    'Ücretsiz Plan'
                  )}
                </CardTitle>
                <CardDescription>
                  {hasActiveSubscription
                    ? 'Tüm özelliklere erişiminiz var'
                    : 'Sınırsız kaynak için Pro planına yükseltin'}
                </CardDescription>
              </div>
              <Badge variant={hasActiveSubscription ? 'default' : 'secondary'}>
                {hasActiveSubscription ? 'Aktif' : 'Ücretsiz'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {hasActiveSubscription ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Plan</p>
                    <p className="font-medium">Pro - $5/ay</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Durum</p>
                    <p className="font-medium flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Aktif
                    </p>
                  </div>
                  {subscription?.current_period_end && (
                    <>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Sonraki Ödeme</p>
                        <p className="font-medium">
                          {new Date(subscription.current_period_end).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Başlangıç</p>
                        <p className="font-medium">
                          {new Date(subscription.created_at).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                    </>
                  )}
                </div>
                <Button variant="outline" onClick={handleManageSubscription} className="w-full">
                  Aboneliği Yönet
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <Crown className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-semibold">Pro Plan</p>
                      <p className="text-sm text-muted-foreground">Sınırsız kaynak</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold">$5</span>
                    <span className="text-muted-foreground text-sm">/ay</span>
                  </div>
                </div>

                <ul className="grid grid-cols-2 gap-2">
                  {proFeatures.map((feature) => (
                    <li key={feature.text} className="flex items-center gap-2 text-sm p-2 bg-muted/30 rounded-md">
                      <feature.icon className="h-4 w-4 text-purple-500 shrink-0" />
                      <span className="text-muted-foreground">{feature.text}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  type="button"
                  onClick={openCheckout}
                  disabled={checkoutLoading}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                >
                  {checkoutLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Yükleniyor...
                    </>
                  ) : (
                    "Pro'ya Yükselt"
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
