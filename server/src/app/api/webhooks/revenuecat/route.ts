import { NextRequest } from 'next/server';
import { db } from '@/lib/db/client';
import { successResponse, handleError } from '@/lib/utils/errors';

/**
 * RevenueCat Webhook Handler
 * Receives purchase events from RevenueCat
 *
 * Webhook URL: https://ayah-finder-coral.vercel.app/api/webhooks/revenuecat
 *
 * Events handled:
 * - INITIAL_PURCHASE: New subscription
 * - RENEWAL: Subscription renewed
 * - CANCELLATION: Subscription cancelled
 * - EXPIRATION: Subscription expired
 */

// RevenueCat webhook payload (V2 format - data sent directly)
interface RevenueCatWebhookPayload {
  type?:
    | 'INITIAL_PURCHASE'
    | 'RENEWAL'
    | 'CANCELLATION'
    | 'EXPIRATION'
    | 'BILLING_ISSUE'
    | 'PRODUCT_CHANGE';
  app_user_id: string;
  subscriber_attributes?: Record<string, any>;
  currency?: string;
  entitlement_ids?: string[];
  entitlement_id?: string;
  environment: 'SANDBOX' | 'PRODUCTION';
  event_timestamp_ms: number;
  expiration_at_ms?: number;
  is_family_share?: boolean;
  is_trial_conversion?: boolean;
  original_app_user_id?: string;
  original_transaction_id?: string;
  period_type?: string;
  presented_offering_id?: string;
  price?: number;
  price_in_purchased_currency?: number;
  product_id: string;
  purchased_at_ms: number;
  store: 'PLAY_STORE' | 'APP_STORE' | 'STRIPE' | 'MAC_APP_STORE';
  takehome_percentage?: number;
  tax_percentage?: number;
  transaction_id: string;
}

export async function POST(req: NextRequest) {
  try {
    // RevenueCat sends data directly, not wrapped in "event"
    const payload: RevenueCatWebhookPayload = await req.json();

    console.log('[RevenueCat Webhook] Received payload:', {
      type: payload.type,
      userId: payload.app_user_id,
      productId: payload.product_id,
      environment: payload.environment,
      entitlements: payload.entitlement_ids,
    });

    // Get user ID from RevenueCat's app_user_id
    const userId = payload.app_user_id;

    if (!userId) {
      console.error('[RevenueCat Webhook] No app_user_id provided');
      return handleError(new Error('No app_user_id provided'));
    }

    // Verify user exists
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      console.error('[RevenueCat Webhook] User not found:', userId);
      // Still return 200 to prevent RevenueCat retries
      return successResponse({ received: true, warning: 'User not found' });
    }

    // Check if user has premium entitlement
    const hasPremium = payload.entitlement_ids?.includes('Premium') ||
                       payload.entitlement_ids?.includes('premium');

    console.log('[RevenueCat Webhook] Premium status:', hasPremium);

    if (hasPremium) {
      // User has premium entitlement - activate
      await handlePurchase(payload, userId);
    } else {
      // No premium entitlement - check event type
      switch (payload.type) {
        case 'CANCELLATION':
          await handleCancellation(payload, userId);
          break;

        case 'EXPIRATION':
          await handleExpiration(payload, userId);
          break;

        case 'BILLING_ISSUE':
          await handleBillingIssue(payload, userId);
          break;

        default:
          console.log('[RevenueCat Webhook] Event type:', payload.type);
      }
    }

    return successResponse({ received: true });
  } catch (error) {
    console.error('[RevenueCat Webhook] Error:', error);
    return handleError(error);
  }
}

/**
 * Handle INITIAL_PURCHASE and RENEWAL events
 */
async function handlePurchase(payload: RevenueCatWebhookPayload, userId: string) {
  const expiresAt = payload.expiration_at_ms
    ? new Date(payload.expiration_at_ms)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30 days

  // Upsert subscription record
  try {
    await db.subscription.upsert({
      where: {
        id: payload.original_transaction_id || payload.transaction_id,
      },
      create: {
        id: payload.transaction_id,
        userId,
        revenueCatCustomerId: payload.app_user_id,
        productId: payload.product_id,
        status: 'active',
        startedAt: new Date(payload.purchased_at_ms),
        expiresAt,
      },
      update: {
        status: 'active',
        expiresAt,
      },
    });
  } catch (dbError) {
    console.warn('[RevenueCat Webhook] Subscription upsert failed, continuing with user update:', dbError);
  }

  // Update user to premium
  await db.user.update({
    where: { id: userId },
    data: { subscriptionTier: 'premium' },
  });

  console.log('[RevenueCat Webhook] ✅ User upgraded to premium:', userId);
}

/**
 * Handle CANCELLATION event
 * Note: User keeps access until expiration date
 */
async function handleCancellation(payload: RevenueCatWebhookPayload, userId: string) {
  // Update subscription status to cancelled
  await db.subscription.updateMany({
    where: {
      userId,
      productId: payload.product_id,
    },
    data: {
      status: 'cancelled',
      cancelledAt: new Date(),
    },
  });

  console.log('[RevenueCat Webhook] Subscription cancelled for user:', userId);
}

/**
 * Handle EXPIRATION event
 */
async function handleExpiration(payload: RevenueCatWebhookPayload, userId: string) {
  // Mark subscription as expired
  await db.subscription.updateMany({
    where: {
      userId,
      productId: payload.product_id,
    },
    data: {
      status: 'expired',
    },
  });

  // Check if user has any other active subscriptions
  const activeSubscription = await db.subscription.findFirst({
    where: {
      userId,
      status: 'active',
      expiresAt: { gt: new Date() },
    },
  });

  // If no active subscriptions, downgrade to free
  if (!activeSubscription) {
    await db.user.update({
      where: { id: userId },
      data: { subscriptionTier: 'free' },
    });
    console.log('[RevenueCat Webhook] User downgraded to free:', userId);
  }
}

/**
 * Handle BILLING_ISSUE event
 */
async function handleBillingIssue(payload: RevenueCatWebhookPayload, userId: string) {
  console.log('[RevenueCat Webhook] Billing issue for user:', userId);
  // Could send email notification here
}
