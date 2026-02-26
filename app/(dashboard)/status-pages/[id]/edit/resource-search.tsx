'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Globe, Timer, Plus, Search, Loader2 } from 'lucide-react';
import type { Monitor, CronJob } from '@/shared/types';

interface ResourceSearchProps {
  onSelect: (resource: {
    resource_type: 'monitor' | 'cron_job';
    resource_id: string;
    resource_name?: string;
    resource_url?: string;
  }) => void;
  disabled?: boolean;
  excludedResources?: { resource_type: string; resource_id: string }[];
}

interface SearchResult {
  type: 'monitor' | 'cron_job';
  id: string;
  name: string | null;
  url: string;
}

export function ResourceSearch({ onSelect, disabled, excludedResources = [] }: ResourceSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load monitors and cron jobs when dropdown opens
  useEffect(() => {
    if (isOpen && !dataLoaded) {
      const loadData = async () => {
        setLoading(true);
        try {
          const [monitorsData, cronJobsData] = await Promise.all([
            api.get<Monitor[]>('/monitors'),
            api.get<CronJob[]>('/cron-jobs'),
          ]);
          setMonitors(monitorsData);
          setCronJobs(cronJobsData);
          setDataLoaded(true);
        } catch (err) {
          console.error('Failed to load resources:', err);
        } finally {
          setLoading(false);
        }
      };
      loadData();
    }
  }, [isOpen, dataLoaded]);

  // Check if resource is excluded
  const isExcluded = (type: string, id: string) => {
    return excludedResources.some(
      (r) => r.resource_type === type && r.resource_id === id
    );
  };

  // Filter results based on query and excluded resources
  useEffect(() => {
    if (!dataLoaded) return;

    const searchQuery = query.toLowerCase();
    const filteredMonitors: SearchResult[] = monitors
      .filter(m => {
        // Exclude already added resources
        if (isExcluded('monitor', m.id)) return false;
        const name = m.name?.toLowerCase() || '';
        const url = m.url.toLowerCase();
        return name.includes(searchQuery) || url.includes(searchQuery);
      })
      .map(m => ({
        type: 'monitor' as const,
        id: m.id,
        name: m.name,
        url: m.url,
      }));

    const filteredCronJobs: SearchResult[] = cronJobs
      .filter(c => {
        // Exclude already added resources
        if (isExcluded('cron_job', c.id)) return false;
        const name = c.name?.toLowerCase() || '';
        const url = c.url.toLowerCase();
        return name.includes(searchQuery) || url.includes(searchQuery);
      })
      .map(c => ({
        type: 'cron_job' as const,
        id: c.id,
        name: c.name,
        url: c.url,
      }));

    setResults([...filteredMonitors, ...filteredCronJobs]);
  }, [query, monitors, cronJobs, dataLoaded, excludedResources]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (result: SearchResult) => {
    onSelect({
      resource_type: result.type,
      resource_id: result.id,
      resource_name: result.name || undefined,
      resource_url: result.url,
    });
    setQuery('');
    setIsOpen(false);
  };

  const getDisplayName = (result: SearchResult) => {
    if (result.name) return result.name;
    try {
      const url = new URL(result.url);
      return url.hostname;
    } catch {
      return result.url;
    }
  };

  // Group results by type
  const monitorResults = results.filter(r => r.type === 'monitor');
  const cronJobResults = results.filter(r => r.type === 'cron_job');

  return (
    <div className="relative">
      <div className="relative">
        <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="Kaynak eklemek için arayın"
          className="pl-9 pr-4"
          disabled={disabled}
        />
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full bg-background border rounded-lg shadow-lg max-h-80 overflow-auto"
        >
          {loading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Yükleniyor...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center">
              <Search className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {query ? 'Kaynak bulunamadı' : (excludedResources.length > 0 ? 'Tüm kaynaklar eklendi' : 'Aramak için yazmaya başlayın')}
              </p>
            </div>
          ) : (
            <div className="py-2">
              {monitorResults.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Monitörler
                  </div>
                  {monitorResults.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      type="button"
                      onClick={() => handleSelect(result)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/50 transition-colors text-left cursor-pointer"
                    >
                      <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate">{getDisplayName(result)}</span>
                    </button>
                  ))}
                </>
              )}

              {cronJobResults.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide mt-2">
                    Cron Job&apos;lar
                  </div>
                  {cronJobResults.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      type="button"
                      onClick={() => handleSelect(result)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/50 transition-colors text-left cursor-pointer"
                    >
                      <Timer className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate">{getDisplayName(result)}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
