/**
 * Anonymous Usage Tracker
 * Tracks usage for anonymous users (not signed in) using device-based identification
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { USAGE_LIMITS } from '../../constants/config';

const STORAGE_KEYS = {
  DEVICE_ID: '@ayahfinder:deviceId',
  USAGE_DATA: '@ayahfinder:anonymousUsage',
} as const;

export interface UsageData {
  deviceId: string;
  date: string; // YYYY-MM-DD format
  searchCount: number;
  lastResetAt: string; // ISO timestamp
  isAnonymous: true;
}

export interface UsageCheckResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  reason?: string;
}

/**
 * Anonymous Usage Tracker
 * Manages usage limits for users who haven't signed in
 */
class AnonymousTracker {
  private deviceId: string | null = null;
  private usageData: UsageData | null = null;

  /**
   * Initialize the tracker
   * Generates or retrieves device ID and loads usage data
   */
  async initialize(): Promise<void> {
    try {
      // Get or create device ID
      this.deviceId = await this.getOrCreateDeviceId();

      // Load existing usage data
      this.usageData = await this.loadUsageData();

      // Check if we need to reset (new day)
      if (this.shouldReset()) {
        await this.reset();
      }
    } catch (error) {
      console.error('Error initializing AnonymousTracker:', error);
      throw error;
    }
  }

  /**
   * Check if user can perform a search
   */
  async canPerformSearch(): Promise<UsageCheckResult> {
    if (!this.deviceId || !this.usageData) {
      await this.initialize();
    }

    const limit = USAGE_LIMITS.ANONYMOUS.DAILY_SEARCHES;
    const current = this.usageData?.searchCount || 0;
    const remaining = Math.max(0, limit - current);

    if (current >= limit) {
      return {
        allowed: false,
        remaining: 0,
        limit,
        reason: 'Daily limit reached. Sign up for 5 searches per day!',
      };
    }

    return {
      allowed: true,
      remaining,
      limit,
    };
  }

  /**
   * Increment usage count after successful search
   */
  async incrementUsage(): Promise<void> {
    if (!this.deviceId || !this.usageData) {
      await this.initialize();
    }

    if (!this.usageData) {
      throw new Error('Usage data not initialized');
    }

    this.usageData.searchCount += 1;
    await this.saveUsageData(this.usageData);
  }

  /**
   * Get current usage statistics
   */
  async getUsageStats(): Promise<{
    used: number;
    remaining: number;
    limit: number;
    resetAt: Date;
  }> {
    if (!this.deviceId || !this.usageData) {
      await this.initialize();
    }

    const limit = USAGE_LIMITS.ANONYMOUS.DAILY_SEARCHES;
    const used = this.usageData?.searchCount || 0;
    const remaining = Math.max(0, limit - used);

    // Calculate next reset time (midnight UTC)
    const now = new Date();
    const resetAt = new Date(now);
    resetAt.setUTCHours(USAGE_LIMITS.DAILY_RESET_HOUR, 0, 0, 0);
    if (resetAt <= now) {
      resetAt.setUTCDate(resetAt.getUTCDate() + 1);
    }

    return {
      used,
      remaining,
      limit,
      resetAt,
    };
  }

  /**
   * Get device ID (for migration to user account)
   */
  getDeviceId(): string | null {
    return this.deviceId;
  }

  /**
   * Get usage data (for migration to user account)
   */
  getUsageData(): UsageData | null {
    return this.usageData;
  }

  /**
   * Clear anonymous usage data (called after migration to user account)
   */
  async clearUsageData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.USAGE_DATA);
      this.usageData = null;
      console.log('✅ Anonymous usage data cleared');
    } catch (error) {
      console.error('Error clearing usage data:', error);
      throw error;
    }
  }

  // Private methods

  /**
   * Get or create a unique device ID
   */
  private async getOrCreateDeviceId(): Promise<string> {
    try {
      // Try to get existing device ID
      const existingId = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);
      if (existingId) {
        return existingId;
      }

      // Generate new device ID using device info
      const deviceId = this.generateDeviceId();
      await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
      console.log('✅ Generated new device ID:', deviceId);
      return deviceId;
    } catch (error) {
      console.error('Error getting/creating device ID:', error);
      throw error;
    }
  }

  /**
   * Generate a unique device ID
   */
  private generateDeviceId(): string {
    // Use device info + timestamp for uniqueness
    const deviceInfo = {
      brand: Device.brand,
      modelName: Device.modelName,
      osName: Device.osName,
      osVersion: Device.osVersion,
      timestamp: Date.now(),
      random: Math.random().toString(36).substring(2, 15),
    };

    // Create a hash-like ID from device info
    const id = `anonymous_${deviceInfo.osName}_${deviceInfo.brand}_${deviceInfo.timestamp}_${deviceInfo.random}`;
    return id;
  }

  /**
   * Load usage data from storage
   */
  private async loadUsageData(): Promise<UsageData> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USAGE_DATA);

      if (data) {
        const parsed = JSON.parse(data) as UsageData;
        return parsed;
      }

      // Create new usage data
      return this.createEmptyUsageData();
    } catch (error) {
      console.error('Error loading usage data:', error);
      return this.createEmptyUsageData();
    }
  }

  /**
   * Save usage data to storage
   */
  private async saveUsageData(data: UsageData): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USAGE_DATA, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving usage data:', error);
      throw error;
    }
  }

  /**
   * Create empty usage data for new user
   */
  private createEmptyUsageData(): UsageData {
    const now = new Date();
    return {
      deviceId: this.deviceId || '',
      date: this.getTodayDateString(),
      searchCount: 0,
      lastResetAt: now.toISOString(),
      isAnonymous: true,
    };
  }

  /**
   * Check if usage should be reset (new day)
   */
  private shouldReset(): boolean {
    if (!this.usageData) {
      return false;
    }

    const today = this.getTodayDateString();
    return this.usageData.date !== today;
  }

  /**
   * Reset usage for new day
   */
  private async reset(): Promise<void> {
    if (!this.usageData) {
      return;
    }

    const now = new Date();
    this.usageData = {
      ...this.usageData,
      date: this.getTodayDateString(),
      searchCount: 0,
      lastResetAt: now.toISOString(),
    };

    await this.saveUsageData(this.usageData);
    console.log('✅ Anonymous usage reset for new day');
  }

  /**
   * Get today's date as YYYY-MM-DD string (UTC)
   */
  private getTodayDateString(): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

// Singleton instance
const anonymousTracker = new AnonymousTracker();

export default anonymousTracker;
