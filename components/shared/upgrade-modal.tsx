'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Sparkles, Zap, Clock, Mail, Code, Loader2 } from 'lucide-react';
import { trackInitiateCheckout } from '@/lib/analytics';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  currentCount?: number;
}

const POLAR_CHECKOUT_URL = 'https://buy.polar.sh/polar_cl_pbGzjD0Vi4y7yngJdFz03qka4EnPzE5JalPGR0mqJ8o';

const features = [
  {
    icon: Zap,
    title: 'Sınırsız Monitör & Cron Job',
    description: 'İstediğiniz kadar kaynak oluşturun',
  },
  {
    icon: Clock,
    title: '1 Dakika Minimum Aralık',
    description: 'Daha sık kontrol imkanı',
  },
  {
    icon: Mail,
    title: 'E-posta & Webhook Bildirimleri',
    description: 'Anlık uyarılar alın',
  },
  {
    icon: Code,
    title: 'Tam API Erişimi',
    description: 'Entegrasyonlarınızı oluşturun',
  },
];

export function UpgradeModal({ open, onClose, currentCount = 1 }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false);

  // Preload Polar checkout module when modal opens
  useEffect(() => {
    if (open) {
      import('@polar-sh/checkout/embed').catch(console.error);
    }
  }, [open]);

  // Open checkout modal
  const openCheckout = useCallback(async () => {
    // Track InitiateCheckout event for Facebook Pixel
    trackInitiateCheckout({
      planName: 'Pro',
      value: 5,
      currency: 'USD',
    });
    
    setLoading(true);
    try {
      const { PolarEmbedCheckout } = await import('@polar-sh/checkout/embed');
      await PolarEmbedCheckout.create(POLAR_CHECKOUT_URL, { theme: 'dark' });
      onClose(); // Close the upgrade modal after checkout opens
    } catch {
      // Fallback: open in new tab
      window.open(POLAR_CHECKOUT_URL, '_blank');
    } finally {
      setLoading(false);
    }
  }, [onClose]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-[#18181b] border-white/10">
        <DialogHeader className="text-center pb-2">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="h-8 w-8 text-purple-400" />
          </div>
          <DialogTitle className="text-xl text-white">
            Pro Planına Yükseltin
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Ücretsiz planda {currentCount} kaynak limitine ulaştınız.
            Sınırsız kaynak için Pro planına geçin.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Price */}
          <div className="text-center mb-6">
            <div className="inline-flex items-baseline gap-1">
              <span className="text-4xl font-bold text-white">$5</span>
              <span className="text-gray-400">/ay</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              İstediğiniz zaman iptal edin
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3 mb-6">
            {features.map((feature) => (
              <div key={feature.title} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                  <feature.icon className="h-4 w-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{feature.title}</p>
                  <p className="text-xs text-gray-500">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <Button
              type="button"
              onClick={openCheckout}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Yükleniyor...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Pro Planına Geç
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
              className="w-full text-gray-400 hover:text-white"
            >
              Daha Sonra
            </Button>
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-500">
            <span>Güvenli ödeme</span>
            <span>•</span>
            <span>Anında aktivasyon</span>
            <span>•</span>
            <span>7/24 destek</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
