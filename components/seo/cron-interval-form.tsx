'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, Zap, Loader2, Clock, AlertCircle, CheckCircle, Info, Lock } from 'lucide-react';
import { TestResultModal, TestResult } from '@/components/shared/test-result-modal';
import { GoogleSignInButton } from '@/components/landing/google-sign-in-button';
import { parseCurlCommand } from '@/lib/curl-parser';

// Guest allowed intervals in seconds
const GUEST_INTERVALS = [300, 600, 900, 1800]; // 5, 10, 15, 30 min

interface CronIntervalFormProps {
  defaultInterval: number;
  isGuestAllowed: boolean;
  humanReadable: string;
}

interface ExistingCron {
  id: string;
  url: string;
  interval_sec: number;
  expires_at: number;
}

export function CronIntervalForm({ defaultInterval, isGuestAllowed, humanReadable }: CronIntervalFormProps) {
  // Find the closest guest-allowed interval
  const closestGuestInterval = GUEST_INTERVALS.reduce((prev, curr) =>
    Math.abs(curr - defaultInterval) < Math.abs(prev - defaultInterval) ? curr : prev
  );

  const [form, setForm] = useState({
    url: 'https://',
    method: 'GET',
    headers_json: '',
    body: '',
    intervalPreset: isGuestAllowed ? defaultInterval : closestGuestInterval,
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
    
    if (pastedText.trim().toLowerCase().startsWith('curl')) {
      e.preventDefault();
      
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
        setTimeout(() => setCurlParsed(false), 3000);
      }
    }
  };

  const isUrlValid = () => {
    try {
      const urlObj = new URL(form.url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  };

  const parseHeaders = (): Record<string, string> | null => {
    if (!form.headers_json.trim()) return null;
    try {
      return JSON.parse(form.headers_json);
    } catch {
      return null;
    }
  };

  async function handleTest() {
    if (!isUrlValid()) return;

    if (form.headers_json.trim()) {
      try {
        JSON.parse(form.headers_json);
      } catch {
        setError('Invalid JSON format in headers');
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
        setError(result.error || 'Test failed');
        return;
      }

      setTestResult(result);
      setTestModalOpen(true);
      if (result.success) {
        setTestPassed(true);
      }
    } catch (err) {
      console.error('Failed to test:', err);
      setError('Failed to test request. Please try again.');
    } finally {
      setTestLoading(false);
    }
  }

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
        setError(data.error || 'Failed to create cron job');
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
      setError('Failed to create cron job. Please try again.');
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
              {success ? 'Cron Job Created!' : 'You have an active cron job'}
            </h3>
            <p className="text-sm text-gray-400">
              Running every {existingCron.interval_sec / 60} minutes
            </p>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-white/5 border border-white/10 mb-4">
          <p className="text-sm text-gray-300 font-mono truncate">{existingCron.url}</p>
          <p className="text-xs text-gray-500 mt-1">
            Expires: {new Date(existingCron.expires_at).toLocaleDateString()}
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-gray-400">
            Want to create more cron jobs or keep this one permanently?
          </p>
          <GoogleSignInButton className="w-full" />
        </div>
      </div>
    );
  }

  // Show sign-in required message for non-guest intervals
  if (!isGuestAllowed) {
    return (
      <div className="bg-[#1a1a1d]/90 backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-2xl">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-white">
              Schedule {humanReadable}
            </h3>
            <Badge variant="outline" className="text-xs text-amber-400 border-amber-500/30 bg-amber-500/10">
              <Lock className="h-3 w-3 mr-1" />
              Sign in required
            </Badge>
          </div>
          <p className="text-sm text-gray-400">
            Running cron jobs {humanReadable} requires a free account.
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <h4 className="font-medium text-white mb-2">Why sign in?</h4>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Access to all interval options (1 min to monthly)</li>
              <li>• Permanent cron jobs (no 7-day expiry)</li>
              <li>• Up to 5 free cron jobs</li>
              <li>• Email notifications for failures</li>
            </ul>
          </div>

          <GoogleSignInButton className="w-full" />

          <div className="text-center">
            <p className="text-xs text-gray-500">
              Or try our guest feature with 5, 10, 15, or 30 minute intervals
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1a1d]/90 backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-2xl">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-1">
          Try it now - Free
        </h3>
        <p className="text-sm text-gray-400">
          Create a cron job running {humanReadable}. No sign-up required.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Method + URL */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label className="text-sm font-medium text-gray-300">Request</Label>
            <Info className="h-3.5 w-3.5 text-gray-500 shrink-0" />
            {curlParsed && (
              <Badge variant="default" className="text-xs bg-green-500/20 text-green-400 border-green-500/30">
                <Check className="h-3 w-3 mr-1" />
                Curl imported
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
              placeholder="https:// or paste curl command"
              className="flex-1 rounded-none border-0 bg-white/5 text-white placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0"
              required
            />
          </div>
          <p className="text-xs text-gray-500">
            The URL that will be called. You can also paste a curl command here.
          </p>
        </div>

        {/* Headers */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-300">Headers (JSON, optional)</Label>
          <Textarea
            value={form.headers_json}
            onChange={(e) => setForm(prev => ({ ...prev, headers_json: e.target.value }))}
            placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
            rows={2}
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500/50 font-mono text-sm"
          />
        </div>

        {/* Body */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-300">Body (optional)</Label>
          <Textarea
            value={form.body}
            onChange={(e) => setForm(prev => ({ ...prev, body: e.target.value }))}
            placeholder="Request body"
            rows={2}
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500/50 font-mono text-sm"
          />
        </div>

        {/* Interval Selection - Pre-selected based on page */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-300">Check interval</Label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: '5 min', value: 300 },
              { label: '10 min', value: 600 },
              { label: '15 min', value: 900 },
              { label: '30 min', value: 1800 },
            ].map((preset) => (
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
                  Testing...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Test Request
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
                  Creating...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Create Cron Job
                </>
              )}
            </Button>
          )}
        </div>

        {/* Info Badge */}
        <div className="flex items-center justify-center gap-2">
          <Badge variant="outline" className="text-xs text-gray-400 border-white/10">
            <Clock className="mr-1 h-3 w-3" />
            Runs for 7 days
          </Badge>
          <span className="text-xs text-gray-500">•</span>
          <span className="text-xs text-gray-500">Sign in for permanent</span>
        </div>
      </form>

      <TestResultModal
        open={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        result={testResult}
        onEditRequest={() => setTestModalOpen(false)}
      />
    </div>
  );
}

