'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, X, Info, ChevronRight } from 'lucide-react';
import { parseCurlCommand } from '@/lib/curl-parser';

export default function CreateMonitorPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  
  const [form, setForm] = useState({
    name: '',
    url: 'https://',
    urls: '', // Multiple URLs (one per line)
    method: 'GET',
    interval_sec: '300',
    timeout_ms: '5000',
    alertType: 'url_unavailable', // 'url_unavailable' or 'keyword' or 'url_doesnt_contain_keyword'
    keyword: '',
    expected_min: '',
    expected_max: '',
    headers_json: '',
    body: '',
  });
  const [multipleUrlMode, setMultipleUrlMode] = useState(false);
  const [isCurlParsed, setIsCurlParsed] = useState(false);
  const [curlParseError, setCurlParseError] = useState<string | null>(null);

  // On-call escalation
  const [notifications, setNotifications] = useState({
    call: false,
    sms: false,
    email: true,
    push: false,
    critical: false,
  });
  const [acknowledgmentAction, setAcknowledgmentAction] = useState('do_nothing');
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState(false);

  // Advanced settings
  const [advancedSettings, setAdvancedSettings] = useState({
    recoveryPeriod: '300', // 5 minutes in seconds
    confirmationPeriod: '60', // 1 minute in seconds
    checkFrequency: '180', // 3 minutes in seconds (will override interval_sec)
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
        setCurlParseError('Failed to parse curl command. Please check the format.');
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
        alert('Please enter at least one URL');
        return;
      }

      // Parse URLs (one per line)
      const urlsArray = form.urls
        .split('\n')
        .map(url => url.trim())
        .filter(url => url && url !== 'https://' && url.length > 0);
      
      if (urlsArray.length === 0) {
        alert('Please enter at least one valid URL');
        return;
      }

      urlToSubmit = urlsArray[0];
      urlsToSubmit = JSON.stringify(urlsArray);
    } else {
      if (!form.url || form.url === 'https://') {
        alert('Please enter a valid URL');
        return;
      }
      urlToSubmit = form.url;
    }

    setSubmitting(true);
    try {
      // Parse headers_json if provided
      let headersJsonValue = null;
      if (form.headers_json && form.headers_json.trim()) {
        try {
          const parsed = JSON.parse(form.headers_json);
          headersJsonValue = parsed;
        } catch (error) {
          alert('Invalid JSON format in headers field');
          return;
        }
      }

      await api.post('/monitors', {
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
      });
      router.push('/monitors');
    } catch (error) {
      console.error('Failed to create monitor:', error);
      alert('Failed to create monitor');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col mx-auto px-5 py-8 lg:pt-20 max-w-[1040px] h-[calc(100%-52px)]">
      <div className="mb-6">
        <Link href="/monitors" className="text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="inline mr-2 h-4 w-4" />
          Monitors
        </Link>
        <span className="text-sm text-muted-foreground mx-2">/</span>
        <span className="text-sm font-medium">Create monitor</span>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-12">
          {/* What to monitor */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left side - Description */}
            <div className="lg:col-span-1">
              <h2 className="text-lg font-semibold mb-2">What to monitor</h2>
              <p className="text-sm text-muted-foreground">
                Configure the target website you want to monitor. You'll find the advanced configuration below, in the advanced settings section.
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
                        <Label className="text-sm font-semibold">Alert us when</Label>
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
                          <SelectItem value="url_unavailable">URL becomes unavailable</SelectItem>
                          <SelectItem value="url_doesnt_contain_keyword">URL doesn't contain keyword</SelectItem>
                          <SelectItem value="keyword">Keyword matching</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <p>We recommend the keyword matching method.</p>
                        <p>
                          <a href="#" className="text-primary hover:underline cursor-pointer">Upgrade your account</a> to enable more options.
                        </p>
                      </div>
                    </div>

                    {/* Right side - Keyword input */}
                    <div className="space-y-2 min-w-0">
                      {(form.alertType === 'keyword' || form.alertType === 'url_doesnt_contain_keyword') ? (
                        <>
                          <Label className="text-sm font-semibold">Keyword to find on the page</Label>
                          <div className="relative">
                            <Input
                              value={form.keyword}
                              onChange={(e) => setForm(prev => ({ ...prev, keyword: e.target.value }))}
                              placeholder="Enter keyword"
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
                            We use case insensitive matching.
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
                      <Label className="text-sm font-semibold">URL to monitor</Label>
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
                          placeholder="https:// or paste curl command"
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
                          Go back
                        </a> to creating just one monitor.
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        You can import multiple monitors{' '}
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
                          here
                        </a>.
                      </p>
                    )}

                    {/* Headers */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Headers (JSON, optional)</Label>
                      <Textarea
                        value={form.headers_json}
                        onChange={(e) => setForm(prev => ({ ...prev, headers_json: e.target.value }))}
                        placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter headers as a JSON object. Leave empty if not needed.
                      </p>
                    </div>

                    {/* Body */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Body (optional)</Label>
                      <Textarea
                        value={form.body}
                        onChange={(e) => setForm(prev => ({ ...prev, body: e.target.value }))}
                        placeholder="Request body"
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground">
                        Request body for POST, PUT, PATCH requests.
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
              <h2 className="text-lg font-semibold mb-2">On-call escalation</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Set up rules for who's going to be notified and how when an incident occurs.
              </p>
              <p className="text-sm text-muted-foreground">
                Notify <a href="#" className="text-primary hover:underline cursor-pointer">the entire team</a> as a last resort option.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Alternatively, set up an <a href="#" className="text-primary hover:underline cursor-pointer">advanced escalation policy</a>.
              </p>
            </div>

            {/* Right side - Form cards */}
            <div className="lg:col-span-2 space-y-4">
              {/* When there's a new incident */}
              <Card className="border gap-0">
                <CardHeader className="px-6 pt-6 pb-4">
                  <CardTitle className="text-sm font-semibold">When there's a new incident</CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6 pt-0 space-y-3">
                  <div className="flex items-center gap-6 flex-wrap">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="call"
                        checked={notifications.call}
                        onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, call: checked === true }))}
                      />
                      <Label htmlFor="call" className="font-normal cursor-pointer">Call</Label>
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
                      <Label htmlFor="email" className="font-normal cursor-pointer">E-mail</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="push"
                        checked={notifications.push}
                        onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, push: checked === true }))}
                      />
                      <Label htmlFor="push" className="font-normal cursor-pointer">Push notification</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="critical"
                        checked={notifications.critical}
                        onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, critical: checked === true }))}
                      />
                      <Label htmlFor="critical" className="font-normal cursor-pointer">Critical alert</Label>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <a href="#" className="text-primary hover:underline cursor-pointer">the current on-call person</a>
                  </p>
                </CardContent>
              </Card>

              {/* If the on-call person doesn't acknowledge */}
              <Card className="border gap-0">
                <CardHeader className="px-6 pt-6 pb-4">
                  <CardTitle className="text-sm font-semibold">If the on-call person doesn't acknowledge the incident</CardTitle>
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
                      <SelectItem value="do_nothing">Do nothing</SelectItem>
                      <SelectItem value="notify_team">Notify the entire team</SelectItem>
                      <SelectItem value="escalate">Escalate to manager</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-2">
                    Set up an <a href="#" className="text-primary hover:underline cursor-pointer">advanced escalation policy</a> and let <a href="#" className="text-primary hover:underline cursor-pointer">responders choose</a> how they want to be notified.
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
              Advanced settings
            </button>
          </div>

          {/* Advanced settings */}
          {advancedSettingsOpen && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
              {/* Left side - Description */}
              <div className="lg:col-span-1">
                <h2 className="text-lg font-semibold mb-2">Advanced settings</h2>
                <p className="text-sm text-muted-foreground">
                  If you need something extra you can't configure here, please let us know at{' '}
                  <a href="mailto:hello@betterstack.com" className="text-primary hover:underline cursor-pointer">hello@betterstack.com</a> and we'll make it happen!
                </p>
                <p className="text-sm text-muted-foreground mt-4">
                  Have questions? <a href="#" className="text-primary hover:underline cursor-pointer">Let us know</a> or check out the <a href="#" className="text-primary hover:underline cursor-pointer">frequently asked questions</a>.
                </p>
              </div>

              {/* Right side - Advanced settings form */}
              <div className="lg:col-span-2">
                <Card className="border gap-0">
                  <CardContent className="px-6 py-6 space-y-6">
                    {/* Pronounceable monitor name */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Pronounceable monitor name</Label>
                      <Input
                        value={form.name}
                        onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g. API Health Check"
                      />
                      <p className="text-xs text-muted-foreground">
                        We'll use this name when we call you.
                      </p>
                    </div>

                    {/* Recovery period and Confirmation period - side by side */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Recovery period</Label>
                        <Select
                          value={advancedSettings.recoveryPeriod}
                          onValueChange={(value) => setAdvancedSettings(prev => ({ ...prev, recoveryPeriod: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="60">1 minute</SelectItem>
                            <SelectItem value="300">5 minutes</SelectItem>
                            <SelectItem value="600">10 minutes</SelectItem>
                            <SelectItem value="900">15 minutes</SelectItem>
                            <SelectItem value="1800">30 minutes</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          How long the monitor must be up to automatically mark an incident as resolved.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Confirmation period</Label>
                        <Select
                          value={advancedSettings.confirmationPeriod}
                          onValueChange={(value) => setAdvancedSettings(prev => ({ ...prev, confirmationPeriod: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="30">30 seconds</SelectItem>
                            <SelectItem value="60">1 minute</SelectItem>
                            <SelectItem value="120">2 minutes</SelectItem>
                            <SelectItem value="300">5 minutes</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          How long to wait after observing a failure before we start a new incident.
                        </p>
                      </div>
                    </div>

                    {/* Check frequency */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Check frequency</Label>
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
                          <SelectItem value="60">1 minute</SelectItem>
                          <SelectItem value="120">2 minutes</SelectItem>
                          <SelectItem value="180">3 minutes</SelectItem>
                          <SelectItem value="300">5 minutes</SelectItem>
                          <SelectItem value="600">10 minutes</SelectItem>
                          <SelectItem value="900">15 minutes</SelectItem>
                          <SelectItem value="1800">30 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        How often should we check your monitor?
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
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Monitor'}
          </Button>
        </div>
      </form>

    </div>
  );
}

