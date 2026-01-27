/**
 * Usage Validator Service
 * Unified interface for usage tracking and validation
 * Handles both anonymous and authenticated users
 */
import anonymousTracker from './AnonymousTracker';
import { USAGE_LIMITS } from '../../constants/config';
import { firebaseFunctions, isFirebaseConfigured } from '../../../firebase.config';

export type SubscriptionTier = 'anonymous' | 'free' | 'premium';

export interface UsageValidationResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  tier: SubscriptionTier;
  reason?: string;
}

export interface UsageStats {
  used: number;
  remaining: number;
  limit: number;
  tier: SubscriptionTier;
  resetAt: Date;
  period: 'daily' | 'monthly';
}

/**
 * Usage Validator
 * Central service for checking and managing usage limits
 */
class UsageValidator {
  private currentUserId: string | null = null;
  private currentTier: SubscriptionTier = 'anonymous';

  /**
   * Set current user context
   * Call this when user signs in/out
   */
  setUser(userId: string | null, tier: SubscriptionTier = 'free'): void {
    this.currentUserId = userId;
    this.currentTier = userId ? tier : 'anonymous';
  }

  /**
   * Get current user tier
   */
  getTier(): SubscriptionTier {
    return this.currentTier;
  }

  /**
   * Check if user can perform a search
   * Returns validation result with remaining searches
   */
  async canPerformSearch(): Promise<UsageValidationResult> {
    try {
      // Anonymous users (not signed in)
      if (!this.currentUserId) {
        return await this.checkAnonymousUsage();
      }

      // Authenticated users (free or premium)
      return await this.checkAuthenticatedUsage();
    } catch (error) {
      console.error('Error checking usage:', error);

      // Fallback to anonymous tracking on error
      if (!this.currentUserId) {
        return await this.checkAnonymousUsage();
      }

      // For authenticated users, deny on error for safety
      return {
        allowed: false,
        remaining: 0,
        limit: 0,
        tier: this.currentTier,
        reason: 'Unable to verify usage limit. Please try again.',
      };
    }
  }

  /**
   * Increment usage count after successful search
   */
  async incrementUsage(): Promise<void> {
    try {
      // Anonymous users
      if (!this.currentUserId) {
        await anonymousTracker.incrementUsage();
        return;
      }

      // Authenticated users - call Cloud Function
      await this.incrementAuthenticatedUsage();
    } catch (error) {
      console.error('Error incrementing usage:', error);

      // For anonymous users, try to increment locally
      if (!this.currentUserId) {
        await anonymousTracker.incrementUsage();
      }

      // For authenticated users, we don't increment on error
      // This prevents users from bypassing limits
    }
  }

  /**
   * Get detailed usage statistics
   */
  async getUsageStats(): Promise<UsageStats> {
    try {
      // Anonymous users
      if (!this.currentUserId) {
        const stats = await anonymousTracker.getUsageStats();
        return {
          ...stats,
          tier: 'anonymous',
          period: 'daily',
        };
      }

      // Authenticated users
      return await this.getAuthenticatedUsageStats();
    } catch (error) {
      console.error('Error getting usage stats:', error);

      // Fallback to anonymous stats
      if (!this.currentUserId) {
        const stats = await anonymousTracker.getUsageStats();
        return {
          ...stats,
          tier: 'anonymous',
          period: 'daily',
        };
      }

      // Return default stats for authenticated users on error
      return {
        used: 0,
        remaining: 0,
        limit: 0,
        tier: this.currentTier,
        resetAt: new Date(),
        period: this.currentTier === 'premium' ? 'monthly' : 'daily',
      };
    }
  }

  /**
   * Migrate anonymous usage to user account
   * Called after user signs up or logs in
   */
  async migrateAnonymousUsage(userId: string): Promise<void> {
    try {
      // Get anonymous usage data
      const usageData = anonymousTracker.getUsageData();

      if (!usageData || usageData.searchCount === 0) {
        console.log('No anonymous usage to migrate');
        return;
      }

      // Check if Firebase is configured
      if (!isFirebaseConfigured()) {
        console.warn('Firebase not configured, skipping migration');
        return;
      }

      // Call Cloud Function to migrate usage
      const migrateUsage = firebaseFunctions.httpsCallable('migrateAnonymousUsage');
      await migrateUsage({
        userId,
        usageData: {
          date: usageData.date,
          searchCount: usageData.searchCount,
          lastResetAt: usageData.lastResetAt,
        },
      });

      // Clear anonymous usage after successful migration
      await anonymousTracker.clearUsageData();

      console.log('✅ Anonymous usage migrated to user account');
    } catch (error) {
      console.error('Error migrating anonymous usage:', error);
      // Don't throw - migration failure shouldn't block login
      // User will just start fresh with their account limits
    }
  }

