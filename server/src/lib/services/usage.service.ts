import { db } from "@/lib/db/client";
import { USAGE_LIMITS } from "@/lib/config/constants";

export interface UsageStats {
  used: number;
  remaining: number;
  limit: number;
  resetAt: string;
  subscriptionTier: "free" | "premium";
}

class UsageService {
  /**
   * Get current date string in YYYY-MM-DD format (UTC)
   */
  private getCurrentDateString(): string {
    const now = new Date();
    return now.toISOString().split("T")[0];
  }

  /**
   * Get next reset time (midnight UTC)
   */
  private getNextResetTime(): Date {
    const now = new Date();
    const resetTime = new Date(now);
    resetTime.setUTCHours(24, 0, 0, 0); // Next midnight UTC
    return resetTime;
  }

  /**
   * Get monthly reset time (1st of next month, midnight UTC)
   */
  private getMonthlyResetTime(): Date {
    const now = new Date();
    const resetTime = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0),
    );
    return resetTime;
  }

  /**
   * Check if authenticated user can perform a search
   */
  async canUserSearch(userId: string): Promise<{
    allowed: boolean;
    remaining: number;
    limit: number;
    reason?: string;
  }> {
    const dateString = this.getCurrentDateString();

    // Get user
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return {
        allowed: false,
        remaining: 0,
        limit: 0,
        reason: 'User not found',
      };
    }

    // Get or create usage record
    let usageRecord = await db.usageRecord.findFirst({
      where: {
        userId,
        date: dateString,
      },
    });

    // Create if doesn't exist
    if (!usageRecord) {
      usageRecord = await db.usageRecord.create({
        data: {
          userId,
          date: dateString,
          searchCount: 0,
          monthlySearchCount: 0,
          lastResetAt: new Date(),
          monthlyResetAt: new Date(),
        },
      });
    }

    // Check limits based on subscription tier
    if (user.subscriptionTier === 'premium') {
      const limit = USAGE_LIMITS.PREMIUM.MONTHLY_SEARCHES;
      const remaining = Math.max(0, limit - usageRecord.monthlySearchCount);

      if (usageRecord.monthlySearchCount >= limit) {
        return {
          allowed: false,
          remaining: 0,
          limit,
          reason: 'Monthly limit reached. Your limit resets on the 1st of next month.',
        };
      }

      return {
        allowed: true,
        remaining,
        limit,
      };
    } else {
      // Free tier
      const limit = USAGE_LIMITS.FREE.DAILY_SEARCHES;
      const remaining = Math.max(0, limit - usageRecord.searchCount);

      if (usageRecord.searchCount >= limit) {
        return {
          allowed: false,
          remaining: 0,
          limit,
          reason: 'Daily limit reached. Upgrade to Premium for 100 searches per month!',
        };
      }

      return {
        allowed: true,
        remaining,
        limit,
      };
    }
  }

  /**
   * Check if anonymous user can perform a search
   */
  async canAnonymousSearch(deviceId: string): Promise<{
    allowed: boolean;
    remaining: number;
    limit: number;
    reason?: string;
  }> {
    const dateString = this.getCurrentDateString();
    const limit = USAGE_LIMITS.ANONYMOUS.DAILY_SEARCHES;

    // Get or create anonymous usage record
    let usageRecord = await db.anonymousUsage.findFirst({
      where: {
        deviceId,
        date: dateString,
      },
    });

    // Create if doesn't exist
    if (!usageRecord) {
      usageRecord = await db.anonymousUsage.create({
        data: {
          deviceId,
          date: dateString,
          searchCount: 0,
          lastResetAt: new Date(),
        },
      });
    }

    const remaining = Math.max(0, limit - usageRecord.searchCount);

    if (usageRecord.searchCount >= limit) {
      return {
        allowed: false,
        remaining: 0,
        limit,
        reason: 'Daily limit reached. Sign in for 5 searches per day or upgrade to Premium!',
      };
    }

    return {
      allowed: true,
      remaining,
      limit,
    };
  }

  /**
   * Increment usage count for authenticated user
   */
  async incrementUserUsage(userId: string): Promise<void> {
    const dateString = this.getCurrentDateString();

    // Get or create usage record
    const existingRecord = await db.usageRecord.findFirst({
      where: {
        userId,
        date: dateString,
      },
    });

    if (existingRecord) {
      // Increment counts
      await db.usageRecord.update({
        where: { id: existingRecord.id },
        data: {
          searchCount: existingRecord.searchCount + 1,
          monthlySearchCount: existingRecord.monthlySearchCount + 1,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new record
      await db.usageRecord.create({
        data: {
          userId,
          date: dateString,
          searchCount: 1,
          monthlySearchCount: 1,
          lastResetAt: new Date(),
          monthlyResetAt: new Date(),
        },
      });
    }

    console.log(`✅ Usage incremented for user ${userId}`);
  }

  /**
   * Increment usage count for anonymous user
   */
  async incrementAnonymousUsage(deviceId: string): Promise<void> {
    const dateString = this.getCurrentDateString();

    // Get or create usage record
    const existingRecord = await db.anonymousUsage.findFirst({
      where: {
        deviceId,
        date: dateString,
      },
    });

    if (existingRecord) {
      // Increment count
      await db.anonymousUsage.update({
        where: { id: existingRecord.id },
        data: {
          searchCount: existingRecord.searchCount + 1,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new record
      await db.anonymousUsage.create({
        data: {
          deviceId,
          date: dateString,
          searchCount: 1,
          lastResetAt: new Date(),
        },
      });
    }

    console.log(`✅ Usage incremented for device ${deviceId}`);
  }

  /**
   * Get usage statistics for authenticated user
   */
  async getUserUsageStats(userId: string): Promise<UsageStats> {
    const dateString = this.getCurrentDateString();

    // Get user
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Get usage record
    const usageRecord = await db.usageRecord.findFirst({
      where: {
        userId,
        date: dateString,
      },
    });

    if (user.subscriptionTier === "premium") {
      const limit = USAGE_LIMITS.PREMIUM.MONTHLY_SEARCHES;
      const used = usageRecord?.monthlySearchCount || 0;
      const remaining = Math.max(0, limit - used);

      return {
        used,
        remaining,
        limit,
        resetAt: this.getMonthlyResetTime().toISOString(),
        subscriptionTier: "premium",
      };
    } else {
      const limit = USAGE_LIMITS.FREE.DAILY_SEARCHES;
      const used = usageRecord?.searchCount || 0;
      const remaining = Math.max(0, limit - used);

      return {
        used,
        remaining,
        limit,
        resetAt: this.getNextResetTime().toISOString(),
        subscriptionTier: "free",
      };
    }
  }

  /**
   * Get usage statistics for anonymous user
   */
  async getAnonymousUsageStats(deviceId: string): Promise<{
    used: number;
    remaining: number;
    limit: number;
    resetAt: string;
    subscriptionTier: "anonymous";
  }> {
    const dateString = this.getCurrentDateString();
    const limit = USAGE_LIMITS.ANONYMOUS.DAILY_SEARCHES;

    // Get usage record
    const usageRecord = await db.anonymousUsage.findFirst({
      where: {
        deviceId,
        date: dateString,
      },
    });

    const used = usageRecord?.searchCount || 0;
    const remaining = Math.max(0, limit - used);

    return {
      used,
      remaining,
      limit,
      resetAt: this.getNextResetTime().toISOString(),
      subscriptionTier: "anonymous",
    };
  }
}

export const usageService = new UsageService();
