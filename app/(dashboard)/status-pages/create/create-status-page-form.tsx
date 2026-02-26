'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Info, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const POLAR_CHECKOUT_URL = 'https://buy.polar.sh/polar_cl_pbGzjD0Vi4y7yngJdFz03qka4EnPzE5JalPGR0mqJ8o';

interface SubscriptionData {
  hasActiveSubscription: boolean;
}

export function CreateStatusPageForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState<boolean | null>(null);
  
  const [form, setForm] = useState({
    company_name: '',
    subdomain: '',
    logo_link_url: '',
    contact_url: '',
    custom_domain: '',
  });

  // Check subscription status on mount
  useEffect(() => {
    async function checkSubscription() {
      try {
        const response = await api.get<SubscriptionData>('/subscription');
        setHasActiveSubscription(response.hasActiveSubscription);
      } catch (err) {
        console.error('Failed to check subscription:', err);
        setHasActiveSubscription(false);
      }
    }
    checkSubscription();
  }, []);

  // Preload Polar checkout module
  useEffect(() => {
    import('@polar-sh/checkout/embed').catch(console.error);
  }, []);

  // Open Polar checkout
  const openCheckout = useCallback(async () => {
    setCheckoutLoading(true);
    try {
      const { PolarEmbedCheckout } = await import('@polar-sh/checkout/embed');
      await PolarEmbedCheckout.create(POLAR_CHECKOUT_URL, { theme: 'dark' });
    } catch {
      window.open(POLAR_CHECKOUT_URL, '_blank');
    } finally {
      setCheckoutLoading(false);
    }
  }, []);

  // Generate subdomain from company name
  const generateSubdomain = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 30);
  };

  const handleCompanyNameChange = (value: string) => {
    setForm(prev => ({
      ...prev,
      company_name: value,
      // Auto-generate subdomain if it hasn't been manually edited
      subdomain: prev.subdomain === generateSubdomain(prev.company_name) || prev.subdomain === ''
        ? generateSubdomain(value)
        : prev.subdomain,
    }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.company_name.trim()) {
      setError('Şirket adı gerekli');
      return;
    }

    if (!form.subdomain.trim()) {
      setError('Alt alan adı gerekli');
      return;
    }

    // Validate subdomain format
    const subdomainRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
    if (!subdomainRegex.test(form.subdomain.toLowerCase())) {
      setError('Alt alan adı alfanümerik olmalı ve tire içerebilir (başta veya sonda olamaz)');
      return;
    }

    // If user has Pro subscription, create status page directly
    if (hasActiveSubscription) {
      setLoading(true);
      try {
        const response = await api.post<{ id: string }>('/status-pages', {
          company_name: form.company_name.trim(),
          subdomain: form.subdomain.toLowerCase().trim(),
          logo_link_url: form.logo_link_url.trim() || null,
          contact_url: form.contact_url.trim() || null,
          custom_domain: form.custom_domain.trim() || null,
        });
        router.push(`/status-pages/${response.id}/edit`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Durum sayfası oluşturulamadı';
        setError(message);
      } finally {
        setLoading(false);
      }
    } else {
      // Status pages require Pro subscription - open checkout
      openCheckout();
    }
  }

  return (
    <div className="flex flex-col mx-auto px-5 py-8 lg:pt-20 max-w-[1040px] h-[calc(100%-52px)]">
      <div className="mb-6">
        <Link href="/status-pages" className="text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="inline mr-2 h-4 w-4" />
          Durum Sayfaları
        </Link>
        <span className="text-sm text-muted-foreground mx-2">/</span>
        <span className="text-sm font-medium">Durum sayfası oluştur</span>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-12">
          {/* Basic information */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-lg font-semibold">Temel bilgiler</h2>
                {hasActiveSubscription === false && (
                  <span className="text-xs bg-muted px-2 py-0.5 rounded">Pro Gerekli</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Herkese açık bir durum sayfası, kullanıcılarınızı hizmetlerinizin çalışma durumu hakkında bilgilendirir.
              </p>
            </div>

            <div className="lg:col-span-2">
              <Card className="border">
                <CardContent className="px-6 py-6 space-y-6">
                  {/* Company name and Subdomain - side by side */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">
                        Şirket adı <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        value={form.company_name}
                        onChange={(e) => handleCompanyNameChange(e.target.value)}
                        placeholder="Digitexa"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">
                        Alt alan adı <span className="text-red-500">*</span>
                      </Label>
                      <div className="flex">
                        <Input
                          value={form.subdomain}
                          onChange={(e) => setForm(prev => ({ ...prev, subdomain: e.target.value.toLowerCase() }))}
                          placeholder="digitexa"
                          className="rounded-r-none"
                          required
                        />
                        <div className="flex items-center px-3 bg-muted border border-l-0 rounded-r-md text-sm text-muted-foreground">
                          .uptimetr.com
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Aşağıdan özel alan adı yapılandırabilirsiniz.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Links & URLs */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <h2 className="text-lg font-semibold mb-2">Bağlantılar & URL&apos;ler</h2>
              <p className="text-sm text-muted-foreground">
                Kullanıcılarınız web sitenizi ziyaret etmek istediğinde onları nereye yönlendirelim?
              </p>
            </div>

            <div className="lg:col-span-2">
              <Card className="border">
                <CardContent className="px-6 py-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Logonuz hangi URL&apos;ye yönlendirsin?</Label>
                      <Input
                        type="url"
                        value={form.logo_link_url}
                        onChange={(e) => setForm(prev => ({ ...prev, logo_link_url: e.target.value }))}
                        placeholder="https://stripe.com"
                      />
                      <p className="text-xs text-muted-foreground">Şirketinizin ana sayfası nedir?</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">İletişim URL&apos;si</Label>
                      <Input
                        type="url"
                        value={form.contact_url}
                        onChange={(e) => setForm(prev => ({ ...prev, contact_url: e.target.value }))}
                        placeholder="https://stripe.com/support"
                      />
                      <p className="text-xs text-muted-foreground">
                        mailto:support@stripe.com kullanabilirsiniz. &apos;İletişim&apos; butonu olmasın istiyorsanız boş bırakın.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Personalization - disabled for now */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 opacity-50">
            <div className="lg:col-span-1">
              <h2 className="text-lg font-semibold mb-2">Kişiselleştirme</h2>
              <p className="text-sm text-muted-foreground">
                Durum sayfanızın görünümünü kişiselleştirmek için logonuzu yükleyin.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Karanlık tema, çeviriler ve özel favicon gibi en son özellikler için modern görünümü kullanın.
              </p>
            </div>

            <div className="lg:col-span-2">
              <Card className="border">
                <CardContent className="px-6 py-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Logo</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-not-allowed">
                            <p className="text-sm text-muted-foreground">
                              Sürükle & bırak veya tıklayarak seçin
                            </p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Logo yükleme, durum sayfası oluşturduktan sonra kullanılabilir olacak</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Custom domain */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <h2 className="text-lg font-semibold mb-2">Özel alan adı</h2>
              <p className="text-sm text-muted-foreground">
                Markalı bir deneyim için durum sayfanızı özel bir alt alan adına dağıtın.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Kurulum konusunda yardıma mı ihtiyacınız var?{' '}
                <a href="#" className="text-primary hover:underline">Bize bildirin</a>
              </p>
            </div>

            <div className="lg:col-span-2">
              <Card className="border">
                <CardContent className="px-6 py-6 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Özel alan adı</Label>
                    <Input
                      value={form.custom_domain}
                      onChange={(e) => setForm(prev => ({ ...prev, custom_domain: e.target.value }))}
                      placeholder="status.stripe.com"
                    />
                  </div>
                  {form.custom_domain && (
                    <div className="bg-muted/50 rounded-lg p-4 text-sm">
                      <p>
                        Lütfen <strong>{form.custom_domain || 'status.example.com'}</strong> adresini aşağıdaki CNAME kayıtlarını yapılandırarak UptimeTR&apos;ye yönlendirin.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Structure & other tabs info */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 opacity-50">
            <div className="lg:col-span-1">
              <h2 className="text-lg font-semibold mb-2">Yapı & Diğer</h2>
              <p className="text-sm text-muted-foreground">
                Durum sayfasını oluşturduktan sonra yapı, durum güncellemeleri, bakım pencereleri, aboneler ve çevirileri yapılandırın.
              </p>
            </div>

            <div className="lg:col-span-2">
              <Card className="border">
                <CardContent className="px-6 py-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Info className="h-4 w-4" />
                    <p>Bu ayarlar durum sayfasını oluşturduktan sonra kullanılabilir olacak.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Submit buttons */}
        <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            İptal
          </Button>
          <Button 
            type="submit" 
            disabled={loading || checkoutLoading || hasActiveSubscription === null}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            {(loading || checkoutLoading) ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Yükleniyor...
              </>
            ) : hasActiveSubscription ? (
              'Oluştur'
            ) : (
              'Pro\'ya Yükselt & Oluştur'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
