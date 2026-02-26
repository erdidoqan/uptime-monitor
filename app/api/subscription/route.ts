import { NextRequest } from 'next/server';
import {
  authenticateRequest,
  unauthorizedResponse,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';
import { getUserSubscription, getResourceCount, canCreateResource } from '@/lib/subscription';

// GET - Get current user's subscription status
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    const [subscription, resourceCount] = await Promise.all([
      getUserSubscription(auth.userId),
      getResourceCount(auth.userId),
    ]);

    const canCreate = await canCreateResource(auth.userId);

    return successResponse({
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        plan: subscription.plan,
        current_period_end: subscription.current_period_end,
        created_at: subscription.created_at,
      } : null,
      resourceCount,
      canCreateResource: canCreate.allowed,
      hasActiveSubscription: canCreate.hasActiveSubscription,
      freeLimit: 1,
    });
  } catch (error: unknown) {
    console.error('Get subscription error:', error);
    const message = error instanceof Error ? error.message : 'Abonelik bilgisi alınamadı';
    return errorResponse(message, 500);
  }
}
