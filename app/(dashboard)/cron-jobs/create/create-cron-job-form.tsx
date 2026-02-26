'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Info, ChevronRight, Check, Zap, Loader2 } from 'lucide-react';
import { parseCurlCommand } from '@/lib/curl-parser';
import { TestResultModal, TestResult } from '@/components/shared/test-result-modal';
import { UpgradeModal } from '@/components/shared/upgrade-modal';

export function CreateCronJobForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  
  const [form, setForm] = useState({
    name: '',
    url: 'https://',
    method: 'GET',
    headers_json: '',
    body: '',
    scheduleType: 'cron', // 'cron' or 'interval'
    cronMode: 'preset', // 'preset', 'template', 'custom'
    cron_expr: '',
    cronPreset: '*/5 * * * *', // Default: Every 5 minutes
    cronTemplate: 'daily', // 'daily', 'weekly', 'monthly'
    cronTemplateHour: '0',
    cronTemplateMinute: '0',
    cronTemplateDay: '1', // for weekly/monthly
    intervalMode: 'preset', // 'preset', 'custom'
    interval_sec: '',
    intervalPreset: '',
    expected_min: '200',
    expected_max: '299',
    keyword: '',
  });
  
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState(false);
  const [isCurlParsed, setIsCurlParsed] = useState(false);
  const [curlParseError, setCurlParseError] = useState<string | null>(null);
  
  // Test state
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testPassed, setTestPassed] = useState(false);

  // Reset testPassed when form changes
  useEffect(() => {
    setTestPassed(false);
  }, [form.url, form.method, form.headers_json, form.body]);

  // Cron Expression Presets
  const CRON_PRESETS = {
    frequent: {
      everyMinute: { label: 'Her dakika', value: '* * * * *' },
      every5Min: { label: 'Her 5 dakikada', value: '*/5 * * * *' },
      every10Min: { label: 'Her 10 dakikada', value: '*/10 * * * *' },
    },
    hourly: {
      every15Min: { label: 'Her 15 dakikada', value: '*/15 * * * *' },
      every30Min: { label: 'Her 30 dakikada', value: '*/30 * * * *' },
      everyHour: { label: 'Her saat başı', value: '0 * * * *' },
    },
    daily: {
      midnight: { label: 'Her gün 00:00\'da', value: '0 0 * * *' },
      earlyMorning: { label: 'Her gün 06:00\'da', value: '0 6 * * *' },
      morning: { label: 'Her gün 09:00\'da', value: '0 9 * * *' },
      noon: { label: 'Her gün 12:00\'de', value: '0 12 * * *' },
      afternoon: { label: 'Her gün 15:00\'te', value: '0 15 * * *' },
      evening: { label: 'Her gün 18:00\'de', value: '0 18 * * *' },
      night: { label: 'Her gün 21:00\'de', value: '0 21 * * *' },
      endOfDay: { label: 'Her gün 23:59\'da', value: '59 23 * * *' },
    },
    weekly: {
      monday: { label: 'Her Pazartesi 00:00\'da', value: '0 0 * * 1' },
      tuesday: { label: 'Her Salı 00:00\'da', value: '0 0 * * 2' },
      wednesday: { label: 'Her Çarşamba 00:00\'da', value: '0 0 * * 3' },
      thursday: { label: 'Her Perşembe 00:00\'da', value: '0 0 * * 4' },
      friday: { label: 'Her Cuma 00:00\'da', value: '0 0 * * 5' },
      saturday: { label: 'Her Cumartesi 00:00\'da', value: '0 0 * * 6' },
      sunday: { label: 'Her Pazar 00:00\'da', value: '0 0 * * 0' },
      mondayMorning: { label: 'Her Pazartesi 09:00\'da', value: '0 9 * * 1' },
      fridayEvening: { label: 'Her Cuma 18:00\'de', value: '0 18 * * 5' },
    },
    monthly: {
      firstDay: { label: 'Her ayın 1\'inde 00:00\'da', value: '0 0 1 * *' },
      fifteenthDay: { label: 'Her ayın 15\'inde 00:00\'da', value: '0 0 15 * *' },
      lastDay: { label: 'Her ayın son günü 23:59\'da', value: '59 23 L * *' },
    },
  };

  // Interval Presets (in seconds)
  const INTERVAL_PRESETS = {
    minutes: [
      { label: '1 dakika', value: '60' },
      { label: '5 dakika', value: '300' },
      { label: '10 dakika', value: '600' },
      { label: '15 dakika', value: '900' },
      { label: '30 dakika', value: '1800' },
    ],
    hours: [
      { label: '1 saat', value: '3600' },
      { label: '2 saat', value: '7200' },
      { label: '3 saat', value: '10800' },
      { label: '6 saat', value: '21600' },
      { label: '12 saat', value: '43200' },
    ],
    days: [
      { label: '1 gün', value: '86400' },
      { label: '2 gün', value: '172800' },
      { label: '7 gün', value: '604800' },
    ],
  };

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

  // Generate cron expression from template
  const generateCronFromTemplate = () => {
    if (form.cronTemplate === 'daily') {
      return `${form.cronTemplateMinute} ${form.cronTemplateHour} * * *`;
    } else if (form.cronTemplate === 'weekly') {
      // Day of week: 0=Sunday, 1=Monday, ..., 6=Saturday
      return `${form.cronTemplateMinute} ${form.cronTemplateHour} * * ${form.cronTemplateDay}`;
    } else if (form.cronTemplate === 'monthly') {
      return `${form.cronTemplateMinute} ${form.cronTemplateHour} ${form.cronTemplateDay} * *`;
    }
    return '';
  };

  // Prepare request data for test or submit
  const prepareRequestData = () => {
    // Validate headers JSON if provided
    let headersParsed = null;
    if (form.headers_json.trim()) {
      try {
        headersParsed = JSON.parse(form.headers_json);
      } catch {
        return { error: 'Header\'lar için geçersiz JSON formatı' };
      }
    }

    return {
      url: form.url,
      method: form.method,
      headers_json: headersParsed,
      body: form.body || null,
      timeout_ms: 60000,
      expected_min: form.expected_min ? parseInt(form.expected_min) : 200,
      expected_max: form.expected_max ? parseInt(form.expected_max) : 299,
      keyword: form.keyword || null,
    };
  };

  // Check if form is valid for testing
  const isFormValidForTest = () => {
    // Check URL
    if (!form.url || !/^https?:\/\/.+/.test(form.url)) {
      return false;
    }
    // Check headers JSON if provided
    if (form.headers_json.trim()) {
      try {
        JSON.parse(form.headers_json);
      } catch {
        return false;
      }
    }
    return true;
  };

  // Check if schedule is valid
  const isScheduleValid = () => {
    if (form.scheduleType === 'cron') {
      if (form.cronMode === 'preset' && form.cronPreset) return true;
      if (form.cronMode === 'template') return true;
      if (form.cronMode === 'custom' && form.cron_expr) return true;
      return false;
    } else {
      if (form.intervalMode === 'preset' && form.intervalPreset) return true;
      if (form.intervalMode === 'custom' && form.interval_sec && !isNaN(parseInt(form.interval_sec))) return true;
      return false;
    }
  };

  // Test the cron job request
  async function handleTest() {
    const requestData = prepareRequestData();
    if ('error' in requestData) {
      return;
    }

    setTestLoading(true);
    try {
      const result = await api.post<TestResult>('/cron-jobs/test', requestData);
      setTestResult(result);
      setTestModalOpen(true);
      if (result.success) {
        setTestPassed(true);
      }
    } catch (error) {
      console.error('Failed to test cron job:', error);
      setTestResult({
        success: false,
        status_code: null,
        duration_ms: 0,
        response_body: null,
        error: error instanceof Error ? error.message : 'İstek test edilemedi',
      });
      setTestModalOpen(true);
    } finally {
      setTestLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Determine cron expression
    let cronExpr = null;
    if (form.scheduleType === 'cron') {
      if (form.cronMode === 'preset' && form.cronPreset) {
        cronExpr = form.cronPreset;
      } else if (form.cronMode === 'template') {
        cronExpr = generateCronFromTemplate();
      } else if (form.cronMode === 'custom') {
        cronExpr = form.cron_expr;
      }
    }

    // Determine interval
    let intervalSec = null;
    if (form.scheduleType === 'interval') {
      if (form.intervalMode === 'preset' && form.intervalPreset) {
        intervalSec = parseInt(form.intervalPreset);
      } else if (form.intervalMode === 'custom') {
        intervalSec = parseInt(form.interval_sec);
      }
    }

    // Parse headers JSON if provided
    let headersParsed = null;
    if (form.headers_json.trim()) {
      try {
        headersParsed = JSON.parse(form.headers_json);
      } catch {
        return; // Form validation already handles this
      }
    }

    setSubmitting(true);
    try {
      // Test already passed, save directly to database
      await api.post('/cron-jobs', {
        name: form.name || null,
        url: form.url,
        method: form.method,
        headers_json: headersParsed,
        body: form.body || null,
        cron_expr: cronExpr,
        interval_sec: intervalSec,
        timeout_ms: 60000,
        expected_min: form.expected_min ? parseInt(form.expected_min) : null,
        expected_max: form.expected_max ? parseInt(form.expected_max) : null,
        keyword: form.keyword || null,
      });
      router.push('/cron-jobs');
    } catch (error) {
      console.error('Failed to create cron job:', error);
      if (error instanceof ApiError && error.status === 402) {
        // Subscription limit reached
        setUpgradeModalOpen(true);
      } else if (error instanceof ApiError) {
        alert(`Cron job oluşturulamadı: ${error.message}`);
      } else {
        alert('Cron job oluşturulamadı');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col mx-auto px-5 py-8 lg:pt-20 max-w-[1040px] h-[calc(100%-52px)]">
      <div className="mb-6">
        <Link href="/cron-jobs" className="text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="inline mr-2 h-4 w-4" />
          Cron Job&apos;lar
        </Link>
        <span className="text-sm text-muted-foreground mx-2">/</span>
        <span className="text-sm font-medium">Cron job oluştur</span>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-12">
          {/* What to schedule */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left side - Description */}
            <div className="lg:col-span-1">
              <h2 className="text-lg font-semibold mb-2">Ne zamanlanacak</h2>
              <p className="text-sm text-muted-foreground">
                Zamanlamak istediğiniz HTTP isteğini yapılandırın. URL, HTTP metodu, header&apos;lar ve istek gövdesini ayarlayabilirsiniz.
              </p>
            </div>

            {/* Right side - Form cards */}
            <div className="lg:col-span-2">
              <Card className="border gap-0">
                <CardContent className="px-6 py-6 space-y-6">
                  {/* Method + URL */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-sm font-semibold">İstek</Label>
                      <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      {isCurlParsed && (
                        <Badge variant="default" className="text-xs">
                          <Check className="h-3 w-3 mr-1" />
                          Curl içe aktarıldı
                        </Badge>
                      )}
                    </div>
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
                    {curlParseError && (
                      <p className="text-xs text-red-500">{curlParseError}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Cron job çalıştığında çağrılacak URL. Buraya curl komutu da yapıştırabilirsiniz.
                    </p>
                  </div>

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
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Schedule section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <h2 className="text-lg font-semibold mb-2">Zamanlama</h2>
              <p className="text-sm text-muted-foreground">
                Cron job&apos;un ne zaman ve ne sıklıkla çalışacağını seçin. Belirli zamanlar için cron ifadeleri veya düzenli aralıklar için interval kullanabilirsiniz.
              </p>
            </div>
            <div className="lg:col-span-2">
              <Card className="border gap-0">
                <CardContent className="px-6 py-6 space-y-6">
                  {/* Schedule Type Selection */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Zamanlama Türü</Label>
                    <Select
                      value={form.scheduleType}
                      onValueChange={(value) => setForm(prev => ({ ...prev, scheduleType: value as 'cron' | 'interval' }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cron">Cron İfadesi</SelectItem>
                        <SelectItem value="interval">Aralık</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {form.scheduleType === 'cron' 
                        ? 'Belirli zamanlar için cron ifadeleri kullanın (örn. her gün gece yarısı, her Pazartesi).'
                        : 'Düzenli zaman bazlı çalıştırma için aralık kullanın (örn. her 5 dakikada, her saatte).'}
                    </p>
                  </div>

                  {/* Cron Expression Options */}
                  {form.scheduleType === 'cron' && (
                    <>
                      <div className="border-t -mx-6"></div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Cron İfade Modu</Label>
                          <Select
                            value={form.cronMode}
                            onValueChange={(value) => setForm(prev => ({ ...prev, cronMode: value as 'preset' | 'template' | 'custom' }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="preset">Hazır Ayar</SelectItem>
                              <SelectItem value="template">Şablon</SelectItem>
                              <SelectItem value="custom">Özel İfade</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Preset Mode */}
                        {form.cronMode === 'preset' && (
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">Hazır Ayar Seçin</Label>
                            <Select
                              value={form.cronPreset}
                              onValueChange={(value) => setForm(prev => ({ ...prev, cronPreset: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Bir zamanlama seçin" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(CRON_PRESETS.frequent).map(([key, preset]) => (
                                  <SelectItem key={`frequent-${key}`} value={preset.value}>
                                    {preset.label}
                                  </SelectItem>
                                ))}
                                {Object.entries(CRON_PRESETS.hourly).map(([key, preset]) => (
                                  <SelectItem key={`hourly-${key}`} value={preset.value}>
                                    {preset.label}
                                  </SelectItem>
                                ))}
                                {Object.entries(CRON_PRESETS.daily).map(([key, preset]) => (
                                  <SelectItem key={`daily-${key}`} value={preset.value}>
                                    {preset.label}
                                  </SelectItem>
                                ))}
                                {Object.entries(CRON_PRESETS.weekly).map(([key, preset]) => (
                                  <SelectItem key={`weekly-${key}`} value={preset.value}>
                                    {preset.label}
                                  </SelectItem>
                                ))}
                                {Object.entries(CRON_PRESETS.monthly).map(([key, preset]) => (
                                  <SelectItem key={`monthly-${key}`} value={preset.value}>
                                    {preset.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              Yaygın zamanlama ön ayarlarından seçin.
                            </p>
                          </div>
                        )}

                        {/* Template Mode */}
                        {form.cronMode === 'template' && (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label className="text-sm font-semibold">Şablon Türü</Label>
                              <Select
                                value={form.cronTemplate}
                                onValueChange={(value) => setForm(prev => ({ ...prev, cronTemplate: value as 'daily' | 'weekly' | 'monthly' }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="daily">Günlük</SelectItem>
                                  <SelectItem value="weekly">Haftalık</SelectItem>
                                  <SelectItem value="monthly">Aylık</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-semibold">Saat</Label>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label className="text-xs text-muted-foreground">Saat</Label>
                                  <Select
                                    value={form.cronTemplateHour}
                                    onValueChange={(value) => setForm(prev => ({ ...prev, cronTemplateHour: value }))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Saat" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Array.from({ length: 24 }, (_, i) => (
                                        <SelectItem key={i} value={i.toString()}>
                                          {i.toString().padStart(2, '0')}:00
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs text-muted-foreground">Dakika</Label>
                                  <Select
                                    value={form.cronTemplateMinute}
                                    onValueChange={(value) => setForm(prev => ({ ...prev, cronTemplateMinute: value }))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Dakika" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {[0, 15, 30, 45].map(m => (
                                        <SelectItem key={m} value={m.toString()}>
                                          {m.toString().padStart(2, '0')}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                            {form.cronTemplate === 'weekly' && (
                              <div className="space-y-2">
                                <Label className="text-sm font-semibold">Haftanın Günü</Label>
                                <Select
                                  value={form.cronTemplateDay}
                                  onValueChange={(value) => setForm(prev => ({ ...prev, cronTemplateDay: value }))}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="0">Pazar</SelectItem>
                                    <SelectItem value="1">Pazartesi</SelectItem>
                                    <SelectItem value="2">Salı</SelectItem>
                                    <SelectItem value="3">Çarşamba</SelectItem>
                                    <SelectItem value="4">Perşembe</SelectItem>
                                    <SelectItem value="5">Cuma</SelectItem>
                                    <SelectItem value="6">Cumartesi</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            {form.cronTemplate === 'monthly' && (
                              <div className="space-y-2">
                                <Label className="text-sm font-semibold">Ayın Günü (1-31)</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  max="31"
                                  value={form.cronTemplateDay}
                                  onChange={(e) => setForm(prev => ({ ...prev, cronTemplateDay: e.target.value }))}
                                  placeholder="1"
                                />
                              </div>
                            )}
                            <div className="p-3 bg-muted/50 rounded-md">
                              <p className="text-xs font-medium mb-1">Oluşturulan Cron İfadesi:</p>
                              <p className="text-xs font-mono text-muted-foreground">{generateCronFromTemplate()}</p>
                            </div>
                          </div>
                        )}

                        {/* Custom Mode */}
                        {form.cronMode === 'custom' && (
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">Cron İfadesi</Label>
                            <Input
                              value={form.cron_expr}
                              onChange={(e) => setForm(prev => ({ ...prev, cron_expr: e.target.value }))}
                              placeholder="0 0 * * *"
                            />
                            <p className="text-xs text-muted-foreground">
                              Cron ifadesini şu formatta girin: dakika saat gün ay haftanın-günü
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Interval Options */}
                  {form.scheduleType === 'interval' && (
                    <>
                      <div className="border-t -mx-6"></div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Aralık Modu</Label>
                          <Select
                            value={form.intervalMode}
                            onValueChange={(value) => setForm(prev => ({ ...prev, intervalMode: value as 'preset' | 'custom' }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="preset">Hazır Ayar</SelectItem>
                              <SelectItem value="custom">Özel</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Preset Intervals */}
                        {form.intervalMode === 'preset' && (
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">Aralık Seçin</Label>
                            <Select
                              value={form.intervalPreset}
                              onValueChange={(value) => setForm(prev => ({ ...prev, intervalPreset: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Bir aralık seçin" />
                              </SelectTrigger>
                              <SelectContent>
                                {INTERVAL_PRESETS.minutes.map((preset) => (
                                  <SelectItem key={preset.value} value={preset.value}>
                                    {preset.label}
                                  </SelectItem>
                                ))}
                                {INTERVAL_PRESETS.hours.map((preset) => (
                                  <SelectItem key={preset.value} value={preset.value}>
                                    {preset.label}
                                  </SelectItem>
                                ))}
                                {INTERVAL_PRESETS.days.map((preset) => (
                                  <SelectItem key={preset.value} value={preset.value}>
                                    {preset.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              Yaygın aralık ön ayarlarından seçin.
                            </p>
                          </div>
                        )}

                        {/* Custom Interval */}
                        {form.intervalMode === 'custom' && (
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">Aralık (saniye)</Label>
                            <Input
                              type="number"
                              min="1"
                              value={form.interval_sec}
                              onChange={(e) => setForm(prev => ({ ...prev, interval_sec: e.target.value }))}
                              placeholder="3600"
                            />
                            <p className="text-xs text-muted-foreground">
                              Aralığı saniye cinsinden girin (örn. 1 saat için 3600).
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
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
                  Beklenen HTTP durum kodları ve anahtar kelime doğrulaması gibi ek seçenekleri yapılandırın.
                </p>
              </div>

              {/* Right side - Advanced settings form */}
              <div className="lg:col-span-2">
                <Card className="border gap-0">
                  <CardContent className="px-6 py-6 space-y-6">
                    {/* Pronounceable cron job name */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Okunabilir cron job adı</Label>
                      <Input
                        value={form.name}
                        onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="örn. Günlük Yedekleme"
                      />
                      <p className="text-xs text-muted-foreground">
                        Bu cron job için kolay anlaşılır bir ad.
                      </p>
                    </div>

                    {/* Expected HTTP status range */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Beklenen HTTP Durum Aralığı</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <Select
                          value={form.expected_min}
                          onValueChange={(value) => setForm(prev => ({ ...prev, expected_min: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Min" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="200">200</SelectItem>
                            <SelectItem value="201">201</SelectItem>
                            <SelectItem value="202">202</SelectItem>
                            <SelectItem value="300">300</SelectItem>
                            <SelectItem value="400">400</SelectItem>
                            <SelectItem value="500">500</SelectItem>
                          </SelectContent>
                        </Select>

                        <Select
                          value={form.expected_max}
                          onValueChange={(value) => setForm(prev => ({ ...prev, expected_max: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Max" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="200">200</SelectItem>
                            <SelectItem value="201">201</SelectItem>
                            <SelectItem value="202">202</SelectItem>
                            <SelectItem value="299">299</SelectItem>
                            <SelectItem value="300">300</SelectItem>
                            <SelectItem value="400">400</SelectItem>
                            <SelectItem value="500">500</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Başarılı bir yanıtı gösteren HTTP durum kodu aralığı. Varsayılan 200-299.
                      </p>
                    </div>

                    {/* Keyword validation */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Anahtar kelime doğrulaması (isteğe bağlı)</Label>
                      <Input
                        value={form.keyword}
                        onChange={(e) => setForm(prev => ({ ...prev, keyword: e.target.value }))}
                        placeholder="Yanıtta kontrol edilecek anahtar kelime"
                      />
                      <p className="text-xs text-muted-foreground">
                        Sağlanırsa, çalıştırmanın başarılı sayılması için yanıt gövdesi bu anahtar kelimeyi içermelidir.
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
            onClick={() => router.back()}
          >
            İptal
          </Button>
          {!testPassed ? (
            <Button
              type="button"
              onClick={handleTest}
              disabled={testLoading || !isFormValidForTest() || !isScheduleValid()}
            >
              {testLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Test ediliyor...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  İsteği Test Et
                </>
              )}
            </Button>
          ) : (
            <Button type="submit" disabled={submitting || !isScheduleValid()}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Oluşturuluyor...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Cron Job Oluştur
                </>
              )}
            </Button>
          )}
        </div>
      </form>

      {/* Test Result Modal */}
      <TestResultModal
        open={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        result={testResult}
        onEditRequest={() => setTestModalOpen(false)}
      />

      {/* Upgrade Modal */}
      <UpgradeModal
        open={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
      />
    </div>
  );
}
