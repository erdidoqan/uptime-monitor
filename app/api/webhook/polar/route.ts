import { Webhooks } from "@polar-sh/nextjs";
import { upsertSubscription, updateSubscriptionStatus } from "@/lib/subscription";
import { getD1Client } from "@/lib/d1-client";

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
  
  onSubscriptionCreated: async (payload) => {
    console.log("Subscription created:", payload.data.id);
    
    const subscription = payload.data;
    const customerId = subscription.customerId;
    const customerEmail = subscription.customer?.email;
    
    if (!customerEmail) {
      console.error("No customer email in subscription payload");
      return;
    }

    // Find user by email
    const db = getD1Client();
    const user = await db.queryFirst<{ id: string }>(
      'SELECT id FROM users WHERE email = ?',
      [customerEmail]
    );

    if (!user) {
      console.error("User not found for email:", customerEmail);
      return;
    }

    // Create subscription record
    await upsertSubscription({
      userId: user.id,
      polarCustomerId: customerId,
      polarSubscriptionId: subscription.id,
      status: subscription.status === 'active' ? 'active' : 'inactive',
      plan: 'pro',
      currentPeriodEnd: subscription.currentPeriodEnd 
        ? new Date(subscription.currentPeriodEnd).getTime() 
        : undefined,
    });

    console.log("Subscription created for user:", user.id);
  },

  onSubscriptionActive: async (payload) => {
    console.log("Subscription active:", payload.data.id);
    
    const subscription = payload.data;
    
    await updateSubscriptionStatus(
      subscription.id,
      'active',
      subscription.currentPeriodEnd 
        ? new Date(subscription.currentPeriodEnd).getTime() 
        : undefined
    );

    console.log("Subscription activated:", subscription.id);
  },

  onSubscriptionCanceled: async (payload) => {
    console.log("Subscription canceled:", payload.data.id);
    
    const subscription = payload.data;
    
    await updateSubscriptionStatus(
      subscription.id,
      'canceled',
      subscription.currentPeriodEnd 
        ? new Date(subscription.currentPeriodEnd).getTime() 
        : undefined
    );

    console.log("Subscription canceled:", subscription.id);
  },

  onSubscriptionRevoked: async (payload) => {
    console.log("Subscription revoked:", payload.data.id);
    
    const subscription = payload.data;
    
    await updateSubscriptionStatus(subscription.id, 'inactive');

    console.log("Subscription revoked:", subscription.id);
  },

  onSubscriptionUpdated: async (payload) => {
    console.log("Subscription updated:", payload.data.id);
    
    const subscription = payload.data;
    const status = subscription.status === 'active' ? 'active' 
      : subscription.status === 'canceled' ? 'canceled' 
      : 'inactive';
    
    await updateSubscriptionStatus(
      subscription.id,
      status,
      subscription.currentPeriodEnd 
        ? new Date(subscription.currentPeriodEnd).getTime() 
        : undefined
    );

    console.log("Subscription updated:", subscription.id);
  },
});
