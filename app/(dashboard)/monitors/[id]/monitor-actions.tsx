'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Send, Shield, Pause, Settings, Play, CheckCircle2 } from 'lucide-react';
import type { Monitor } from '@/shared/types';

interface MonitorActionsProps {
  monitor: Monitor;
  onUpdate?: () => void;
}

export function MonitorActions({ monitor, onUpdate }: MonitorActionsProps) {
  const router = useRouter();
  const [testing, setTesting] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [showTestAlert, setShowTestAlert] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const handleTestCheck = async (event: React.MouseEvent) => {
    event.preventDefault();
    if (!monitor.id) return;
    
    setTesting(true);
    setTestResult(null);
    try {
      const result = await api.post<{
        status: 'up' | 'down';
        http_status: number | null;
        latency_ms: number;
        error?: string | null;
        debug?: {
          expected_min: number;
          expected_max: number;
          status_in_range: boolean;
          keyword: string | null;
          keyword_match: boolean | null;
          url: string;
        };
      }>(`/monitors/${monitor.id}/test-check`);
      
      setTestResult(result);
      // Refresh the page to show updated data
      router.refresh();
      if (onUpdate) onUpdate();
      setShowTestAlert(true);
      // Hide alert after 10 seconds
      setTimeout(() => {
        setShowTestAlert(false);
        setTestResult(null);
      }, 10000);
    } catch (error) {
      console.error('Failed to perform test check:', error);
      alert('Failed to perform test check');
    } finally {
      setTesting(false);
    }
  };

  const handlePauseToggle = async (event: React.MouseEvent) => {
    event.preventDefault();
    if (!monitor || !monitor.id) return;
    
    setPausing(true);
    try {
      const newIsActive = monitor.is_active === 1 ? 0 : 1;
      await api.put(`/monitors/${monitor.id}`, { is_active: newIsActive });
      // Refresh the page to show updated data
      router.refresh();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to toggle pause:', error);
      alert('Failed to toggle pause');
    } finally {
      setPausing(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button 
          type="button"
          variant="outline" 
          size="sm" 
          onClick={handleTestCheck}
          disabled={testing || monitor.is_active === 0}
        >
          <Send className="mr-2 h-4 w-4" />
          {testing ? 'Testing...' : 'Send test alert'}
        </Button>
        <Button variant="outline" size="sm">
          <Shield className="mr-2 h-4 w-4" />
          Incidents
        </Button>
        <Button 
          type="button"
          variant="outline" 
          size="sm"
          onClick={handlePauseToggle}
          disabled={pausing}
        >
          {monitor.is_active === 0 ? (
            <>
              <Play className="mr-2 h-4 w-4" />
              {pausing ? 'Resuming...' : 'Resume'}
            </>
          ) : (
            <>
              <Pause className="mr-2 h-4 w-4" />
              {pausing ? 'Pausing...' : 'Pause'}
            </>
          )}
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/monitors/${monitor.id}/edit`}>
            <Settings className="mr-2 h-4 w-4" />
            Configure
          </Link>
        </Button>
      </div>
      {showTestAlert && testResult && (
        <Alert variant={testResult.status === 'up' ? 'success' : 'destructive'} className="mt-4">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium">
              Test check result: {testResult.status === 'up' ? 'UP' : 'DOWN'}
            </div>
            {testResult.debug && (
              <div className="text-sm mt-2 space-y-1">
                <div>HTTP Status: {testResult.http_status || 'N/A'}</div>
                <div>Latency: {testResult.latency_ms}ms</div>
                <div>Expected Range: {testResult.debug.expected_min}-{testResult.debug.expected_max}</div>
                <div>Status in Range: {testResult.debug.status_in_range ? '✅' : '❌'}</div>
                {testResult.debug.keyword && (
                  <div>Keyword Match: {testResult.debug.keyword_match ? '✅' : '❌'} (keyword: "{testResult.debug.keyword}")</div>
                )}
                {testResult.error && (
                  <div className="text-red-600">Error: {testResult.error}</div>
                )}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}

