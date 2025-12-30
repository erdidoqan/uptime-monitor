'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle, RotateCcw, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { Incident } from '@/shared/types';

interface IncidentActionsProps {
  incident: Incident;
}

export function IncidentActions({ incident }: IncidentActionsProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentIncident, setCurrentIncident] = useState(incident);

  const isOngoing = !currentIncident.resolved_at;

  const handleResolve = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!session?.user?.apiToken) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/incidents/${incident.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.user.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'resolve' }),
      });
      
      if (!response.ok) throw new Error('Failed to resolve');
      
      const updated: Incident = await response.json();
      setCurrentIncident(updated);
      router.refresh();
    } catch (error) {
      console.error('Failed to resolve incident:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReopen = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!session?.user?.apiToken) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/incidents/${incident.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.user.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'reopen' }),
      });
      
      if (!response.ok) throw new Error('Failed to reopen');
      
      const updated: Incident = await response.json();
      setCurrentIncident(updated);
      router.refresh();
    } catch (error) {
      console.error('Failed to reopen incident:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!session?.user?.apiToken) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/incidents/${incident.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.user.apiToken}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to delete');
      
      router.push('/incidents');
    } catch (error) {
      console.error('Failed to delete incident:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {isOngoing ? (
        <Button
          type="button"
          onClick={handleResolve}
          disabled={isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <>
              <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              <span>Resolving...</span>
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              <span>Resolve Incident</span>
            </>
          )}
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={handleReopen}
          disabled={isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <>
              <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              <span>Reopening...</span>
            </>
          ) : (
            <>
              <RotateCcw className="h-4 w-4" />
              <span>Reopen Incident</span>
            </>
          )}
        </Button>
      )}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="outline" className="gap-2 text-red-600 hover:text-red-700">
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Incident</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this incident? This action cannot be undone.
              All comments and timeline events will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

