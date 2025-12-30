import { NextRequest } from 'next/server';
import { getD1Client } from '@/lib/d1-client';
import { errorResponse, successResponse } from '@/lib/api-helpers';
import { takeScreenshot } from '@/lib/screenshot-service';
import { uploadFileToR2 } from '@/lib/r2-client';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Internal API endpoint for taking and storing incident screenshots
 * Called by worker when a monitor incident is created
 * Requires internal token for security
 */
export async function POST(request: NextRequest, context: RouteContext) {
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

    const { id } = await context.params;
    const db = getD1Client();

    // Get incident and check if it's a monitor incident
    const incident = await db.queryFirst<{
      id: string;
      type: string;
      source_id: string;
      screenshot_url: string | null;
    }>('SELECT id, type, source_id, screenshot_url FROM incidents WHERE id = ?', [id]);

    if (!incident) {
      return errorResponse('Incident not found', 404);
    }

    // Only take screenshots for monitor incidents
    if (incident.type !== 'monitor') {
      return errorResponse('Screenshots are only available for monitor incidents', 400);
    }

    // Check if screenshot already exists
    if (incident.screenshot_url) {
      return successResponse({ 
        success: true, 
        message: 'Screenshot already exists',
        screenshot_url: incident.screenshot_url 
      });
    }

    // Get monitor URL
    const monitor = await db.queryFirst<{ url: string }>(
      'SELECT url FROM monitors WHERE id = ?',
      [incident.source_id]
    );

    if (!monitor) {
      return errorResponse('Monitor not found', 404);
    }

    console.log(`Taking screenshot for incident ${id}, monitor URL: ${monitor.url}`);

    // Take screenshot and upload (with detailed logging)
    try {
      console.log(`Step 1: Starting screenshot capture for ${monitor.url}`);
      
      // Check if screenshot is disabled
      if (process.env.DISABLE_SCREENSHOTS === 'true') {
        console.log('Screenshot feature is disabled via DISABLE_SCREENSHOTS env var');
        return successResponse({ 
          success: false, 
          message: 'Screenshot feature is disabled',
          error: 'Screenshot feature is disabled'
        });
      }
      
      // Take screenshot
      const screenshotBuffer = await takeScreenshot(monitor.url, {
        timeout: 45000,
        viewport: { width: 1920, height: 1080 },
        fullPage: true,
        waitUntil: 'networkidle2',
      });

      console.log(`Step 2: Screenshot captured, size: ${screenshotBuffer.length} bytes`);

      // Upload to R2
      const screenshotPath = `incidents/${id}/screenshot.png`;
      console.log(`Step 3: Uploading to R2 path: ${screenshotPath}`);
      
      // Convert Buffer to ArrayBuffer
      const arrayBuffer = screenshotBuffer.buffer.slice(
        screenshotBuffer.byteOffset,
        screenshotBuffer.byteOffset + screenshotBuffer.byteLength
      ) as ArrayBuffer;
      
      const screenshotUrl = await uploadFileToR2(
        screenshotPath,
        arrayBuffer,
        'image/png'
      );

      console.log(`Step 4: Uploaded to R2, URL: ${screenshotUrl}`);

      // Update incident with screenshot URL
      await db.execute(
        'UPDATE incidents SET screenshot_url = ? WHERE id = ?',
        [screenshotUrl, id]
      );

      console.log(`Step 5: Incident updated with screenshot URL: ${screenshotUrl}`);

      return successResponse({ 
        success: true, 
        message: 'Screenshot captured and uploaded successfully',
        screenshot_url: screenshotUrl
      });
    } catch (error) {
      console.error(`Failed to take screenshot for incident ${id}:`, error);
      console.error('Error details:', error instanceof Error ? error.stack : String(error));
      
      // Check if it's a Chromium/library error
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isChromiumError = errorMessage.includes('libnss3.so') || 
                             errorMessage.includes('shared libraries') ||
                             errorMessage.includes('Failed to launch the browser process');
      
      if (isChromiumError) {
        console.error('Chromium library error detected. Screenshot feature may not be available on this platform.');
      }
      
      // Return success but log the error - screenshot failure shouldn't break incident creation
      return successResponse({ 
        success: false, 
        message: 'Screenshot capture failed',
        error: errorMessage,
        note: isChromiumError ? 'Screenshot feature is not available on this platform. Consider using an external screenshot service.' : undefined
      });
    }
  } catch (error: unknown) {
    console.error('Screenshot API error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process screenshot request';
    return errorResponse(message, 500);
  }
}

