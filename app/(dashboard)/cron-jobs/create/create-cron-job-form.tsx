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

export function CreateCronJobForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  
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
      everyMinute: { label: 'Every minute', value: '* * * * *' },
      every5Min: { label: 'Every 5 minutes', value: '*/5 * * * *' },
      every10Min: { label: 'Every 10 minutes', value: '*/10 * * * *' },
    },
    hourly: {
      every15Min: { label: 'Every 15 minutes', value: '*/15 * * * *' },
      every30Min: { label: 'Every 30 minutes', value: '*/30 * * * *' },
      everyHour: { label: 'Every hour at minute 0', value: '0 * * * *' },
    },
    daily: {
      midnight: { label: 'Every day at 00:00', value: '0 0 * * *' },
      earlyMorning: { label: 'Every day at 06:00', value: '0 6 * * *' },
      morning: { label: 'Every day at 09:00', value: '0 9 * * *' },
      noon: { label: 'Every day at 12:00', value: '0 12 * * *' },
      afternoon: { label: 'Every day at 15:00', value: '0 15 * * *' },
      evening: { label: 'Every day at 18:00', value: '0 18 * * *' },
      night: { label: 'Every day at 21:00', value: '0 21 * * *' },
      endOfDay: { label: 'Every day at 23:59', value: '59 23 * * *' },
    },
    weekly: {
      monday: { label: 'Every Monday at 00:00', value: '0 0 * * 1' },
      tuesday: { label: 'Every Tuesday at 00:00', value: '0 0 * * 2' },
      wednesday: { label: 'Every Wednesday at 00:00', value: '0 0 * * 3' },
      thursday: { label: 'Every Thursday at 00:00', value: '0 0 * * 4' },
      friday: { label: 'Every Friday at 00:00', value: '0 0 * * 5' },
      saturday: { label: 'Every Saturday at 00:00', value: '0 0 * * 6' },
      sunday: { label: 'Every Sunday at 00:00', value: '0 0 * * 0' },
      mondayMorning: { label: 'Every Monday at 09:00', value: '0 9 * * 1' },
      fridayEvening: { label: 'Every Friday at 18:00', value: '0 18 * * 5' },
    },
    monthly: {
      firstDay: { label: '1st of every month at 00:00', value: '0 0 1 * *' },
      fifteenthDay: { label: '15th of every month at 00:00', value: '0 0 15 * *' },
      lastDay: { label: 'Last day of every month at 23:59', value: '59 23 L * *' },
    },
  };

  // Interval Presets (in seconds)
  const INTERVAL_PRESETS = {
    minutes: [
      { label: '1 minute', value: '60' },
      { label: '5 minutes', value: '300' },
      { label: '10 minutes', value: '600' },
      { label: '15 minutes', value: '900' },
      { label: '30 minutes', value: '1800' },
    ],
    hours: [
      { label: '1 hour', value: '3600' },
      { label: '2 hours', value: '7200' },
      { label: '3 hours', value: '10800' },
      { label: '6 hours', value: '21600' },
      { label: '12 hours', value: '43200' },
    ],
    days: [
      { label: '1 day', value: '86400' },
      { label: '2 days', value: '172800' },
      { label: '7 days', value: '604800' },
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
        setCurlParseError('Failed to parse curl command. Please check the format.');
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
        return { error: 'Invalid JSON format for headers' };
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
        error: error instanceof Error ? error.message : 'Failed to test request',
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
      if (error instanceof ApiError) {
        alert(`Failed to create cron job: ${error.message}`);
      } else {
        alert('Failed to create cron job');
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
          Cron Jobs
        </Link>
        <span className="text-sm text-muted-foreground mx-2">/</span>
        <span className="text-sm font-medium">Create cron job</span>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-12">
          {/* What to schedule */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left side - Description */}
            <div className="lg:col-span-1">
              <h2 className="text-lg font-semibold mb-2">What to schedule</h2>
              <p className="text-sm text-muted-foreground">
                Configure the HTTP request you want to schedule. You can set the URL, HTTP method, headers, and request body.
              </p>
            </div>

            {/* Right side - Form cards */}
            <div className="lg:col-span-2">
              <Card className="border gap-0">
                <CardContent className="px-6 py-6 space-y-6">
                  {/* Method + URL */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-sm font-semibold">Request</Label>
                      <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      {isCurlParsed && (
                        <Badge variant="default" className="text-xs">
                          <Check className="h-3 w-3 mr-1" />
                          Curl imported
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
                        placeholder="https:// or paste curl command"
                        className="flex-1 rounded-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        required
                      />
                    </div>
                    {curlParseError && (
                      <p className="text-xs text-red-500">{curlParseError}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      The URL that will be called when the cron job runs. You can also paste a curl command here.
                    </p>
                  </div>

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
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Schedule section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <h2 className="text-lg font-semibold mb-2">Schedule</h2>
              <p className="text-sm text-muted-foreground">
                Choose when and how often the cron job should run. You can use cron expressions for specific times or intervals for regular intervals.
              </p>
            </div>
            <div className="lg:col-span-2">
              <Card className="border gap-0">
                <CardContent className="px-6 py-6 space-y-6">
                  {/* Schedule Type Selection */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Schedule Type</Label>
                    <Select
                      value={form.scheduleType}
                      onValueChange={(value) => setForm(prev => ({ ...prev, scheduleType: value as 'cron' | 'interval' }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cron">Cron Expression</SelectItem>
                        <SelectItem value="interval">Interval</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {form.scheduleType === 'cron' 
                        ? 'Use cron expressions for specific times (e.g., daily at midnight, weekly on Monday).'
                        : 'Use intervals for regular time-based execution (e.g., every 5 minutes, every hour).'}
                    </p>
                  </div>

                  {/* Cron Expression Options */}
                  {form.scheduleType === 'cron' && (
                    <>
                      <div className="border-t -mx-6"></div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Cron Expression Mode</Label>
                          <Select
                            value={form.cronMode}
                            onValueChange={(value) => setForm(prev => ({ ...prev, cronMode: value as 'preset' | 'template' | 'custom' }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="preset">Preset</SelectItem>
                              <SelectItem value="template">Template</SelectItem>
                              <SelectItem value="custom">Custom Expression</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Preset Mode */}
                        {form.cronMode === 'preset' && (
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">Select Preset</Label>
                            <Select
                              value={form.cronPreset}
                              onValueChange={(value) => setForm(prev => ({ ...prev, cronPreset: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Choose a preset schedule" />
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
                              Choose from common scheduling presets.
                            </p>
                          </div>
                        )}

                        {/* Template Mode */}
                        {form.cronMode === 'template' && (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label className="text-sm font-semibold">Template Type</Label>
                              <Select
                                value={form.cronTemplate}
                                onValueChange={(value) => setForm(prev => ({ ...prev, cronTemplate: value as 'daily' | 'weekly' | 'monthly' }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="daily">Daily</SelectItem>
                                  <SelectItem value="weekly">Weekly</SelectItem>
                                  <SelectItem value="monthly">Monthly</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-semibold">Time</Label>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label className="text-xs text-muted-foreground">Hour</Label>
                                  <Select
                                    value={form.cronTemplateHour}
                                    onValueChange={(value) => setForm(prev => ({ ...prev, cronTemplateHour: value }))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Hour" />
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
                                  <Label className="text-xs text-muted-foreground">Minute</Label>
                                  <Select
                                    value={form.cronTemplateMinute}
                                    onValueChange={(value) => setForm(prev => ({ ...prev, cronTemplateMinute: value }))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Minute" />
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
                                <Label className="text-sm font-semibold">Day of Week</Label>
                                <Select
                                  value={form.cronTemplateDay}
                                  onValueChange={(value) => setForm(prev => ({ ...prev, cronTemplateDay: value }))}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="0">Sunday</SelectItem>
                                    <SelectItem value="1">Monday</SelectItem>
                                    <SelectItem value="2">Tuesday</SelectItem>
                                    <SelectItem value="3">Wednesday</SelectItem>
                                    <SelectItem value="4">Thursday</SelectItem>
                                    <SelectItem value="5">Friday</SelectItem>
                                    <SelectItem value="6">Saturday</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            {form.cronTemplate === 'monthly' && (
                              <div className="space-y-2">
                                <Label className="text-sm font-semibold">Day of Month (1-31)</Label>
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
                              <p className="text-xs font-medium mb-1">Generated Cron Expression:</p>
                              <p className="text-xs font-mono text-muted-foreground">{generateCronFromTemplate()}</p>
                            </div>
                          </div>
                        )}

                        {/* Custom Mode */}
                        {form.cronMode === 'custom' && (
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">Cron Expression</Label>
                            <Input
                              value={form.cron_expr}
                              onChange={(e) => setForm(prev => ({ ...prev, cron_expr: e.target.value }))}
                              placeholder="0 0 * * *"
                            />
                            <p className="text-xs text-muted-foreground">
                              Enter a cron expression in the format: minute hour day month day-of-week
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
                          <Label className="text-sm font-semibold">Interval Mode</Label>
                          <Select
                            value={form.intervalMode}
                            onValueChange={(value) => setForm(prev => ({ ...prev, intervalMode: value as 'preset' | 'custom' }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="preset">Preset</SelectItem>
                              <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Preset Intervals */}
                        {form.intervalMode === 'preset' && (
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">Select Interval</Label>
                            <Select
                              value={form.intervalPreset}
                              onValueChange={(value) => setForm(prev => ({ ...prev, intervalPreset: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Choose an interval" />
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
                              Choose from common interval presets.
                            </p>
                          </div>
                        )}

                        {/* Custom Interval */}
                        {form.intervalMode === 'custom' && (
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">Interval (seconds)</Label>
                            <Input
                              type="number"
                              min="1"
                              value={form.interval_sec}
                              onChange={(e) => setForm(prev => ({ ...prev, interval_sec: e.target.value }))}
                              placeholder="3600"
                            />
                            <p className="text-xs text-muted-foreground">
                              Enter the interval in seconds (e.g., 3600 for 1 hour).
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
                  Configure additional options like expected HTTP status codes and keyword validation.
                </p>
              </div>

              {/* Right side - Advanced settings form */}
              <div className="lg:col-span-2">
                <Card className="border gap-0">
                  <CardContent className="px-6 py-6 space-y-6">
                    {/* Pronounceable cron job name */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Pronounceable cron job name</Label>
                      <Input
                        value={form.name}
                        onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g. Daily Backup Job"
                      />
                      <p className="text-xs text-muted-foreground">
                        A friendly name for this cron job.
                      </p>
                    </div>

                    {/* Expected HTTP status range */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Expected HTTP Status Range</Label>
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
                        The HTTP status code range that indicates a successful response. Default is 200-299.
                      </p>
                    </div>

                    {/* Keyword validation */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Keyword validation (optional)</Label>
                      <Input
                        value={form.keyword}
                        onChange={(e) => setForm(prev => ({ ...prev, keyword: e.target.value }))}
                        placeholder="Enter keyword to check in response"
                      />
                      <p className="text-xs text-muted-foreground">
                        If provided, the response body must contain this keyword for the run to be considered successful.
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
          {!testPassed ? (
            <Button
              type="button"
              onClick={handleTest}
              disabled={testLoading || !isFormValidForTest() || !isScheduleValid()}
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
            <Button type="submit" disabled={submitting || !isScheduleValid()}>
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