  // Private methods for anonymous users

  private async checkAnonymousUsage(): Promise<UsageValidationResult> {
    const result = await anonymousTracker.canPerformSearch();
    return {
      ...result,
      tier: 'anonymous',
    };
  }

  // Private methods for authenticated users

  private async checkAuthenticatedUsage(): Promise<UsageValidationResult> {
    // Check if Firebase is configured
    if (!isFirebaseConfigured()) {
      console.warn('Firebase not configured, using fallback limits');
      return this.getFallbackUsageResult();
    }

    try {
      // Call Cloud Function to check usage
      const checkUsage = firebaseFunctions.httpsCallable('checkUsageLimit');
      const response = await checkUsage({ userId: this.currentUserId });

      const data = response.data as {
        allowed: boolean;
        remaining: number;
        limit: number;
        reason?: string;
      };

      return {
        ...data,
        tier: this.currentTier,
      };
    } catch (error) {
      console.error('Error checking authenticated usage:', error);

      // Fallback to offline check using cached data
      return this.getFallbackUsageResult();
    }
  }

  private async incrementAuthenticatedUsage(): Promise<void> {
    // Check if Firebase is configured
    if (!isFirebaseConfigured()) {
      console.warn('Firebase not configured, cannot increment usage');
      return;
    }

    try {
      // Call Cloud Function to increment usage
      const incrementUsage = firebaseFunctions.httpsCallable('incrementUsage');
      await incrementUsage({ userId: this.currentUserId });
    } catch (error) {
      console.error('Error incrementing authenticated usage:', error);
      throw error;
    }
  }

  private async getAuthenticatedUsageStats(): Promise<UsageStats> {
    // Check if Firebase is configured
    if (!isFirebaseConfigured()) {
      console.warn('Firebase not configured, using fallback stats');
      return this.getFallbackUsageStats();
    }

    try {
      // Call Cloud Function to get usage stats
      const getStats = firebaseFunctions.httpsCallable('getUsageStats');
      const response = await getStats({ userId: this.currentUserId });

      const data = response.data as {
        used: number;
        remaining: number;
        limit: number;
        resetAt: string;
      };

      return {
        ...data,
        tier: this.currentTier,
        resetAt: new Date(data.resetAt),
        period: this.currentTier === 'premium' ? 'monthly' : 'daily',
      };
    } catch (error) {
      console.error('Error getting authenticated usage stats:', error);
      return this.getFallbackUsageStats();
    }
  }

  // Fallback methods for offline/error scenarios

  private getFallbackUsageResult(): UsageValidationResult {
    const limit = this.currentTier === 'premium'
      ? USAGE_LIMITS.PREMIUM.MONTHLY_SEARCHES
      : USAGE_LIMITS.FREE.DAILY_SEARCHES;

    // In fallback mode, allow some usage but warn user
    return {
      allowed: true,
      remaining: limit,
      limit,
      tier: this.currentTier,
      reason: 'Offline mode - limited tracking',
    };
  }

  private getFallbackUsageStats(): UsageStats {
    const limit = this.currentTier === 'premium'
      ? USAGE_LIMITS.PREMIUM.MONTHLY_SEARCHES
      : USAGE_LIMITS.FREE.DAILY_SEARCHES;

    // Calculate next reset time
    const now = new Date();
    const resetAt = new Date(now);

    if (this.currentTier === 'premium') {
      // Monthly reset
      resetAt.setUTCMonth(resetAt.getUTCMonth() + 1);
      resetAt.setUTCDate(USAGE_LIMITS.MONTHLY_RESET_DAY);
      resetAt.setUTCHours(USAGE_LIMITS.DAILY_RESET_HOUR, 0, 0, 0);
    } else {
      // Daily reset
      resetAt.setUTCHours(USAGE_LIMITS.DAILY_RESET_HOUR, 0, 0, 0);
      if (resetAt <= now) {
        resetAt.setUTCDate(resetAt.getUTCDate() + 1);
      }
    }

    return {
      used: 0,
      remaining: limit,
      limit,
      tier: this.currentTier,
      resetAt,
      period: this.currentTier === 'premium' ? 'monthly' : 'daily',
    };
  }
}

// Singleton instance
const usageValidator = new UsageValidator();

export default usageValidator;
