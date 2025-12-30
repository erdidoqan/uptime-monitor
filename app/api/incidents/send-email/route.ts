import { NextRequest } from 'next/server';
import { sendIncidentEmail, sendIncidentResolvedEmail } from '@/lib/incident-notifications';
import { errorResponse, successResponse } from '@/lib/api-helpers';

/**
 * Internal API endpoint for sending incident emails
 * Called by worker or other internal services
 * Requires internal token for security
 */
export async function POST(request: NextRequest) {
  try {
    // Check for internal token (from worker)
    const authHeader = request.headers.get('authorization');
    const internalToken = process.env.INTERNAL_API_TOKEN;
    
    if (!internalToken) {
      console.error('INTERNAL_API_TOKEN not set in Next.js environment');
      return errorResponse('Internal API token not configured', 500);
    }
    
    if (authHeader !== `Bearer ${internalToken}`) {
      console.error('Invalid authorization header:', authHeader ? 'Token provided but incorrect' : 'No token provided');
      return errorResponse('Unauthorized', 401);
    }

    const body = await request.json();
    const { type, ...params } = body;

    console.log(`Received email request: type=${type}, incidentId=${params.incidentId}, userId=${params.userId}`);

    // Send email and await completion
    try {
      if (type === 'incident') {
        await sendIncidentEmail(params);
        console.log(`Email sent successfully for incident ${params.incidentId}`);
      } else if (type === 'resolved') {
        await sendIncidentResolvedEmail(params);
        console.log(`Email sent successfully for resolved incident ${params.incidentId}`);
      } else {
        return errorResponse('Invalid type. Must be "incident" or "resolved"', 400);
      }

      return successResponse({ success: true, message: 'Email sent successfully' });
    } catch (emailError: any) {
      console.error('Email sending failed:', emailError);
      // Still return 200 to worker, but log the error
      // Worker should not retry on email failures
      return successResponse({ 
        success: false, 
        message: 'Email sending failed', 
        error: emailError.message 
      });
    }
  } catch (error: any) {
    console.error('Send email error:', error);
    return errorResponse(error.message || 'Failed to send email', 500);
  }
}

