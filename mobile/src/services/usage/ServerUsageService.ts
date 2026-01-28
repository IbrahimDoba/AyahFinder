/**
 * Usage Service
 * Server-based usage tracking and validation
 * Replaces Firebase usage tracking
 */
import { apiClient } from '../api/client';

export type SubscriptionTier = 'anonymous' | 'free' | 'premium';

export interface UsageValidationResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  tier?: SubscriptionTier;
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
 * Usage Service
 * Handles usage tracking and limits validation via server
 */
class ServerUsageService {
  /**
   * Check if user can perform a search
   * Works for both authenticated and anonymous users
   */
  async canPerformSearch(): Promise<UsageValidationResult> {
    try {
      console.log('[Usage] Checking usage limit');

      const response = await apiClient.get<UsageValidationResult>('/usage/validate');

      console.log('[Usage] Usage check result:', response);
      return response;
    } catch (error: any) {
      console.error('[Usage] Error checking usage:', error);

      // On error, deny access for safety
      return {
        allowed: false,
        remaining: 0,
        limit: 0,
        reason: 'Unable to verify usage limit. Please try again.',
      };
    }
  }

  /**
   * Increment usage count after successful search
   * Should be called after a successful recognition
   */
  async incrementUsage(): Promise<void> {
    try {
      console.log('[Usage] Incrementing usage count');

      await apiClient.post('/usage/increment');

      console.log('[Usage] Usage incremented successfully');
    } catch (error: any) {
      console.error('[Usage] Error incrementing usage:', error);
      // Don't throw - usage increment failure shouldn't block user
      // The server is the source of truth for usage anyway
    }
  }

  /**
   * Get detailed usage statistics
   */
  async getUsageStats(): Promise<UsageStats> {
    try {
      console.log('[Usage] Fetching usage stats');

      const response = await apiClient.get<{
        used: number;
        remaining: number;
        limit: number;
        subscriptionTier: string;
        resetAt: string;
        period: 'daily' | 'monthly';
      }>('/usage/stats');

      const stats: UsageStats = {
        used: response.used,
        remaining: response.remaining,
        limit: response.limit,
        tier: (response.subscriptionTier || 'anonymous') as SubscriptionTier,
        resetAt: new Date(response.resetAt),
        period: response.period,
      };

      console.log('[Usage] Usage stats:', stats);
      return stats;
    } catch (error: any) {
      console.error('[Usage] Error fetching usage stats:', error);

      // Return default stats on error
      return {
        used: 0,
        remaining: 0,
        limit: 0,
        tier: 'anonymous',
        resetAt: new Date(),
        period: 'daily',
      };
    }
  }

  /**
   * Get user's subscription tier
   * Determines which limits apply
   */
  async getSubscriptionTier(): Promise<SubscriptionTier> {
    try {
      const stats = await this.getUsageStats();
      return stats.tier;
    } catch (error) {
      console.error('[Usage] Error getting subscription tier:', error);
      return 'anonymous';
    }
  }

  /**
   * Check if user has premium subscription
   */
  async isPremium(): Promise<boolean> {
    try {
      const tier = await this.getSubscriptionTier();
      return tier === 'premium';
    } catch (error) {
      return false;
    }
  }

  /**
   * Format time remaining until reset
   */
  formatTimeUntilReset(resetAt: Date): string {
    const now = new Date();
    const diffMs = resetAt.getTime() - now.getTime();

    if (diffMs <= 0) {
      return 'Resetting soon';
    }

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 24) {
      const days = Math.floor(diffHours / 24);
      return `${days} day${days > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    }
  }

  /**
   * Get usage limit info for display
   */
  async getUsageLimitInfo(): Promise<{
    used: number;
    limit: number;
    percentage: number;
    timeUntilReset: string;
  }> {
    try {
      const stats = await this.getUsageStats();

      const percentage = stats.limit > 0 ? (stats.used / stats.limit) * 100 : 0;
      const timeUntilReset = this.formatTimeUntilReset(stats.resetAt);

      return {
        used: stats.used,
        limit: stats.limit,
        percentage: Math.round(percentage),
        timeUntilReset,
      };
    } catch (error) {
      return {
        used: 0,
        limit: 0,
        percentage: 0,
        timeUntilReset: 'Unknown',
      };
    }
  }
}

// Singleton instance
const serverUsageService = new ServerUsageService();

export default serverUsageService;
