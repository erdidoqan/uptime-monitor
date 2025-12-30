'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Send, Shield, Pause, Settings } from 'lucide-react';
import { MonitorActions } from './monitor-actions';
import type { Monitor } from '@/shared/types';

interface MonitorActionsPlaceholderProps {
  monitorId: string;
}

// Client component that shows buttons immediately, then fetches monitor and enables them
export function MonitorActionsPlaceholder({ monitorId }: MonitorActionsPlaceholderProps) {
  const { data: session, status } = useSession();
  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for session to be ready before making API calls
    if (status === 'loading' || !session?.user?.apiToken) {
      return;
    }

    // Fetch monitor client-side to enable buttons
    const fetchMonitor = async () => {
      try {
        const data = await api.get<Monitor>(`/monitors/${monitorId}`);
        setMonitor(data);
      } catch (error) {
        console.error('Failed to load monitor for actions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMonitor();
  }, [monitorId, session, status]);

  // Show disabled buttons immediately
  if (loading || !monitor) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled>
          <Send className="mr-2 h-4 w-4" />
          Send test alert
        </Button>
        <Button variant="outline" size="sm" disabled>
          <Shield className="mr-2 h-4 w-4" />
          Incidents
        </Button>
        <Button variant="outline" size="sm" disabled>
          <Pause className="mr-2 h-4 w-4" />
          Pause
        </Button>
        <Button variant="outline" size="sm" disabled>
          <Settings className="mr-2 h-4 w-4" />
          Configure
        </Button>
      </div>
    );
  }

  // Show real actions when monitor loads
  return <MonitorActions monitor={monitor} />;
}

