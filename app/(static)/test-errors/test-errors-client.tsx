'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, FileX, ServerOff } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function TestErrorsClient() {
  const [loading, setLoading] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const setStatusCode = async (statusCode: number) => {
    setLoading(statusCode.toString());
    setSuccess(null);

    try {
      const response = await fetch('/api/test-errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: '/test-errors',
          status_code: statusCode,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save configuration');
      }

      setSuccess(`Status code ${statusCode} configured! Refresh to see the effect.`);
      
      // Refresh the page after a short delay to show the new status code
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (err) {
      console.error('Error setting status code:', err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-16">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Error Test Page
        </h1>
        <p className="text-muted-foreground text-lg">
          Click a button to set this page to return that HTTP status code
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-4 pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle className="text-base">200 OK</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-6">
            <Button
              onClick={() => setStatusCode(200)}
              disabled={loading !== null}
              variant="outline"
              className="w-full"
              type="button"
            >
              {loading === '200' ? 'Setting...' : 'Set to 200'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4 pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <FileX className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <CardTitle className="text-base">404 Not Found</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-6">
            <Button
              onClick={() => setStatusCode(404)}
              disabled={loading !== null}
              variant="outline"
              className="w-full"
              type="button"
            >
              {loading === '404' ? 'Setting...' : 'Set to 404'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4 pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <ServerOff className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <CardTitle className="text-base">500 Server Error</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-6">
            <Button
              onClick={() => setStatusCode(500)}
              disabled={loading !== null}
              variant="outline"
              className="w-full"
              type="button"
            >
              {loading === '500' ? 'Setting...' : 'Set to 500'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-4 p-4 rounded-lg bg-green-100 dark:bg-green-900/30 border border-green-500">
          <p className="text-green-700 dark:text-green-300">{success}</p>
        </div>
      )}
    </div>
  );
}











