import { notFound } from 'next/navigation';
import { getD1Client } from '@/lib/d1-client';
import { TestErrorsClient } from './test-errors-client';

// Force dynamic rendering to check database on every request
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getStatusCodeForPath(path: string): Promise<number | null> {
  try {
    const db = getD1Client();
    const route = await db.queryFirst<{ status_code: number }>(
      'SELECT status_code FROM test_error_routes WHERE path = ?',
      [path]
    );
    return route?.status_code || null;
  } catch (error) {
    console.error('Error checking test error route:', error);
    return null;
  }
}

// Custom error class for 500 errors
class TestErrorRouteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TestErrorRouteError';
  }
}

export default async function TestErrorsPage() {
  const path = '/test-errors';
  const statusCode = await getStatusCodeForPath(path);

  // If 404 is configured, return 404
  if (statusCode === 404) {
    notFound();
  }

  // If 500 is configured, throw error
  if (statusCode === 500) {
    throw new TestErrorRouteError('Internal Server Error - Test Error Route');
  }

  // Otherwise render normally (200 or no config)
  return <TestErrorsClient />;
}
