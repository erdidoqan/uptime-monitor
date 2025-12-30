import { getUnosendClient } from './unosend-client';
import { getD1Client } from './d1-client';

export interface IncidentEmailParams {
  userId: string;
  incidentType: 'monitor' | 'cron';
  sourceId: string;
  sourceName?: string;
  cause: string | null;
  httpStatus: number | null;
  timestamp: number;
  incidentId: string;
}

export interface IncidentResolvedEmailParams {
  userId: string;
  incidentType: 'monitor' | 'cron';
  sourceId: string;
  sourceName?: string;
  incidentId: string;
  resolvedAt: number;
  startedAt: number;
}

/**
 * Get user email from database
 */
async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const db = getD1Client();
    const user = await db.queryFirst<{ email: string }>(
      'SELECT email FROM users WHERE id = ?',
      [userId]
    );
    return user?.email || null;
  } catch (error) {
    console.error('Failed to get user email:', error);
    return null;
  }
}

/**
 * Get source name (monitor or cron job name)
 */
async function getSourceName(
  type: 'monitor' | 'cron',
  sourceId: string
): Promise<string> {
  try {
    const db = getD1Client();
    if (type === 'monitor') {
      const monitor = await db.queryFirst<{ name: string | null; url: string }>(
        'SELECT name, url FROM monitors WHERE id = ?',
        [sourceId]
      );
      if (monitor) {
        return monitor.name || new URL(monitor.url).hostname || 'Unknown Monitor';
      }
    } else {
      const cronJob = await db.queryFirst<{ name: string | null; url: string }>(
        'SELECT name, url FROM cron_jobs WHERE id = ?',
        [sourceId]
      );
      if (cronJob) {
        return cronJob.name || new URL(cronJob.url).hostname || 'Unknown Cron Job';
      }
    }
  } catch (error) {
    console.error('Failed to get source name:', error);
  }
  return 'Unknown';
}

/**
 * Format cause for display
 */
function formatCause(cause: string | null, httpStatus: number | null): string {
  if (cause === 'http_error' && httpStatus) {
    return `HTTP ${httpStatus} Error`;
  }
  if (cause === 'keyword_missing') {
    return 'Keyword Not Found';
  }
  if (cause === 'timeout') {
    return 'Connection Timeout';
  }
  if (cause === 'unknown') {
    return 'Unknown Error';
  }
  return cause || 'Unknown Error';
}

/**
 * Get dashboard URL
 */
function getDashboardUrl(incidentId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://uptime.digitexa.com';
  return `${baseUrl}/incidents/${incidentId}`;
}

/**
 * Generate HTML email template
 */
