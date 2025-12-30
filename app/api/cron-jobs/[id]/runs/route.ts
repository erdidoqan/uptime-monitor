import { NextRequest, NextResponse } from 'next/server';
import { getD1Client } from '@/lib/d1-client';
import {
  authenticateRequest,
  unauthorizedResponse,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    const cronJobId = id;

    // Verify cron job belongs to this user
    const db = getD1Client();
    const cronJob = await db.queryFirst<{ id: string }>(
      'SELECT id FROM cron_jobs WHERE id = ? AND user_id = ?',
      [cronJobId, auth.userId]
    );

    if (!cronJob) {
      return errorResponse('Cron job not found', 404);
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    
    // Default to last 30 days if no date range specified
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const startDate = searchParams.get('start_date') 
      ? parseInt(searchParams.get('start_date')!)
      : thirtyDaysAgo;

    // Get cron runs from D1 via Worker proxy
    const workerUrl = process.env.WORKER_URL || 'https://uptime-worker.digitexa.com';
    
    const workerResponse = await fetch(
      `${workerUrl}/api/cron-runs/${cronJobId}?start_date=${startDate}${limit ? `&limit=${limit}` : ''}`
    );
    
    if (!workerResponse.ok) {
      throw new Error(`Worker returned ${workerResponse.status}`);
    }
    
    const runs = await workerResponse.json();
    
    // Ensure we return an array
    const runsArray = Array.isArray(runs) ? runs : [];

    return successResponse(runsArray);
  } catch (error: any) {
    console.error('Get cron runs error:', error);
    return errorResponse(error.message || 'Failed to fetch runs', 500);
  }
}

