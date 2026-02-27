import { NextRequest } from 'next/server';
import { getD1Client } from '@/lib/d1-client';
import { errorResponse, successResponse } from '@/lib/api-helpers';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    if (!name || !email || !subject || !message) {
      return errorResponse('Tüm alanlar zorunludur.', 400);
    }

    if (name.length > 200 || email.length > 200 || subject.length > 500 || message.length > 5000) {
      return errorResponse('Alan uzunluk limitleri aşıldı.', 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponse('Geçerli bir e-posta adresi giriniz.', 400);
    }

    const db = getD1Client();
    const id = nanoid();
    const now = Math.floor(Date.now() / 1000);

    await db.execute(
      `INSERT INTO contact_messages (id, name, email, subject, message, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [id, name.trim(), email.trim(), subject.trim(), message.trim(), now]
    );

    return successResponse({ success: true });
  } catch (error) {
    console.error('Contact form error:', error);
    return errorResponse('Mesaj gönderilemedi. Lütfen tekrar deneyin.', 500);
  }
}
