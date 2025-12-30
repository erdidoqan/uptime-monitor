'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { api, ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Send, Pause, Play, Trash2, CheckCircle2 } from 'lucide-react';
import type { Monitor } from '@/shared/types';

interface MonitorEditActionsProps {
  monitor: Monitor;
}

export function MonitorEditActions({ monitor }: MonitorEditActionsProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [testing, setTesting] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showTestAlert, setShowTestAlert] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const handleTestCheck = async (event: React.MouseEvent) => {
    event.preventDefault();
    if (!monitor.id || status === 'loading' || !session?.user?.apiToken) return;
    
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
    if (!monitor || !monitor.id || status === 'loading' || !session?.user?.apiToken) return;
    
    setPausing(true);
    try {
      const newIsActive = monitor.is_active === 1 ? 0 : 1;
      await api.put(`/monitors/${monitor.id}`, { is_active: newIsActive });
      router.refresh();
    } catch (error) {
      console.error('Failed to toggle pause:', error);
      alert('Failed to toggle pause');
    } finally {
      setPausing(false);
    }
  };

  const handleDelete = async (event: React.MouseEvent) => {
    event.preventDefault();
    if (!monitor || !monitor.id || status === 'loading' || !session?.user?.apiToken) return;
    
    if (!confirm('Are you sure you want to delete this monitor? This action cannot be undone.')) {
      return;
    }
    
    setDeleting(true);
    try {
      await api.delete(`/monitors/${monitor.id}`);
      router.push('/monitors');
    } catch (error) {
      console.error('Failed to delete monitor:', error);
      alert('Failed to delete monitor');
    } finally {
      setDeleting(false);
    }
  };

  const isDisabled = status === 'loading' || !session?.user?.apiToken;

  return (
    <>
      <div className="flex items-center gap-2 mb-6">
        <Button 
          type="button"
          variant="outline" 
          size="sm" 
          onClick={handleTestCheck}
          disabled={testing || monitor.is_active === 0 || isDisabled}
        >
          <Send className="mr-2 h-4 w-4" />
          {testing ? 'Testing...' : 'Send test alert'}
        </Button>
        <Button 
          type="button"
          variant="outline" 
          size="sm"
          onClick={handlePauseToggle}
          disabled={pausing || isDisabled}
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
        <div className="h-6 w-px bg-border mx-1" />
        <Button 
          type="button"
          variant="outline" 
          size="sm"
          onClick={handleDelete}
          disabled={deleting || isDisabled}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {deleting ? 'Removing...' : 'Remove'}
        </Button>
      </div>
      {showTestAlert && testResult && (
        <Alert variant={testResult.status === 'up' ? 'success' : 'destructive'} className="mb-6">
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

