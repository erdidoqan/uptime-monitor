import { NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse, errorResponse, successResponse } from '@/lib/api-helpers';
import { sendIncidentEmail } from '@/lib/incident-notifications';
import { v4 as uuidv4 } from 'uuid';

/**
 * Test endpoint for incident email notifications
 * POST /api/test-incident-email
 * Body: { type: 'monitor' | 'cron', source_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { type, source_id } = body;

    if (!type || !source_id) {
      return errorResponse('type and source_id are required');
    }

    if (!['monitor', 'cron'].includes(type)) {
      return errorResponse('type must be "monitor" or "cron"');
    }

    // Create a test incident ID
    const testIncidentId = uuidv4();
    const now = Date.now();

    // Send test email
    sendIncidentEmail({
      userId: auth.userId,
      incidentType: type as 'monitor' | 'cron',
      sourceId: source_id,
      cause: 'manual',
      httpStatus: 500,
      timestamp: now,
      incidentId: testIncidentId,
    });

    return successResponse({
      message: 'Test email sent',
      incidentId: testIncidentId,
      note: 'Check your email inbox. This is a test email and no actual incident was created.',
    });
  } catch (error: any) {
    console.error('Test incident email error:', error);
    return errorResponse(error.message || 'Failed to send test email', 500);
  }
}

