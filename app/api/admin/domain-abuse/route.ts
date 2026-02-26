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

    const abuseDomains = await db.queryAll<{
      domain: string;
      user_count: number;
      test_count: number;
      latest_test: number;
    }>(
      `SELECT domain, 
              COUNT(DISTINCT user_id) as user_count, 
              COUNT(*) as test_count,
              MAX(created_at) as latest_test
       FROM load_tests 
       WHERE user_id IS NOT NULL 
         AND domain IS NOT NULL
         AND status NOT IN ('failed', 'abandoned')
       GROUP BY domain 
       HAVING COUNT(DISTINCT user_id) > 1
       ORDER BY user_count DESC, test_count DESC`
    );

    const domainDetails = [];
    for (const d of abuseDomains) {
      const users = await db.queryAll<{
        user_id: string;
        email: string;
        name: string | null;
        is_banned: number;
        test_count: number;
        latest_test: number;
      }>(
        `SELECT lt.user_id, u.email, u.name, u.is_banned,
                COUNT(*) as test_count,
                MAX(lt.created_at) as latest_test
         FROM load_tests lt
         JOIN users u ON u.id = lt.user_id
         WHERE lt.domain = ? AND lt.user_id IS NOT NULL
           AND lt.status NOT IN ('failed', 'abandoned')
         GROUP BY lt.user_id
         ORDER BY test_count DESC`,
        [d.domain]
      );
      domainDetails.push({
        domain: d.domain,
        userCount: d.user_count,
        testCount: d.test_count,
        latestTest: d.latest_test,
        users,
      });
    }

    return successResponse({ domains: domainDetails });
  } catch (error: any) {
    console.error('Admin domain abuse error:', error);
    return errorResponse(error.message || 'Failed to fetch domain abuse data', 500);
  }
}
