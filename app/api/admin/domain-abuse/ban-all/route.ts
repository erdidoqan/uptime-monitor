import { NextRequest } from 'next/server';
import { getD1Client } from '@/lib/d1-client';
import {
  authenticateRequest,
  unauthorizedResponse,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';

const ADMIN_EMAIL = 'erdi.doqan@gmail.com';

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth || auth.email !== ADMIN_EMAIL) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { domain } = body;

    if (!domain || typeof domain !== 'string') {
      return errorResponse('Domain gerekli', 400);
    }

    const db = getD1Client();

    /* 1) Bu domain'e test yapan tüm kullanıcıları bul */
    const users = await db.queryAll<{ user_id: string }>(
      `SELECT DISTINCT user_id FROM load_tests 
       WHERE domain = ? AND user_id IS NOT NULL 
       AND status NOT IN ('failed', 'abandoned')`,
      [domain]
    );

    /* 2) Bu domain'e test yapan tüm IP'leri bul */
    const ips = await db.queryAll<{ ip_address: string }>(
      `SELECT DISTINCT ip_address FROM load_tests 
       WHERE domain = ? AND ip_address IS NOT NULL AND ip_address != 'unknown'
       AND status NOT IN ('failed', 'abandoned')`,
      [domain]
    );

    let bannedUsers = 0;
    let bannedIps = 0;

    /* 3) Tüm kullanıcıları banla */
    for (const u of users) {
      try {
        await db.execute('UPDATE users SET is_banned = 1 WHERE id = ?', [u.user_id]);
        bannedUsers++;
      } catch (err) {
        console.error(`[ban-all] Failed to ban user ${u.user_id}:`, err);
      }
    }

    /* 4) Tüm IP'leri banla */
    const now = Date.now();
    for (const ipRow of ips) {
      try {
        await db.execute(
          `INSERT OR REPLACE INTO banned_ips (ip, reason, banned_by, created_at) VALUES (?, ?, ?, ?)`,
          [ipRow.ip_address, `Domain abuse: ${domain}`, auth.userId, now]
        );
        bannedIps++;
      } catch (err) {
        console.error(`[ban-all] Failed to ban IP ${ipRow.ip_address}:`, err);
      }
    }

    return successResponse({
      ok: true,
      bannedUsers,
      bannedIps,
      domain,
    });
  } catch (error: any) {
    console.error('Admin ban-all error:', error);
    return errorResponse(error.message || 'Ban işlemi başarısız', 500);
  }
}
