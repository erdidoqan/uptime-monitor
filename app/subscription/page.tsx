'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Loader2, XCircle, ArrowRight, Sparkles } from 'lucide-react';
import { trackPurchase } from '@/lib/analytics';

type Status = 'loading' | 'success' | 'error';

function SubscriptionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const checkoutId = searchParams.get('checkout_id');
  
  const [status, setStatus] = useState<Status>('loading');
  const [countdown, setCountdown] = useState(5);
  const hasTrackedPurchase = useRef(false);

  useEffect(() => {
    if (!checkoutId) {
      // No checkout_id, show general subscription page
      setStatus('success');
      return;
    }

    // With checkout_id, we assume success (webhook will handle the actual subscription)
    // In a more robust implementation, you could verify the checkout status via Polar API
    const timer = setTimeout(() => {
      setStatus('success');
      
      // Track Purchase event for Facebook Pixel (only once per checkout)
      if (!hasTrackedPurchase.current) {
        const trackedCheckouts = sessionStorage.getItem('tracked_checkouts') || '';
        if (!trackedCheckouts.includes(checkoutId)) {
          trackPurchase({
            planName: 'Pro',
            value: 5,
            currency: 'USD',
            transactionId: checkoutId,
          });
          sessionStorage.setItem('tracked_checkouts', trackedCheckouts + ',' + checkoutId);
        }
        hasTrackedPurchase.current = true;
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [checkoutId]);

  // Countdown and redirect when success
  useEffect(() => {
    if (status !== 'success' || !checkoutId) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          router.push('/monitors');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status, checkoutId, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-white/10 bg-[#18181b]">
          <CardContent className="pt-8 pb-8 flex flex-col items-center text-center">
            <Loader2 className="h-12 w-12 text-purple-500 animate-spin mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              Ödeme doğrulanıyor...
            </h2>
            <p className="text-gray-400">
              Lütfen bekleyin, aboneliğiniz aktifleştiriliyor.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-white/10 bg-[#18181b]">
          <CardContent className="pt-8 pb-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Bir sorun oluştu
            </h2>
            <p className="text-gray-400 mb-6">
              Ödeme işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" asChild>
                <Link href="/monitors">Panele Dön</Link>
              </Button>
              <Button asChild>
                <Link href="/pricing">Tekrar Dene</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  return (
    <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-white/10 bg-[#18181b]">
        <CardHeader className="text-center pb-2">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
          <CardTitle className="text-2xl text-white flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            Pro Planına Hoş Geldiniz!
            <Sparkles className="h-5 w-5 text-purple-400" />
          </CardTitle>
          <CardDescription className="text-gray-400 text-base">
            Aboneliğiniz başarıyla aktifleştirildi
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {/* Features */}
          <div className="bg-white/5 rounded-xl p-4 mb-6">
            <h3 className="text-sm font-medium text-gray-300 mb-3">
              Artık şunlara sahipsiniz:
            </h3>
            <ul className="space-y-2">
              {[
                'Sınırsız monitör ve cron job',
                '1 dakika minimum kontrol aralığı',
                '90 gün günlük saklama',
                'E-posta ve webhook bildirimleri',
                'Tam API erişimi',
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-gray-400">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600" asChild>
              <Link href="/monitors/create">
                İlk Monitörünüzü Oluşturun
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/monitors">Panele Git</Link>
            </Button>
          </div>

          {/* Auto redirect notice */}
          {checkoutId && (
            <p className="text-center text-sm text-gray-500 mt-4">
              {countdown} saniye içinde panele yönlendirileceksiniz...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Loading fallback for Suspense
function SubscriptionLoading() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-white/10 bg-[#18181b]">
        <CardContent className="pt-8 pb-8 flex flex-col items-center text-center">
          <Loader2 className="h-12 w-12 text-purple-500 animate-spin mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            Yükleniyor...
          </h2>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense fallback={<SubscriptionLoading />}>
      <SubscriptionContent />
    </Suspense>
  );
}
