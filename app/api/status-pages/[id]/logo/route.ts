import { NextRequest } from 'next/server';
import { getD1Client } from '@/lib/d1-client';
import {
  authenticateRequestOrToken,
  unauthorizedResponse,
  errorResponse,
  successResponse,
  notFoundResponse,
} from '@/lib/api-helpers';
import { uploadFileToR2, deleteFileFromR2 } from '@/lib/r2-client';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];

function getExtensionFromMime(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/svg+xml': 'svg',
    'image/webp': 'webp',
  };
  return mimeToExt[mimeType] || 'png';
}

// POST: Upload logo
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authenticateRequestOrToken(request);

    if (!auth) {
      return unauthorizedResponse();
    }

    const db = getD1Client();

    // Check if status page exists and belongs to user
    const statusPage = await db.queryFirst<{
      id: string;
      user_id: string;
      logo_url: string | null;
    }>(
      `SELECT id, user_id, logo_url FROM status_pages WHERE id = ?`,
      [id]
    );

    if (!statusPage) {
      return notFoundResponse('Status page not found');
    }

    if (statusPage.user_id !== auth.userId) {
      return errorResponse('Unauthorized', 403);
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return errorResponse('No file provided', 400);
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return errorResponse(`Invalid file type. Allowed types: ${ALLOWED_TYPES.join(', ')}`, 400);
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return errorResponse(`File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`, 400);
    }

    // Delete old logo if exists
    if (statusPage.logo_url) {
      try {
        // Extract path from URL
        const publicUrl = process.env.R2_PUBLIC_URL;
        if (publicUrl && statusPage.logo_url.startsWith(publicUrl)) {
          const oldPath = statusPage.logo_url.replace(`${publicUrl}/`, '');
          await deleteFileFromR2(oldPath);
        }
      } catch (error) {
        console.warn('Failed to delete old logo:', error);
        // Continue anyway
      }
    }

    // Upload new logo
    const extension = getExtensionFromMime(file.type);
    const logoPath = `status-pages/${id}/logo.${extension}`;
    const arrayBuffer = await file.arrayBuffer();

    const logoUrl = await uploadFileToR2(logoPath, arrayBuffer, file.type);

    // Update database with new logo URL
    await db.execute(
      `UPDATE status_pages SET logo_url = ?, updated_at = ? WHERE id = ?`,
      [logoUrl, Date.now(), id]
    );

    return successResponse({
      success: true,
      logo_url: logoUrl,
    });
  } catch (error: any) {
    console.error('Logo upload error:', error);
    return errorResponse(error.message || 'Failed to upload logo', 500);
  }
}

// DELETE: Remove logo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authenticateRequestOrToken(request);

    if (!auth) {
      return unauthorizedResponse();
    }

    const db = getD1Client();

    // Check if status page exists and belongs to user
    const statusPage = await db.queryFirst<{
      id: string;
      user_id: string;
      logo_url: string | null;
    }>(
      `SELECT id, user_id, logo_url FROM status_pages WHERE id = ?`,
      [id]
    );

    if (!statusPage) {
      return notFoundResponse('Status page not found');
    }

    if (statusPage.user_id !== auth.userId) {
      return errorResponse('Unauthorized', 403);
    }

    // Delete logo from R2 if exists
    if (statusPage.logo_url) {
      try {
        const publicUrl = process.env.R2_PUBLIC_URL;
        if (publicUrl && statusPage.logo_url.startsWith(publicUrl)) {
          const logoPath = statusPage.logo_url.replace(`${publicUrl}/`, '');
          await deleteFileFromR2(logoPath);
        }
      } catch (error) {
        console.warn('Failed to delete logo from R2:', error);
        // Continue anyway - still update DB
      }
    }

    // Update database to remove logo URL
    await db.execute(
      `UPDATE status_pages SET logo_url = NULL, updated_at = ? WHERE id = ?`,
      [Date.now(), id]
    );

    return successResponse({ success: true });
  } catch (error: any) {
    console.error('Logo delete error:', error);
    return errorResponse(error.message || 'Failed to delete logo', 500);
  }
}
