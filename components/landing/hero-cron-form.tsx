'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, Zap, Loader2, Clock, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { TestResultModal, TestResult } from '@/components/shared/test-result-modal';
import { GoogleSignInButton } from './google-sign-in-button';
import { parseCurlCommand } from '@/lib/curl-parser';

// Interval presets in seconds
const INTERVAL_PRESETS = [
  { label: '5 dk', value: 300 },
  { label: '10 dk', value: 600 },
  { label: '15 dk', value: 900 },
  { label: '30 dk', value: 1800 },
];

interface ExistingCron {
  id: string;
  url: string;
  interval_sec: number;
  expires_at: number;
}

export function HeroCronForm() {
  const [form, setForm] = useState({
    url: 'https://',
    method: 'GET',
    headers_json: '',
    body: '',
    intervalPreset: 300, // 5 minutes default
  });

  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testPassed, setTestPassed] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [existingCron, setExistingCron] = useState<ExistingCron | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [curlParsed, setCurlParsed] = useState(false);

  // Check if user already has a guest cron
  useEffect(() => {
    async function checkExistingCron() {
      try {
        const response = await fetch('/api/guest-cron');
        const data = await response.json();
        if (data.hasExistingCron) {
          setExistingCron(data.cron);
        }
      } catch (err) {
        console.error('Failed to check existing cron:', err);
      } finally {
        setCheckingExisting(false);
      }
    }
    checkExistingCron();
  }, []);

  // Reset testPassed when form changes
  useEffect(() => {
    setTestPassed(false);
    setError(null);
  }, [form.url, form.method, form.headers_json, form.body]);

  // Handle paste - detect curl commands
  const handleUrlPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    
    // Check if it looks like a curl command
    if (pastedText.trim().toLowerCase().startsWith('curl')) {
      e.preventDefault(); // Prevent default paste
      
      const parsed = parseCurlCommand(pastedText);
      
      if (parsed && parsed.url) {
        setForm(prev => ({
          ...prev,
          url: parsed.url || prev.url,
          method: parsed.method || 'GET',
          headers_json: Object.keys(parsed.headers).length > 0 
            ? JSON.stringify(parsed.headers, null, 2) 
            : prev.headers_json,
          body: parsed.body || prev.body,
        }));
        
        setCurlParsed(true);
        // Reset after 3 seconds
        setTimeout(() => setCurlParsed(false), 3000);
      }
    }
  };

  // Check if URL is valid
  const isUrlValid = () => {
    try {
      const urlObj = new URL(form.url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  };

  // Parse headers JSON
  const parseHeaders = (): Record<string, string> | null => {
    if (!form.headers_json.trim()) return null;
    try {
      return JSON.parse(form.headers_json);
    } catch {
      return null;
    }
  };

  // Test the request
  async function handleTest() {
    if (!isUrlValid()) return;

    // Validate headers JSON if provided
    if (form.headers_json.trim()) {
      try {
        JSON.parse(form.headers_json);
      } catch {
        setError('Header\'larda geçersiz JSON formatı');
        return;
      }
    }

    setTestLoading(true);
    setError(null);
    
    try {
      const headers = parseHeaders();
      const response = await fetch('/api/guest-cron/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: form.url,
          method: form.method,
          headers_json: headers,
          body: form.body || null,
          timeout_ms: 10000,
          expected_min: 200,
          expected_max: 299,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        setError(result.error || 'Test başarısız');
        return;
      }

      setTestResult(result);
      setTestModalOpen(true);
      if (result.success) {
        setTestPassed(true);
      }
    } catch (err) {
      console.error('Failed to test:', err);
      setError('İstek test edilemedi. Lütfen tekrar deneyin.');
    } finally {
      setTestLoading(false);
    }
  }

  // Create the cron job
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!testPassed) return;

    setSubmitting(true);
    setError(null);

    try {
      const headers = parseHeaders();
      const response = await fetch('/api/guest-cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: form.url,
          method: form.method,
          headers_json: headers,
          body: form.body || null,
          interval_sec: form.intervalPreset,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Cron job oluşturulamadı');
        return;
      }

      setSuccess(true);
      setExistingCron({
        id: data.id,
        url: data.url,
        interval_sec: data.interval_sec,
        expires_at: data.expires_at,
      });
    } catch (err) {
      console.error('Failed to create cron:', err);
      setError('Cron job oluşturulamadı. Lütfen tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  }

  // Show existing cron message
  if (!checkingExisting && existingCron) {
    return (
      <div className="bg-[#1a1a1d]/90 backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-full bg-green-500/20">
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <h3 className="font-semibold text-white">
              {success ? 'Cron Job Oluşturuldu!' : 'Aktif cron job\'unuz var'}
            </h3>
            <p className="text-sm text-gray-400">
              Her {existingCron.interval_sec / 60} dakikada çalışıyor
            </p>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-white/5 border border-white/10 mb-4">
          <p className="text-sm text-gray-300 font-mono truncate">{existingCron.url}</p>
          <p className="text-xs text-gray-500 mt-1">
            Bitiş: {new Date(existingCron.expires_at).toLocaleDateString('tr-TR')}
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-gray-400">
            Daha fazla cron job oluşturmak veya bu job&apos;u kalıcı yapmak ister misiniz?
          </p>
          <GoogleSignInButton className="w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1a1d]/90 backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-2xl">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-1">
          Şimdi Deneyin - Ücretsiz
        </h3>
        <p className="text-sm text-gray-400">
          Saniyeler içinde cron job oluşturun. Kayıt gerekmez.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Method + URL */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label className="text-sm font-medium text-gray-300">İstek</Label>
            <Info className="h-3.5 w-3.5 text-gray-500 shrink-0" />
            {curlParsed && (
              <Badge variant="default" className="text-xs bg-green-500/20 text-green-400 border-green-500/30">
                <Check className="h-3 w-3 mr-1" />
                Curl içe aktarıldı
              </Badge>
            )}
          </div>
          <div className="flex rounded-lg border border-white/10 overflow-hidden focus-within:ring-2 focus-within:ring-purple-500/50 focus-within:border-purple-500/50">
            <Select
              value={form.method}
              onValueChange={(value) => setForm(prev => ({ ...prev, method: value }))}
            >
              <SelectTrigger className="w-[100px] rounded-none border-0 border-r border-white/10 bg-white/5 text-white focus:ring-0 focus:ring-offset-0 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="PATCH">PATCH</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="url"
              value={form.url}
              onChange={(e) => setForm(prev => ({ ...prev, url: e.target.value }))}
              onPaste={handleUrlPaste}
              placeholder="https:// veya curl komutu yapıştırın"
              className="flex-1 rounded-none border-0 bg-white/5 text-white placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0"
              required
            />
          </div>
          <p className="text-xs text-gray-500">
            Çağrılacak URL. Ayrıca curl komutu da yapıştırabilirsiniz.
          </p>
        </div>

        {/* Headers */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-300">Header&apos;lar (JSON, isteğe bağlı)</Label>
          <Textarea
            value={form.headers_json}
            onChange={(e) => setForm(prev => ({ ...prev, headers_json: e.target.value }))}
            placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
            rows={2}
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500/50 font-mono text-sm"
          />
          <p className="text-xs text-gray-500">
            Header&apos;ları JSON nesnesi olarak girin. Gerekmiyorsa boş bırakın.
          </p>
        </div>

        {/* Body */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-300">Gövde (isteğe bağlı)</Label>
          <Textarea
            value={form.body}
            onChange={(e) => setForm(prev => ({ ...prev, body: e.target.value }))}
            placeholder="İstek gövdesi"
            rows={2}
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500/50 font-mono text-sm"
          />
          <p className="text-xs text-gray-500">
            POST, PUT, PATCH istekleri için istek gövdesi.
          </p>
        </div>

        {/* Interval Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-300">Kontrol aralığı</Label>
          <div className="grid grid-cols-4 gap-2">
            {INTERVAL_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setForm(prev => ({ ...prev, intervalPreset: preset.value }))}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                  form.intervalPreset === preset.value
                    ? 'bg-purple-500 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2">
          {!testPassed ? (
            <Button
              type="button"
              onClick={handleTest}
              disabled={testLoading || !isUrlValid() || checkingExisting}
              className="w-full bg-white text-black hover:bg-gray-100 font-semibold"
            >
              {testLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Test Ediliyor...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  İsteği Test Et
                </>
              )}
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold"
            >
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

        {/* Info Badge */}
        <div className="flex items-center justify-center gap-2">
          <Badge variant="outline" className="text-xs text-gray-400 border-white/10">
            <Clock className="mr-1 h-3 w-3" />
            7 gün çalışır
          </Badge>
          <span className="text-xs text-gray-500">•</span>
          <span className="text-xs text-gray-500">Kalıcı için giriş yapın</span>
        </div>
      </form>

      {/* Test Result Modal */}
      <TestResultModal
        open={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        result={testResult}
        onEditRequest={() => setTestModalOpen(false)}
      />
    </div>
  );
}
