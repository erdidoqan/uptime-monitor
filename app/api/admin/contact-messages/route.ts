import { NextRequest } from 'next/server';
import { getD1Client } from '@/lib/d1-client';
import {
  authenticateRequest,
  unauthorizedResponse,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';

const ADMIN_EMAIL = 'erdi.doqan@gmail.com';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth || auth.email !== ADMIN_EMAIL) {
      return unauthorizedResponse();
    }

    const db = getD1Client();

    const messages = await db.queryAll<{
      id: string;
      name: string;
      email: string;
      subject: string;
      message: string;
      is_read: number;
      created_at: number;
    }>(
      `SELECT id, name, email, subject, message, is_read, created_at
       FROM contact_messages
       ORDER BY created_at DESC
       LIMIT 100`
    );

    return successResponse({ messages });
  } catch (error) {
    console.error('Admin contact messages error:', error);
    return errorResponse('Mesajlar yüklenemedi.', 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth || auth.email !== ADMIN_EMAIL) {
      return unauthorizedResponse();
    }

    const { id, is_read } = await request.json();

    if (!id || typeof is_read !== 'number') {
      return errorResponse('Geçersiz parametreler.', 400);
    }

    const db = getD1Client();

    await db.execute(
      `UPDATE contact_messages SET is_read = ? WHERE id = ?`,
      [is_read, id]
    );

    return successResponse({ success: true });
  } catch (error) {
    console.error('Admin contact message update error:', error);
    return errorResponse('Mesaj güncellenemedi.', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth || auth.email !== ADMIN_EMAIL) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return errorResponse('Mesaj ID gerekli.', 400);
    }

    const db = getD1Client();

    await db.execute(`DELETE FROM contact_messages WHERE id = ?`, [id]);

    return successResponse({ success: true });
  } catch (error) {
    console.error('Admin contact message delete error:', error);
    return errorResponse('Mesaj silinemedi.', 500);
  }
}
