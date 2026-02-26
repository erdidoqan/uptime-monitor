import { getD1Client } from '@/lib/d1-client';

export interface Subscription {
  id: string;
  user_id: string;
  polar_customer_id: string | null;
  polar_subscription_id: string | null;
  status: 'active' | 'inactive' | 'canceled' | 'past_due';
  plan: string;
  current_period_end: number | null;
  created_at: number;
  updated_at: number;
}

export interface ResourceCount {
  monitors: number;
  cron_jobs: number;
  total: number;
}

// Free tier limit
export const FREE_RESOURCE_LIMIT = 1;

/**
 * Get user's subscription from database
 */
export async function getUserSubscription(userId: string): Promise<Subscription | null> {
  const db = getD1Client();
  const subscription = await db.queryFirst<Subscription>(
    'SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
    [userId]
  );
  return subscription;
}

/**
 * Get count of user's resources (monitors + cron jobs)
 */
export async function getResourceCount(userId: string): Promise<ResourceCount> {
  const db = getD1Client();
  
  const monitorCount = await db.queryFirst<{ count: number }>(
    'SELECT COUNT(*) as count FROM monitors WHERE user_id = ?',
    [userId]
  );
  
  const cronJobCount = await db.queryFirst<{ count: number }>(
    'SELECT COUNT(*) as count FROM cron_jobs WHERE user_id = ?',
    [userId]
  );

  const monitors = monitorCount?.count || 0;
  const cron_jobs = cronJobCount?.count || 0;

  return {
    monitors,
    cron_jobs,
    total: monitors + cron_jobs,
  };
}

/**
 * Check if user can create a new resource
 * Returns true if:
 * - User has active subscription, OR
 * - User has less than FREE_RESOURCE_LIMIT resources
 */
export async function canCreateResource(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  resourceCount: ResourceCount;
  hasActiveSubscription: boolean;
}> {
  const [subscription, resourceCount] = await Promise.all([
    getUserSubscription(userId),
    getResourceCount(userId),
  ]);

  const hasActiveSubscription = subscription?.status === 'active';

  // If user has active subscription, they can create unlimited resources
  if (hasActiveSubscription) {
    return {
      allowed: true,
      resourceCount,
      hasActiveSubscription: true,
    };
  }

  // If user has less than free limit, they can create
  if (resourceCount.total < FREE_RESOURCE_LIMIT) {
    return {
      allowed: true,
      resourceCount,
      hasActiveSubscription: false,
    };
  }

  // User has reached free limit and no subscription
  return {
    allowed: false,
    reason: 'Ücretsiz planda maksimum 1 kaynak oluşturabilirsiniz. Daha fazlası için Pro planına yükseltin.',
    resourceCount,
    hasActiveSubscription: false,
  };
}

/**
 * Create or update subscription in database
 */
export async function upsertSubscription(data: {
  userId: string;
  polarCustomerId: string;
  polarSubscriptionId: string;
  status: Subscription['status'];
  plan?: string;
  currentPeriodEnd?: number;
}): Promise<Subscription> {
  const db = getD1Client();
  const now = Date.now();

  // Check if subscription exists for this user
  const existing = await db.queryFirst<Subscription>(
    'SELECT * FROM subscriptions WHERE user_id = ?',
    [data.userId]
  );

  if (existing) {
    // Update existing subscription
    await db.execute(
      `UPDATE subscriptions SET 
        polar_customer_id = ?,
        polar_subscription_id = ?,
        status = ?,
        plan = ?,
        current_period_end = ?,
        updated_at = ?
      WHERE id = ?`,
      [
        data.polarCustomerId,
        data.polarSubscriptionId,
        data.status,
        data.plan || 'pro',
        data.currentPeriodEnd || null,
        now,
        existing.id,
      ]
    );

    return {
      ...existing,
      polar_customer_id: data.polarCustomerId,
      polar_subscription_id: data.polarSubscriptionId,
      status: data.status,
      plan: data.plan || 'pro',
      current_period_end: data.currentPeriodEnd || null,
      updated_at: now,
    };
  } else {
    // Create new subscription
    const id = crypto.randomUUID();
    await db.execute(
      `INSERT INTO subscriptions (
        id, user_id, polar_customer_id, polar_subscription_id,
        status, plan, current_period_end, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.userId,
        data.polarCustomerId,
        data.polarSubscriptionId,
        data.status,
        data.plan || 'pro',
        data.currentPeriodEnd || null,
        now,
        now,
      ]
    );

    return {
      id,
      user_id: data.userId,
      polar_customer_id: data.polarCustomerId,
      polar_subscription_id: data.polarSubscriptionId,
      status: data.status,
      plan: data.plan || 'pro',
      current_period_end: data.currentPeriodEnd || null,
      created_at: now,
      updated_at: now,
    };
  }
}

/**
 * Update subscription status by Polar subscription ID
 */
export async function updateSubscriptionStatus(
  polarSubscriptionId: string,
  status: Subscription['status'],
  currentPeriodEnd?: number
): Promise<boolean> {
  const db = getD1Client();
  const now = Date.now();

  const result = await db.execute(
    `UPDATE subscriptions SET 
      status = ?,
      current_period_end = COALESCE(?, current_period_end),
      updated_at = ?
    WHERE polar_subscription_id = ?`,
    [status, currentPeriodEnd || null, now, polarSubscriptionId]
  );

  return true;
}

/**
 * Get subscription by Polar customer ID
 */
export async function getSubscriptionByPolarCustomerId(
  polarCustomerId: string
): Promise<Subscription | null> {
  const db = getD1Client();
  return db.queryFirst<Subscription>(
    'SELECT * FROM subscriptions WHERE polar_customer_id = ?',
    [polarCustomerId]
  );
}
