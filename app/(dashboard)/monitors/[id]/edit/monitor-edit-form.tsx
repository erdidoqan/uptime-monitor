'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, Info, ChevronRight } from 'lucide-react';
import type { Monitor } from '@/shared/types';
import { parseCurlCommand } from '@/lib/curl-parser';

interface MonitorEditFormProps {
  monitor: Monitor;
}

export function MonitorEditForm({ monitor }: MonitorEditFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  
  // Determine alert type from monitor data
  const getAlertType = (): 'url_unavailable' | 'keyword' | 'url_doesnt_contain_keyword' => {
    if (monitor.keyword) {
      // We can't determine if it's 'keyword' or 'url_doesnt_contain_keyword' from monitor data
      // Default to 'keyword' for now
      return 'keyword';
    }
    return 'url_unavailable';
  };

  // Determine if multiple URL mode
  const hasMultipleUrls = monitor.urls && monitor.urls.trim() !== '';
  const urlsArray = hasMultipleUrls ? JSON.parse(monitor.urls || '[]') : [];
  const [multipleUrlMode, setMultipleUrlMode] = useState(hasMultipleUrls && urlsArray.length > 1);

  // Initialize form with monitor data
  const getHeadersJson = () => {
    if (!monitor.headers_json) return '';
    try {
      const parsed = JSON.parse(monitor.headers_json);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return monitor.headers_json; // Return as-is if parsing fails
    }
  };

  const [form, setForm] = useState({
    name: monitor.name || '',
    url: monitor.url || 'https://',
    urls: hasMultipleUrls ? urlsArray.join('\n') : '',
    method: monitor.method || 'GET',
    interval_sec: monitor.interval_sec.toString(),
    timeout_ms: monitor.timeout_ms.toString(),
    alertType: getAlertType(),
    keyword: monitor.keyword || '',
    expected_min: monitor.expected_min?.toString() || '',
    expected_max: monitor.expected_max?.toString() || '',
    headers_json: getHeadersJson(),
    body: monitor.body || '',
    use_tr_proxy: monitor.use_tr_proxy === 1, // Use Turkey proxy for geo-restricted sites
  });

  // On-call escalation (not stored in monitor, use defaults)
  const [notifications, setNotifications] = useState({
    call: false,
    sms: false,
    email: true,
    push: false,
    critical: false,
  });
  const [acknowledgmentAction, setAcknowledgmentAction] = useState('do_nothing');
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState(false);
  const [isCurlParsed, setIsCurlParsed] = useState(false);
  const [curlParseError, setCurlParseError] = useState<string | null>(null);

  // Advanced settings from monitor data
  const [advancedSettings, setAdvancedSettings] = useState({
    recoveryPeriod: monitor.recovery_period_sec?.toString() || '300',
    confirmationPeriod: monitor.confirmation_period_sec?.toString() || '60',
    checkFrequency: monitor.interval_sec.toString(),
  });

  // Handle curl command paste
  const handleUrlPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    
    // Check if it's a curl command
    if (pastedText.trim().startsWith('curl')) {
      e.preventDefault(); // Prevent default paste
      
      const parsed = parseCurlCommand(pastedText);
      
      if (parsed && parsed.url) {
        // Update form state
        setForm(prev => ({
          ...prev,
          url: parsed.url || prev.url,
          method: parsed.method,
          headers_json: Object.keys(parsed.headers).length > 0 
            ? JSON.stringify(parsed.headers, null, 2) 
            : prev.headers_json,
          body: parsed.body || prev.body,
        }));
        
        setIsCurlParsed(true);
        setCurlParseError(null);
        setTimeout(() => setIsCurlParsed(false), 3000); // Hide badge after 3 seconds
      } else {
        setCurlParseError('Curl komutu ayrıştırılamadı. Lütfen formatı kontrol edin.');
        setTimeout(() => setCurlParseError(null), 3000);
      }
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate URLs
    let urlToSubmit: string;
    let urlsToSubmit: string | null = null;

    if (multipleUrlMode) {
      if (!form.urls.trim()) {
        alert('Lütfen en az bir URL girin');
        return;
      }

      // Parse URLs (one per line)
      const urlsArray = form.urls
        .split('\n')
        .map((url: string) => url.trim())
        .filter((url: string) => url && url !== 'https://' && url.length > 0);
      
      if (urlsArray.length === 0) {
        alert('Lütfen en az bir geçerli URL girin');
        return;
      }

      urlToSubmit = urlsArray[0];
      urlsToSubmit = JSON.stringify(urlsArray);
    } else {
      if (!form.url || form.url === 'https://') {
        alert('Lütfen geçerli bir URL girin');
        return;
      }
      urlToSubmit = form.url;
    }

    // Parse headers_json if provided
    let headersJsonValue = null;
    if (form.headers_json && form.headers_json.trim()) {
      try {
        const parsed = JSON.parse(form.headers_json);
        headersJsonValue = parsed;
      } catch (error) {
        alert('Header alanında geçersiz JSON formatı');
        return;
      }
    }

    setSubmitting(true);
    try {
      await api.put(`/monitors/${monitor.id}`, {
        name: form.name || null,
        url: urlToSubmit,
        urls: urlsToSubmit,
        method: form.method,
        interval_sec: parseInt(advancedSettings.checkFrequency || form.interval_sec),
        timeout_ms: parseInt(form.timeout_ms),
        expected_min: form.expected_min ? parseInt(form.expected_min) : null,
        expected_max: form.expected_max ? parseInt(form.expected_max) : null,
        keyword: (form.alertType === 'keyword' || form.alertType === 'url_doesnt_contain_keyword') && form.keyword ? form.keyword : null,
        recovery_period_sec: advancedSettings.recoveryPeriod ? parseInt(advancedSettings.recoveryPeriod) : null,
        confirmation_period_sec: advancedSettings.confirmationPeriod ? parseInt(advancedSettings.confirmationPeriod) : null,
        headers_json: headersJsonValue,
        body: form.body || null,
        use_tr_proxy: form.use_tr_proxy ? 1 : 0,
      });
      router.push(`/monitors/${monitor.id}`);
    } catch (error) {
      console.error('Failed to update monitor:', error);
      alert('Monitör güncellenemedi');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
      <div className="space-y-12">
        {/* What to monitor */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left side - Description */}
          <div className="lg:col-span-1">
            <h2 className="text-lg font-semibold mb-2">Ne izlenecek</h2>
            <p className="text-sm text-muted-foreground">
              İzlemek istediğiniz hedef web sitesini yapılandırın. Gelişmiş yapılandırmayı aşağıda, gelişmiş ayarlar bölümünde bulabilirsiniz.
            </p>
          </div>

          {/* Right side - Form cards */}
          <div className="lg:col-span-2">
            {/* Combined card with Alert and URL sections */}
            <Card className="border gap-0">
              <CardContent className="px-6 py-6 space-y-6">
                {/* Top section: Alert us when */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Left side - Alert type */}
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-sm font-semibold">Bizi uyar</Label>
                      <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </div>
                    <Select
                      value={form.alertType}
                      onValueChange={(value) => setForm(prev => ({ ...prev, alertType: value as 'url_unavailable' | 'keyword' | 'url_doesnt_contain_keyword' }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="url_unavailable">URL erişilemez olduğunda</SelectItem>
                        <SelectItem value="url_doesnt_contain_keyword">URL anahtar kelime içermediğinde</SelectItem>
                        <SelectItem value="keyword">Anahtar kelime eşleşmesi</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>Anahtar kelime eşleştirme yöntemini öneriyoruz.</p>
                      <p>
                        Daha fazla seçenek için <a href="#" className="text-primary hover:underline cursor-pointer">hesabınızı yükseltin</a>.
                      </p>
                    </div>
                  </div>

                  {/* Right side - Keyword input */}
                  <div className="space-y-2 min-w-0">
                    {(form.alertType === 'keyword' || form.alertType === 'url_doesnt_contain_keyword') ? (
                      <>
                        <Label className="text-sm font-semibold">Sayfada aranacak anahtar kelime</Label>
                        <div className="relative">
                          <Input
                            value={form.keyword}
                            onChange={(e) => setForm(prev => ({ ...prev, keyword: e.target.value }))}
                            placeholder="Anahtar kelime girin"
                            className="pr-8 w-full"
                          />
                          {form.keyword && (
                            <button
                              type="button"
                              onClick={() => setForm(prev => ({ ...prev, keyword: '' }))}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Büyük/küçük harf duyarsız eşleştirme kullanıyoruz.
                        </p>
                      </>
                    ) : (
                      <div className="h-[72px]"></div>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t -mx-6"></div>

                {/* Bottom section: URL to monitor */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-sm font-semibold">İzlenecek URL</Label>
                    <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </div>
                  {multipleUrlMode ? (
                    <Textarea
                      value={form.urls}
                      onChange={(e) => setForm(prev => ({ ...prev, urls: e.target.value }))}
                      placeholder="https://example.com
https://example.com/a
https://example.com/b"
                      rows={4}
                      required
                    />
                  ) : (
                    <div className="flex rounded-md border border-input overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                      <Select
                        value={form.method}
                        onValueChange={(value) => setForm(prev => ({ ...prev, method: value }))}
                      >
                        <SelectTrigger className="w-[120px] rounded-none border-0 border-r bg-muted/50 focus:ring-0 focus:ring-offset-0 shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GET">GET</SelectItem>
                          <SelectItem value="POST">POST</SelectItem>
                          <SelectItem value="PUT">PUT</SelectItem>
                          <SelectItem value="PATCH">PATCH</SelectItem>
                          <SelectItem value="DELETE">DELETE</SelectItem>
                          <SelectItem value="HEAD">HEAD</SelectItem>
                          <SelectItem value="OPTIONS">OPTIONS</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="url"
                        value={form.url}
                        onChange={(e) => setForm(prev => ({ ...prev, url: e.target.value }))}
                        onPaste={handleUrlPaste}
                        placeholder="https:// veya curl komutu yapıştırın"
                        className="flex-1 rounded-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        required
                      />
                    </div>
                  )}
                  {curlParseError && (
                    <p className="text-xs text-red-500">{curlParseError}</p>
                  )}
                  {multipleUrlMode ? (
                    <p className="text-xs text-muted-foreground">
                      Sadece bir monitör düzenlemek için{' '}
                      <a 
                        href="#" 
                        className="text-primary hover:underline cursor-pointer"
                        onClick={(e) => {
                          e.preventDefault();
                          setMultipleUrlMode(false);
                          if (form.urls) {
                            const firstUrl = form.urls.split('\n')[0].trim();
                            if (firstUrl && firstUrl !== 'https://') {
                              setForm(prev => ({ ...prev, url: firstUrl, urls: '' }));
                            } else {
                              setForm(prev => ({ ...prev, url: 'https://', urls: '' }));
                            }
                          }
                        }}
                      >
                        geri dönün
                      </a>.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Birden fazla monitör{' '}
                      <a 
                        href="#" 
                        className="text-primary hover:underline cursor-pointer"
                        onClick={(e) => {
                          e.preventDefault();
                          setMultipleUrlMode(true);
                          if (form.url && form.url !== 'https://') {
                            setForm(prev => ({ ...prev, urls: prev.url }));
                          }
                        }}
                      >
                        buradan
                        </a>{' '}
                      içe aktarabilirsiniz.
                      </p>
                    )}

                    {/* Headers */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Header&apos;lar (JSON, isteğe bağlı)</Label>
                      <Textarea
                        value={form.headers_json}
                        onChange={(e) => setForm(prev => ({ ...prev, headers_json: e.target.value }))}
                        placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">
                        Header&apos;ları JSON nesnesi olarak girin. Gerekmiyorsa boş bırakın.
                      </p>
                    </div>

                    {/* Body */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Gövde (isteğe bağlı)</Label>
                      <Textarea
                        value={form.body}
                        onChange={(e) => setForm(prev => ({ ...prev, body: e.target.value }))}
                        placeholder="İstek gövdesi"
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground">
                        POST, PUT, PATCH istekleri için istek gövdesi.
                      </p>
                    </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* On-call escalation */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left side - Description */}
          <div className="lg:col-span-1">
            <h2 className="text-lg font-semibold mb-2">Nöbet eskalasyonu</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Bir olay meydana geldiğinde kimin nasıl bilgilendirileceğine dair kurallar belirleyin.
            </p>
            <p className="text-sm text-muted-foreground">
              Son çare olarak <a href="#" className="text-primary hover:underline cursor-pointer">tüm ekibi</a> bilgilendir.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Alternatif olarak, <a href="#" className="text-primary hover:underline cursor-pointer">gelişmiş eskalasyon politikası</a> ayarlayın.
            </p>
          </div>

          {/* Right side - Form cards */}
          <div className="lg:col-span-2 space-y-4">
            {/* When there's a new incident */}
            <Card className="border gap-0">
              <CardHeader className="px-6 pt-6 pb-4">
                <CardTitle className="text-sm font-semibold">Yeni bir olay olduğunda</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6 pt-0 space-y-3">
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="call"
                      checked={notifications.call}
                      onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, call: checked === true }))}
                    />
                    <Label htmlFor="call" className="font-normal cursor-pointer">Arama</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sms"
                      checked={notifications.sms}
                      onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, sms: checked === true }))}
                    />
                    <Label htmlFor="sms" className="font-normal cursor-pointer">SMS</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="email"
                      checked={notifications.email}
                      onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, email: checked === true }))}
                    />
                    <Label htmlFor="email" className="font-normal cursor-pointer">E-posta</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="push"
                      checked={notifications.push}
                      onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, push: checked === true }))}
                    />
                    <Label htmlFor="push" className="font-normal cursor-pointer">Anlık bildirim</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="critical"
                      checked={notifications.critical}
                      onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, critical: checked === true }))}
                    />
                    <Label htmlFor="critical" className="font-normal cursor-pointer">Kritik uyarı</Label>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  <a href="#" className="text-primary hover:underline cursor-pointer">mevcut nöbetçi kişi</a>
                </p>
              </CardContent>
            </Card>

            {/* If the on-call person doesn't acknowledge */}
            <Card className="border gap-0">
              <CardHeader className="px-6 pt-6 pb-4">
                <CardTitle className="text-sm font-semibold">Nöbetçi kişi olayı onaylamazsa</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6 pt-0">
                <Select
                  value={acknowledgmentAction}
                  onValueChange={setAcknowledgmentAction}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="do_nothing">Hiçbir şey yapma</SelectItem>
                    <SelectItem value="notify_team">Tüm ekibi bilgilendir</SelectItem>
                    <SelectItem value="escalate">Yöneticiye eskale et</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">
                  <a href="#" className="text-primary hover:underline cursor-pointer">Gelişmiş eskalasyon politikası</a> ayarlayın ve <a href="#" className="text-primary hover:underline cursor-pointer">yanıt verenlerin</a> nasıl bilgilendirilmek istediklerini seçmelerine izin verin.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Advanced settings toggle */}
        <div className="mt-8">
          <button
            type="button"
            onClick={() => setAdvancedSettingsOpen(!advancedSettingsOpen)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ChevronRight className={`h-4 w-4 transition-transform ${advancedSettingsOpen ? 'rotate-90' : ''}`} />
            Gelişmiş ayarlar
          </button>
        </div>

        {/* Advanced settings */}
        {advancedSettingsOpen && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            {/* Left side - Description */}
            <div className="lg:col-span-1">
              <h2 className="text-lg font-semibold mb-2">Gelişmiş ayarlar</h2>
              <p className="text-sm text-muted-foreground">
                Burada yapılandıramadığınız ekstra bir şeye ihtiyacınız varsa, lütfen{' '}
                <a href="mailto:destek@uptimetr.com" className="text-primary hover:underline cursor-pointer">destek@uptimetr.com</a> adresinden bize bildirin, gerçekleştirelim!
              </p>
              <p className="text-sm text-muted-foreground mt-4">
                Sorularınız mı var? <a href="#" className="text-primary hover:underline cursor-pointer">Bize bildirin</a> veya <a href="#" className="text-primary hover:underline cursor-pointer">sık sorulan sorulara</a> göz atın.
              </p>
            </div>

            {/* Right side - Advanced settings form */}
            <div className="lg:col-span-2">
              <Card className="border gap-0">
                <CardContent className="px-6 py-6 space-y-6">
                  {/* Pronounceable monitor name */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Okunabilir monitör adı</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="örn. API Sağlık Kontrolü"
                    />
                    <p className="text-xs text-muted-foreground">
                      Sizi aradığımızda bu adı kullanacağız.
                    </p>
                  </div>

                  {/* Recovery period and Confirmation period - side by side */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Kurtarma süresi</Label>
                      <Select
                        value={advancedSettings.recoveryPeriod}
                        onValueChange={(value) => setAdvancedSettings(prev => ({ ...prev, recoveryPeriod: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="60">1 dakika</SelectItem>
                          <SelectItem value="300">5 dakika</SelectItem>
                          <SelectItem value="600">10 dakika</SelectItem>
                          <SelectItem value="900">15 dakika</SelectItem>
                          <SelectItem value="1800">30 dakika</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Olayın otomatik olarak çözüldü olarak işaretlenmesi için monitörün ne kadar süre çalışır durumda olması gerektiği.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Onay süresi</Label>
                      <Select
                        value={advancedSettings.confirmationPeriod}
                        onValueChange={(value) => setAdvancedSettings(prev => ({ ...prev, confirmationPeriod: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30 saniye</SelectItem>
                          <SelectItem value="60">1 dakika</SelectItem>
                          <SelectItem value="120">2 dakika</SelectItem>
                          <SelectItem value="300">5 dakika</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Bir hata gözlemlendikten sonra yeni bir olay başlatmadan önce ne kadar beklenecek.
                      </p>
                    </div>
                  </div>

                  {/* Check frequency */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Kontrol sıklığı</Label>
                    <Select
                      value={advancedSettings.checkFrequency}
                      onValueChange={(value) => {
                        setAdvancedSettings(prev => ({ ...prev, checkFrequency: value }));
                        setForm(prev => ({ ...prev, interval_sec: value }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="60">1 dakika</SelectItem>
                        <SelectItem value="120">2 dakika</SelectItem>
                        <SelectItem value="180">3 dakika</SelectItem>
                        <SelectItem value="300">5 dakika</SelectItem>
                        <SelectItem value="600">10 dakika</SelectItem>
                        <SelectItem value="900">15 dakika</SelectItem>
                        <SelectItem value="1800">30 dakika</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Monitörünüzü ne sıklıkla kontrol etmeliyiz?
                    </p>
                  </div>

                  {/* Turkey proxy */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="use_tr_proxy"
                        checked={form.use_tr_proxy}
                        onCheckedChange={(checked) => setForm(prev => ({ ...prev, use_tr_proxy: checked === true }))}
                      />
                      <Label htmlFor="use_tr_proxy" className="text-sm font-semibold cursor-pointer">
                        Türkiye&apos;den istek at
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Bazı siteler yurtdışı IP&apos;leri engelleyebilir. Bu seçenek aktifken istekler Türkiye sunucumuzdan atılır.
                    </p>
                  </div>

                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Submit buttons */}
      <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/monitors/${monitor.id}`)}
        >
          İptal
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Güncelleniyor...' : 'Monitörü Güncelle'}
        </Button>
      </div>
      </form>

    </>
  );
}
