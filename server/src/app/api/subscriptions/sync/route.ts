import { NextRequest } from 'next/server';
import { auth } from '@/lib/middleware/auth.middleware';
import { db } from '@/lib/db/client';
import { successResponse, handleError } from '@/lib/utils/errors';

/**
 * Sync Subscription with RevenueCat
 * Called by mobile app after purchase to immediately update subscription status
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const user = await auth(req);
    
    if (!user) {
      return handleError(new Error('Unauthorized'));
    }

    const body = await req.json();
    const { revenueCatCustomerId } = body;

    if (!revenueCatCustomerId) {
      return handleError(new Error('revenueCatCustomerId is required'));
    }

    console.log('[Subscription Sync] Syncing for user:', user.userId);

    // Update subscription record with RevenueCat customer ID
    // This helps with webhook matching
    await db.subscription.updateMany({
      where: { userId: user.userId },
      data: { revenueCatCustomerId },
    });

    // Upgrade user to premium (webhook will confirm)
    await db.user.update({
      where: { id: user.userId },
      data: { subscriptionTier: 'premium' },
    });

    return successResponse({
      message: 'Subscription sync initiated',
      userId: user.userId,
    });
  } catch (error) {
    console.error('[Subscription Sync] Error:', error);
    return handleError(error);
  }
}
