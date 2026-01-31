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

// RevenueCat webhook event types
interface RevenueCatEvent {
  event: {
    type: 
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
    environment: 'SANDBOX' | 'PRODUCTION';
    event_timestamp_ms: number;
    expiration_at_ms?: number;
    is_family_share?: boolean;
    is_trial_conversion?: boolean;
    original_app_user_id: string;
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
  };
}

export async function POST(req: NextRequest) {
  try {
    const payload: RevenueCatEvent = await req.json();
    const event = payload.event;

    console.log('[RevenueCat Webhook] Received event:', {
      type: event.type,
      userId: event.app_user_id,
      productId: event.product_id,
      environment: event.environment,
    });

    // Get user ID from RevenueCat's app_user_id
    // This should match the user ID from our auth system
    const userId = event.app_user_id;
    
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

    // Handle different event types
    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
        await handlePurchase(event, userId);
        break;
        
      case 'CANCELLATION':
        await handleCancellation(event, userId);
        break;
        
      case 'EXPIRATION':
        await handleExpiration(event, userId);
        break;
        
      case 'BILLING_ISSUE':
        await handleBillingIssue(event, userId);
        break;
        
      default:
        console.log('[RevenueCat Webhook] Unhandled event type:', event.type);
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
async function handlePurchase(event: RevenueCatEvent['event'], userId: string) {
  const expiresAt = event.expiration_at_ms 
    ? new Date(event.expiration_at_ms) 
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30 days

  // Upsert subscription record
  await db.subscription.upsert({
    where: {
      // Use a unique constraint - we'll need to add this or use findFirst + create/update
      id: event.original_transaction_id || event.transaction_id,
    },
    create: {
      userId,
      revenueCatCustomerId: event.app_user_id,
      productId: event.product_id,
      status: 'active',
      startedAt: new Date(event.purchased_at_ms),
      expiresAt,
    },
    update: {
      status: 'active',
      expiresAt,
    },
  });

  // Update user to premium
  await db.user.update({
    where: { id: userId },
    data: { subscriptionTier: 'premium' },
  });

  console.log('[RevenueCat Webhook] Subscription activated/renewed for user:', userId);
}

/**
 * Handle CANCELLATION event
 * Note: User keeps access until expiration date
 */
async function handleCancellation(event: RevenueCatEvent['event'], userId: string) {
  // Update subscription status to cancelled
  // User still has access until expiration
  await db.subscription.updateMany({
    where: {
      userId,
      productId: event.product_id,
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
async function handleExpiration(event: RevenueCatEvent['event'], userId: string) {
  // Mark subscription as expired
  await db.subscription.updateMany({
    where: {
      userId,
      productId: event.product_id,
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
async function handleBillingIssue(event: RevenueCatEvent['event'], userId: string) {
  console.log('[RevenueCat Webhook] Billing issue for user:', userId);
  // Could send email notification here
}
