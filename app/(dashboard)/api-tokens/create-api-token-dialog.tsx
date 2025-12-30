'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Key } from 'lucide-react';
import { api, ApiError } from '@/lib/api-client';

interface CreateApiTokenDialogProps {
  onTokenCreated: (tokenData: { token: string; id: string }) => void;
}

const AVAILABLE_SCOPES = [
  { value: 'monitors:read', label: 'Monitors: Read' },
  { value: 'monitors:write', label: 'Monitors: Write' },
  { value: 'cron-jobs:read', label: 'Cron Jobs: Read' },
  { value: 'cron-jobs:write', label: 'Cron Jobs: Write' },
  { value: 'incidents:read', label: 'Incidents: Read' },
  { value: 'incidents:write', label: 'Incidents: Write' },
];

export function CreateApiTokenDialog({
  onTokenCreated,
}: CreateApiTokenDialogProps) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session?.user?.apiToken) {
      setError('Not authenticated');
      return;
    }

    if (selectedScopes.length === 0) {
      setError('Please select at least one scope');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const body: {
        name?: string;
        scopes: string[];
        expires_at?: number;
      } = {
        scopes: selectedScopes,
      };

      if (name.trim()) {
        body.name = name.trim();
      }

      if (expiresAt) {
        const date = new Date(expiresAt);
        if (date.getTime() <= Date.now()) {
          setError('Expiration date must be in the future');
          setSubmitting(false);
          return;
        }
        body.expires_at = date.getTime();
      }

      const response = await api.post<{
        id: string;
        token: string;
        name: string | null;
        token_prefix: string;
        scopes: string[];
        created_at: number;
        expires_at: number | null;
      }>('/api-tokens', body);

      onTokenCreated({ token: response.token, id: response.id });
      setOpen(false);
      resetForm();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to create API token');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setSelectedScopes([]);
    setExpiresAt('');
    setError(null);
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope)
        ? prev.filter((s) => s !== scope)
        : [...prev, scope]
    );
  };

  const selectAllScopes = () => {
    if (selectedScopes.length === AVAILABLE_SCOPES.length) {
      setSelectedScopes([]);
    } else {
      setSelectedScopes(AVAILABLE_SCOPES.map((s) => s.value));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Create API Token
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create API Token</DialogTitle>
            <DialogDescription>
              Create a new API token for programmatic access. Select the scopes
              that this token should have.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">Name (optional)</Label>
              <Input
                id="name"
                placeholder="e.g. Production API, Development"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
              />
            </div>

            {/* Scopes */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Scopes</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={selectAllScopes}
                  disabled={submitting}
                  className="h-auto p-0 text-xs"
                >
                  {selectedScopes.length === AVAILABLE_SCOPES.length
                    ? 'Deselect All'
                    : 'Select All'}
                </Button>
              </div>
              <div className="space-y-2 border rounded-md p-3 max-h-[200px] overflow-y-auto">
                {AVAILABLE_SCOPES.map((scope) => (
                  <div
                    key={scope.value}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={scope.value}
                      checked={selectedScopes.includes(scope.value)}
                      onCheckedChange={() => toggleScope(scope.value)}
                      disabled={submitting}
                    />
                    <Label
                      htmlFor={scope.value}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {scope.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Expiration */}
            <div className="grid gap-2">
              <Label htmlFor="expires_at">Expiration Date (optional)</Label>
              <Input
                id="expires_at"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                disabled={submitting}
                min={new Date().toISOString().slice(0, 16)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for no expiration
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
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
            <Button type="submit" disabled={submitting || selectedScopes.length === 0}>
              {submitting ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Key className="mr-2 h-4 w-4" />
                  Create Token
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

