'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Copy, MoreVertical, Trash2, Key, Plus, Check } from 'lucide-react';
import { api, ApiError } from '@/lib/api-client';
import type { ApiToken } from '@/shared/types';
import { CreateApiTokenDialog } from './create-api-token-dialog';
// Toast functionality - using simple alerts for now
const toast = {
  success: (message: string) => {
    // Could be replaced with a toast library later
    console.log('Success:', message);
  },
  error: (message: string) => {
    // Could be replaced with a toast library later
    console.error('Error:', message);
    alert(message);
  },
};

interface ApiTokenListProps {
  initialTokens: ApiToken[];
}

// Format relative time
function formatRelativeTime(timestamp: number | null): string {
  if (!timestamp) return 'Never';
  
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

// Format date
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Format scopes for display
function formatScopes(scopes: string[]): string {
  if (scopes.length === 0) return 'No scopes';
  if (scopes.length <= 2) return scopes.join(', ');
  return `${scopes.slice(0, 2).join(', ')} +${scopes.length - 2} more`;
}

export function ApiTokenList({ initialTokens }: ApiTokenListProps) {
  const { data: session } = useSession();
  const [tokens, setTokens] = useState<ApiToken[]>(initialTokens);
  const [loading, setLoading] = useState(false);
  const [selectedToken, setSelectedToken] = useState<ApiToken | null>(null);
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [newToken, setNewToken] = useState<{ token: string; id: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tokenToDelete, setTokenToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Refresh tokens
  const refreshTokens = async () => {
    if (!session?.user?.apiToken) return;
    
    setLoading(true);
    try {
      const tokens = await api.get<ApiToken[]>('/api-tokens');
      setTokens(tokens);
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message || 'Failed to load tokens');
      }
    } finally {
      setLoading(false);
    }
  };

  // Open delete dialog
  const handleDeleteClick = (tokenId: string) => {
    setTokenToDelete(tokenId);
    setDeleteDialogOpen(true);
  };

  // Delete token
  const handleDelete = async () => {
    if (!session?.user?.apiToken || !tokenToDelete) return;
    
    setIsDeleting(true);
    try {
      await api.delete(`/api-tokens/${tokenToDelete}`);
      toast.success('Token revoked successfully');
      setDeleteDialogOpen(false);
      setTokenToDelete(null);
      await refreshTokens();
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message || 'Failed to revoke token');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Copy token to clipboard
  const handleCopyToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      toast.success('Token copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy token');
    }
  };

  // Handle new token created
  const handleTokenCreated = (tokenData: { token: string; id: string }) => {
    setNewToken(tokenData);
    setShowTokenDialog(true);
    refreshTokens();
  };

  const activeTokens = tokens.filter((t) => !t.revoked_at);
  const revokedTokens = tokens.filter((t) => t.revoked_at);

  return (
    <>
      <div className="space-y-4">
        {/* Create token button */}
        <div className="flex justify-end">
          <CreateApiTokenDialog onTokenCreated={handleTokenCreated} />
        </div>

        {/* Active tokens */}
        {activeTokens.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-2">
              Active Tokens
            </h2>
            <Card className="border">
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {activeTokens.map((token) => (
                    <div
                      key={token.id}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors"
                    >
                      <Key className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">
                            {token.name || 'Unnamed Token'}
                          </p>
                          <code className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            {token.token_prefix}...
                          </code>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{formatScopes(token.scopes)}</span>
                          <span>•</span>
                          <span>Created {formatDate(token.created_at)}</span>
                          {token.last_used_at && (
                            <>
                              <span>•</span>
                              <span>Last used {formatRelativeTime(token.last_used_at)}</span>
                            </>
                          )}
                          {token.expires_at && (
                            <>
                              <span>•</span>
                              <span>
                                Expires {formatDate(token.expires_at)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(token.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Revoke
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Revoked tokens */}
        {revokedTokens.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-2">
              Revoked Tokens
            </h2>
            <Card className="border opacity-60">
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {revokedTokens.map((token) => (
                    <div
                      key={token.id}
                      className="flex items-center gap-4 px-6 py-4"
                    >
                      <Key className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-muted-foreground">
                            {token.name || 'Unnamed Token'}
                          </p>
                          <code className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            {token.token_prefix}...
                          </code>
                          <span className="text-xs text-muted-foreground">
                            (Revoked)
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Revoked {formatDate(token.revoked_at!)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Empty state */}
        {tokens.length === 0 && (
          <Card className="border">
            <CardContent className="py-12 text-center">
              <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No API tokens</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create an API token to access the API programmatically
              </p>
              <CreateApiTokenDialog onTokenCreated={handleTokenCreated} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* New token dialog */}
      <Dialog open={showTokenDialog} onOpenChange={setShowTokenDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>API Token Created</DialogTitle>
            <DialogDescription>
              Your API token has been created. Make sure to copy it now - you
              won't be able to see it again!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <code className="block w-full p-3 bg-muted rounded-md text-sm font-mono break-all">
                {newToken?.token}
              </code>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="absolute right-2 top-2"
                onClick={() => newToken && handleCopyToken(newToken.token)}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Important:</strong> This token will only be shown once.
                Store it securely.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Token</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke this token? This action cannot be undone.
              The token will immediately stop working and cannot be recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Revoking...' : 'Revoke Token'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

