import { NextRequest } from 'next/server';
import { getD1Client } from '@/lib/d1-client';
import {
  authenticateRequest,
  unauthorizedResponse,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';

// Get client IP from request headers
function getClientIP(request: NextRequest): string {
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) return cfConnectingIP;

  const xRealIP = request.headers.get('x-real-ip');
  if (xRealIP) return xRealIP;

  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',').map((ip) => ip.trim());
    return ips[0];
  }

  return 'unknown';
}

// Claim guest cron jobs created from the same IP
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    const clientIP = getClientIP(request);
    
    if (clientIP === 'unknown') {
      return successResponse({ claimed: 0, message: 'Could not determine IP address' });
    }

    const db = getD1Client();

    // Find guest cron jobs from this IP that haven't expired yet
    const guestCronJobs = await db.queryAll<{ id: string }>(
      `SELECT id FROM cron_jobs 
       WHERE guest_ip = ? 
       AND user_id IS NULL 
       AND (expires_at IS NULL OR expires_at > ?)`,
      [clientIP, Date.now()]
    );

    if (guestCronJobs.length === 0) {
      return successResponse({ claimed: 0, message: 'No guest cron jobs to claim' });
    }

    // Claim all guest cron jobs by setting user_id and removing guest fields
    for (const cronJob of guestCronJobs) {
      await db.execute(
        `UPDATE cron_jobs 
         SET user_id = ?, guest_ip = NULL, expires_at = NULL 
         WHERE id = ?`,
        [auth.userId, cronJob.id]
      );
    }

    return successResponse({
      claimed: guestCronJobs.length,
      message: `Successfully claimed ${guestCronJobs.length} cron job(s)`,
      cronJobIds: guestCronJobs.map(c => c.id),
    });
  } catch (error: any) {
    console.error('Claim guest cron jobs error:', error);
    return errorResponse(error.message || 'Failed to claim cron jobs', 500);
  }
}

