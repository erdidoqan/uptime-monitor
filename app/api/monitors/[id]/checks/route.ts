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
    const monitorId = id;
    const db = getD1Client();

    // Check if monitor exists and belongs to this user
    const monitor = await db.queryFirst<{ id: string }>(
      'SELECT id FROM monitors WHERE id = ? AND user_id = ?',
      [monitorId, auth.userId]
    );

    if (!monitor) {
      return errorResponse('Monitor not found', 404);
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '1000', 10);
    
    // Default to last 30 days if no date range specified
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const startDate = searchParams.get('start_date') 
      ? parseInt(searchParams.get('start_date')!)
      : thirtyDaysAgo;
    const endDate = searchParams.get('end_date')
      ? parseInt(searchParams.get('end_date')!)
      : Date.now();

    // Get checks from R2 via Worker proxy
    const workerUrl = process.env.WORKER_URL || 'https://uptime-worker.digitexa.com';
    
    const workerResponse = await fetch(
      `${workerUrl}/api/checks/${monitorId}?start_date=${startDate}&end_date=${endDate}${limit ? `&limit=${limit}` : ''}`
    );
    
    if (!workerResponse.ok) {
      throw new Error(`Worker returned ${workerResponse.status}`);
    }
    
    const checks = await workerResponse.json();

    return successResponse(checks);
  } catch (error: any) {
    console.error('Get monitor checks error:', error);
    return errorResponse(error.message || 'Failed to fetch checks', 500);
  }
}