function generateEmailHTML(params: IncidentEmailParams & { sourceName: string; userEmail: string }): string {
  const { incidentType, sourceName, cause, httpStatus, timestamp, incidentId } = params;
  const formattedCause = formatCause(cause, httpStatus);
  const date = new Date(timestamp).toLocaleString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const dashboardUrl = getDashboardUrl(incidentId);
  const typeLabel = incidentType === 'monitor' ? 'Monitor' : 'Cron Job';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Incident Alert</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Incident Alert</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
    <p style="margin-top: 0; font-size: 16px;">A new incident has been detected for your ${typeLabel.toLowerCase()}.</p>
    
    <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ef4444;">
      <h2 style="margin-top: 0; color: #1f2937; font-size: 20px;">${sourceName}</h2>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 500; width: 120px;">Type:</td>
          <td style="padding: 8px 0; color: #1f2937;">${typeLabel}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Cause:</td>
          <td style="padding: 8px 0; color: #1f2937;">${formattedCause}</td>
        </tr>
        ${httpStatus ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">HTTP Status:</td>
          <td style="padding: 8px 0; color: #1f2937;">${httpStatus}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Time:</td>
          <td style="padding: 8px 0; color: #1f2937;">${date}</td>
        </tr>
      </table>
    </div>
    
    <div style="text-align: center; margin-top: 30px;">
      <a href="${dashboardUrl}" style="display: inline-block; background: #667eea; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">View Incident Details</a>
    </div>
    
    <p style="margin-top: 30px; font-size: 14px; color: #6b7280; text-align: center;">
      This is an automated notification from Uptime Monitor.
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate resolved email HTML template
 */
function generateResolvedEmailHTML(params: IncidentResolvedEmailParams & { sourceName: string; userEmail: string }): string {
  const { incidentType, sourceName, resolvedAt, startedAt, incidentId } = params;
  const resolvedDate = new Date(resolvedAt).toLocaleString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const duration = Math.round((resolvedAt - startedAt) / 1000 / 60); // minutes
  const dashboardUrl = getDashboardUrl(incidentId);
  const typeLabel = incidentType === 'monitor' ? 'Monitor' : 'Cron Job';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Incident Resolved</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">✅ Incident Resolved</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
    <p style="margin-top: 0; font-size: 16px;">Great news! Your ${typeLabel.toLowerCase()} incident has been resolved.</p>
    
    <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981;">
      <h2 style="margin-top: 0; color: #1f2937; font-size: 20px;">${sourceName}</h2>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 500; width: 120px;">Type:</td>
          <td style="padding: 8px 0; color: #1f2937;">${typeLabel}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Resolved at:</td>
          <td style="padding: 8px 0; color: #1f2937;">${resolvedDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Duration:</td>
          <td style="padding: 8px 0; color: #1f2937;">${duration} minute${duration !== 1 ? 's' : ''}</td>
        </tr>
      </table>
    </div>
    
    <div style="text-align: center; margin-top: 30px;">
      <a href="${dashboardUrl}" style="display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">View Incident Details</a>
    </div>
    
    <p style="margin-top: 30px; font-size: 14px; color: #6b7280; text-align: center;">
      This is an automated notification from Uptime Monitor.
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send incident resolved notification email
 * This function is fire-and-forget (doesn't await email sending)
 */
export async function sendIncidentResolvedEmail(params: IncidentResolvedEmailParams): Promise<void> {
  try {
    const unosend = getUnosendClient();
    if (!unosend) {
      console.warn('Unosend client not available, skipping email notification');
      return;
    }

    // Get user email
    const userEmail = await getUserEmail(params.userId);
    if (!userEmail) {
      console.warn(`User email not found for user ${params.userId}, skipping email notification`);
      return;
    }

    // Get source name
    const sourceName = params.sourceName || await getSourceName(params.incidentType, params.sourceId);

    // Generate email content
    const subject = `✅ [Uptime Monitor] Incident Resolved: ${sourceName}`;
    const html = generateResolvedEmailHTML({ ...params, sourceName, userEmail });

    // Get from email - Unosend only accepts email address in from field
    // Display name must be configured in Unosend dashboard for the sender email
    const fromEmail = process.env.UNOSEND_FROM_EMAIL || '[email protected]';

    // Send email
    console.log(`Attempting to send resolved email to ${userEmail} via Unosend...`);
    console.log(`From: ${fromEmail}, To: ${userEmail}, Subject: ${subject}`);
    const { data, error } = await unosend.emails.send({
      from: fromEmail,
      to: userEmail,
      subject,
      html,
    });

    if (error) {
      console.error('Failed to send incident resolved email:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Unosend response:', JSON.stringify({ data, error }, null, 2));
      throw new Error(`Unosend error: ${JSON.stringify(error)}`);
    } else {
      console.log(`Incident resolved email sent successfully to ${userEmail} for incident ${params.incidentId}`);
      console.log('Unosend response data:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('Error sending incident resolved email:', error);
    // Re-throw to allow API endpoint to log the error
    throw error;
  }
}

/**
 * Send incident notification email
 */
export async function sendIncidentEmail(params: IncidentEmailParams): Promise<void> {
  try {
    const unosend = getUnosendClient();
    if (!unosend) {
      console.warn('Unosend client not available, skipping email notification');
      return;
    }

    // Get user email
    const userEmail = await getUserEmail(params.userId);
    if (!userEmail) {
      console.warn(`User email not found for user ${params.userId}, skipping email notification`);
      return;
    }

    // Get source name
    const sourceName = params.sourceName || await getSourceName(params.incidentType, params.sourceId);

    // Generate email content
    const subject = `⚠️ [Uptime Monitor] Incident Alert: ${sourceName}`;
    const html = generateEmailHTML({ ...params, sourceName, userEmail });

    // Get from email - Unosend only accepts email address in from field
    // Display name must be configured in Unosend dashboard for the sender email
    const fromEmail = process.env.UNOSEND_FROM_EMAIL || '[email protected]';

    // Send email
    console.log(`Attempting to send incident email to ${userEmail} via Unosend...`);
    console.log(`From: ${fromEmail}, To: ${userEmail}, Subject: ${subject}`);
    const { data, error } = await unosend.emails.send({
      from: fromEmail,
      to: userEmail,
      subject,
      html,
    });

    if (error) {
      console.error('Failed to send incident email:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Unosend response:', JSON.stringify({ data, error }, null, 2));
      throw new Error(`Unosend error: ${JSON.stringify(error)}`);
    } else {
      console.log(`Incident email sent successfully to ${userEmail} for incident ${params.incidentId}`);
      console.log('Unosend response data:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('Error sending incident email:', error);
    // Re-throw to allow API endpoint to log the error
    throw error;
  }
}

