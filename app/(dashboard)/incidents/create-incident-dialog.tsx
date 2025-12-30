'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Plus, Monitor, Timer } from 'lucide-react';
import type { Monitor as MonitorType, CronJob, Incident } from '@/shared/types';

interface Source {
  id: string;
  name: string;
  url: string;
  type: 'monitor' | 'cron';
}

const CAUSE_OPTIONS = [
  { value: 'http_error', label: 'HTTP Error' },
  { value: 'timeout', label: 'Connection Timeout' },
  { value: 'keyword_missing', label: 'Keyword Not Found' },
  { value: 'ssl_error', label: 'SSL Certificate Error' },
  { value: 'dns_error', label: 'DNS Resolution Failed' },
  { value: 'manual', label: 'Manual Incident' },
];

export function CreateIncidentDialog() {
  const { data: session } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [cause, setCause] = useState<string>('manual');
  const [httpStatus, setHttpStatus] = useState<string>('');

  // Load monitors and cron jobs when dialog opens
  useEffect(() => {
    const apiToken = session?.user?.apiToken;
    if (!open || !apiToken) return;

    async function loadSources() {
      setLoading(true);
      try {
        const [monitorsRes, cronJobsRes] = await Promise.all([
          fetch('/api/monitors', {
            headers: { 'Authorization': `Bearer ${apiToken}` },
          }),
          fetch('/api/cron-jobs', {
            headers: { 'Authorization': `Bearer ${apiToken}` },
          }),
        ]);

        const monitors: MonitorType[] = monitorsRes.ok ? await monitorsRes.json() : [];
        const cronJobs: CronJob[] = cronJobsRes.ok ? await cronJobsRes.json() : [];

        const allSources: Source[] = [
          ...monitors.map(m => ({
            id: m.id,
            name: m.name || new URL(m.url).hostname,
            url: m.url,
            type: 'monitor' as const,
          })),
          ...cronJobs.map(c => ({
            id: c.id,
            name: c.name || new URL(c.url).hostname,
            url: c.url,
            type: 'cron' as const,
          })),
        ];

        setSources(allSources);
      } catch (error) {
        console.error('Failed to load sources:', error);
      } finally {
        setLoading(false);
      }
    }

    loadSources();
  }, [open, session?.user?.apiToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.apiToken || !selectedSource) return;

    const source = sources.find(s => s.id === selectedSource);
    if (!source) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/incidents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.user.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: source.type,
          source_id: source.id,
          cause,
          http_status: httpStatus ? parseInt(httpStatus) : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create incident');
      }

      const incident: Incident = await response.json();
      setOpen(false);
      router.push(`/incidents/${incident.id}`);
      router.refresh();
    } catch (error) {
      console.error('Failed to create incident:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedSource('');
    setCause('manual');
    setHttpStatus('');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Create Incident
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Manual Incident</DialogTitle>
            <DialogDescription>
              Create a new incident for a monitor or cron job. This will start tracking downtime.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Source selection */}
            <div className="grid gap-2">
              <Label htmlFor="source">Monitor / Cron Job</Label>
              <Select 
                value={selectedSource} 
                onValueChange={setSelectedSource}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loading ? "Loading..." : "Select a source"} />
                </SelectTrigger>
                <SelectContent>
                  {sources.length === 0 && !loading && (
                    <SelectItem value="none" disabled>No monitors or cron jobs found</SelectItem>
                  )}
                  {sources.map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      <div className="flex items-center gap-2">
                        {source.type === 'monitor' ? (
                          <Monitor className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Timer className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span>{source.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cause selection */}
            <div className="grid gap-2">
              <Label htmlFor="cause">Cause</Label>
              <Select value={cause} onValueChange={setCause}>
                <SelectTrigger>
                  <SelectValue placeholder="Select cause" />
                </SelectTrigger>
                <SelectContent>
                  {CAUSE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* HTTP Status (optional) */}
            <div className="grid gap-2">
              <Label htmlFor="httpStatus">HTTP Status (optional)</Label>
              <Input
                id="httpStatus"
                type="number"
                placeholder="e.g. 503"
                value={httpStatus}
                onChange={(e) => setHttpStatus(e.target.value)}
                min="100"
                max="599"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!selectedSource || submitting}
            >
              {submitting ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                  Creating...
                </>
              ) : (
                'Create Incident'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

