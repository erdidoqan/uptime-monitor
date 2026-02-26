import { NextRequest, NextResponse } from 'next/server';
import { getD1Client } from '@/lib/d1-client';
import { verifyUnsubscribeToken } from '@/lib/email-utils';

/**
 * GET /api/email/unsubscribe?uid=xxx&token=xxx
 *
 * HMAC tokenli abonelikten cikma endpoint'i.
 * Login gerektirmez — email icindeki link ile calisir.
 * Basarili olursa onay sayfasi dondurur.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const uid = searchParams.get('uid');
  const token = searchParams.get('token');

  // Validasyon
  if (!uid || !token) {
    return htmlResponse('Geçersiz İstek', 'Abonelikten çıkma bağlantısı geçersiz.', false);
  }

  // Token dogrulama
  if (!verifyUnsubscribeToken(uid, token)) {
    return htmlResponse('Geçersiz Bağlantı', 'Bu abonelikten çıkma bağlantısı geçersiz veya süresi dolmuş.', false);
  }

  try {
    const db = getD1Client();

    // Kullanici emailini al
    const user = await db.queryFirst<{ email: string }>(
      'SELECT email FROM users WHERE id = ?',
      [uid],
    );

    if (!user) {
      return htmlResponse('Kullanıcı Bulunamadı', 'Bu kullanıcı hesabı bulunamadı.', false);
    }

    // Zaten abonelikten cikmis mi?
    const existing = await db.queryFirst<{ id: string }>(
      'SELECT id FROM email_unsubscribes WHERE user_id = ?',
      [uid],
    );

    if (existing) {
      return htmlResponse(
        'Zaten Abonelikten Çıktınız',
        `<strong>${user.email}</strong> adresi zaten kampanya e-postalarından çıkarılmış.`,
        true,
      );
    }

    // Abonelikten cik
    await db.execute(
      `INSERT INTO email_unsubscribes (id, user_id, email, unsubscribed_at) VALUES (?, ?, ?, ?)`,
      [crypto.randomUUID(), uid, user.email, Date.now()],
    );

    return htmlResponse(
      'Abonelikten Çıkıldı',
      `<strong>${user.email}</strong> adresi kampanya e-postalarından başarıyla çıkarıldı. Artık promosyon e-postaları almayacaksınız.<br><br>Sistem bildirimleri (monitör uyarıları vb.) bu işlemden etkilenmez.`,
      true,
    );
  } catch (err) {
    console.error('[email/unsubscribe] Error:', err);
    return htmlResponse('Bir Hata Oluştu', 'İşlem sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.', false);
  }
}

/* ───────── HTML Response Helper ───────── */

function htmlResponse(title: string, message: string, success: boolean): NextResponse {
  const iconColor = success ? '#10b981' : '#ef4444';
  const iconPath = success
    ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />'
    : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />';

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - UptimeTR</title>
</head>
<body style="margin: 0; padding: 0; background: #0a0a0b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh;">
  <div style="max-width: 480px; margin: 40px auto; padding: 48px 40px; text-align: center;">
    <!-- Logo -->
    <div style="margin-bottom: 32px;">
      <a href="https://www.uptimetr.com" style="text-decoration: none; display: inline-block;">
        <img src="https://www.uptimetr.com/android-chrome-192x192.png" alt="UptimeTR" width="48" height="48" style="border-radius: 12px; vertical-align: middle; margin-right: 12px;" />
        <span style="color: #ffffff; font-size: 24px; font-weight: 700; vertical-align: middle;">UptimeTR</span>
      </a>
    </div>
    
    <!-- Icon -->
    <div style="margin-bottom: 24px;">
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" xmlns="http://www.w3.org/2000/svg" style="display: inline-block;">
        ${iconPath}
      </svg>
    </div>
    
    <!-- Title -->
    <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: #ffffff;">${title}</h1>
    
    <!-- Message -->
    <p style="margin: 0 0 32px 0; font-size: 15px; color: #9ca3af; line-height: 1.7;">${message}</p>
    
    <!-- Back link -->
    <a href="https://www.uptimetr.com" style="display: inline-block; padding: 12px 32px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px;">
      Ana Sayfaya Dön
    </a>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
