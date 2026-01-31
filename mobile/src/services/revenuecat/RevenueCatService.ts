/**
 * RevenueCat Service
 * Handles in-app purchases and subscription management
 */
import Purchases, {
  PurchasesOffering,
  PurchasesPackage,
  CustomerInfo,
  PurchasesStoreProduct,
} from 'react-native-purchases';
import { apiClient } from '../api/client';

// Entitlement ID configured in RevenueCat dashboard
const ENTITLEMENT_PREMIUM = 'premium';

// TEST MODE: Set to true for testing without Google Play
export const TEST_MODE = true;

export interface SubscriptionInfo {
  isActive: boolean;
  productIdentifier: string | null;
  purchaseDate: Date | null;
  expirationDate: Date | null;
  willRenew: boolean;
  isSandbox: boolean;
}

/**
 * Mock package for testing (no Google Play required)
 */
const createMockPackage = (): PurchasesPackage => {
  const mockProduct: PurchasesStoreProduct = {
    identifier: 'premium_monthly',
    description: 'Premium Monthly Subscription',
    title: 'Premium Monthly',
    price: 4.99,
    priceString: '$4.99',
    currencyCode: 'USD',
    introPrice: null,
    discounts: null,
    subscriptionPeriod: 'P1M',
    presentedOfferingIdentifier: 'default',
  };

  return {
    identifier: '$rc_monthly',
    packageType: 'MONTHLY',
    storeProduct: mockProduct,
    offeringIdentifier: 'default',
  } as PurchasesPackage;
};

/**
 * RevenueCat Service
 * Manages subscriptions and purchases
 */
class RevenueCatService {
  private testPurchaseActive = false;
  private testCustomerInfo: CustomerInfo | null = null;
  /**
   * Get available offerings from RevenueCat
   * In TEST_MODE, returns mock data without requiring Google Play
   */
  async getOfferings(): Promise<PurchasesOffering | null> {
    // TEST MODE: Return mock offering without Google Play
    if (TEST_MODE) {
      console.log('[RevenueCat] TEST MODE: Returning mock offering');
      const mockPackage = createMockPackage();
      
      return {
        identifier: 'default',
        serverDescription: 'Ayahfinder packages',
        availablePackages: [mockPackage],
        lifetime: null,
        annual: null,
        sixMonth: null,
        threeMonth: null,
        twoMonth: null,
        monthly: mockPackage,
        weekly: null,
      } as PurchasesOffering;
    }

    // Production: Fetch from RevenueCat
    try {
      console.log('[RevenueCat] Fetching offerings...');
      const offerings = await Purchases.getOfferings();
      
      if (offerings.current) {
        console.log('[RevenueCat] Current offering:', offerings.current.identifier);
        return offerings.current;
      }
      
      console.warn('[RevenueCat] No current offering available');
      return null;
    } catch (error) {
      console.error('[RevenueCat] Error fetching offerings:', error);
      return null;
    }
  }

  /**
   * Get monthly package from offering
   */
  getMonthlyPackage(offering: PurchasesOffering): PurchasesPackage | null {
    const monthly = offering.availablePackages.find(
      pkg => pkg.packageType === 'MONTHLY'
    );
    return monthly || null;
  }

  /**
   * Purchase a package
   * In TEST_MODE, simulates a successful purchase
   */
  async purchasePackage(
    pkg: PurchasesPackage
  ): Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string }> {
    // TEST MODE: Simulate purchase without Google Play
    if (TEST_MODE) {
      console.log('[RevenueCat] TEST MODE: Simulating purchase...');
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Create mock customer info with premium entitlement
      const expirationDate = new Date();
      expirationDate.setMonth(expirationDate.getMonth() + 1);
      
      this.testPurchaseActive = true;
      this.testCustomerInfo = {
        entitlements: {
          active: {
            [ENTITLEMENT_PREMIUM]: {
              identifier: ENTITLEMENT_PREMIUM,
              isActive: true,
              willRenew: true,
              periodType: 'normal',
              latestPurchaseDate: new Date().toISOString(),
              originalPurchaseDate: new Date().toISOString(),
              expirationDate: expirationDate.toISOString(),
              productIdentifier: 'premium_monthly',
              isSandbox: true,
            },
          },
          all: {},
        },
        activeSubscriptions: ['premium_monthly'],
        allPurchasedProductIdentifiers: ['premium_monthly'],
        nonSubscriptionTransactions: [],
        firstSeen: new Date().toISOString(),
        originalAppUserId: 'test_user',
        originalApplicationVersion: '1.0',
        managementURL: null,
      } as CustomerInfo;
      
      console.log('[RevenueCat] TEST MODE: Purchase simulated successfully');
      
      // Sync with server
      try {
        await this.syncPurchaseWithServer(this.testCustomerInfo);
      } catch (e) {
        console.log('[RevenueCat] Server sync failed (expected in test mode)');
      }
      
      return { success: true, customerInfo: this.testCustomerInfo };
    }

    // Production: Real purchase
    try {
      console.log('[RevenueCat] Purchasing package:', pkg.identifier);
      const { customerInfo, productIdentifier } = await Purchases.purchasePackage(pkg);
      
      console.log('[RevenueCat] Purchase successful:', productIdentifier);
      
      // Sync with server
      await this.syncPurchaseWithServer(customerInfo);
      
      return { success: true, customerInfo };
    } catch (error: any) {
      if (error.userCancelled) {
        console.log('[RevenueCat] User cancelled purchase');
        return { success: false, error: 'Purchase cancelled' };
      }
      
      console.error('[RevenueCat] Purchase error:', error);
      return { 
        success: false, 
        error: error.message || 'Purchase failed. Please try again.' 
      };
    }
  }

  /**
   * Restore purchases (for users who reinstalled or switched devices)
   * In TEST_MODE, simulates restore
   */
  async restorePurchases(): Promise<{ 
    success: boolean; 
    isPremium: boolean;
    customerInfo?: CustomerInfo;
    error?: string 
  }> {
    // TEST MODE: Return test purchase status
    if (TEST_MODE) {
      console.log('[RevenueCat] TEST MODE: Simulating restore...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const isPremium = this.testPurchaseActive && !!this.testCustomerInfo;
      console.log('[RevenueCat] TEST MODE: Restore complete. Premium:', isPremium);
      
      return { 
        success: true, 
        isPremium, 
        customerInfo: this.testCustomerInfo || undefined 
      };
    }

    // Production: Real restore
    try {
      console.log('[RevenueCat] Restoring purchases...');
      const customerInfo = await Purchases.restorePurchases();
      
      const isPremium = this.checkPremiumEntitlement(customerInfo);
      
      console.log('[RevenueCat] Restore complete. Premium:', isPremium);
      
      // Sync with server
      if (isPremium) {
        await this.syncPurchaseWithServer(customerInfo);
      }
      
      return { success: true, isPremium, customerInfo };
    } catch (error: any) {
      console.error('[RevenueCat] Restore error:', error);
      return { 
        success: false, 
        isPremium: false,
        error: error.message || 'Failed to restore purchases' 
      };
    }
  }

  /**
   * Get current customer info
   */
  async getCustomerInfo(): Promise<CustomerInfo | null> {
    // TEST MODE: Return test customer info
    if (TEST_MODE) {
      return this.testCustomerInfo;
    }

    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return customerInfo;
    } catch (error) {
      console.error('[RevenueCat] Error getting customer info:', error);
      return null;
    }
  }

  /**
   * Check if user has premium entitlement
   */
  checkPremiumEntitlement(customerInfo: CustomerInfo): boolean {
    // TEST MODE: Check test purchase status
    if (TEST_MODE) {
      return this.testPurchaseActive;
    }

    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_PREMIUM];
    const isActive = !!entitlement && new Date(entitlement.expirationDate) > new Date();
    console.log('[RevenueCat] Premium entitlement:', isActive);
    return isActive;
  }

  /**
   * TEST MODE ONLY: Reset test purchase (for testing)
   */
  resetTestPurchase(): void {
    if (TEST_MODE) {
      this.testPurchaseActive = false;
      this.testCustomerInfo = null;
      console.log('[RevenueCat] TEST MODE: Test purchase reset');
    }
  }

  /**
   * Get subscription information
   */
  getSubscriptionInfo(customerInfo: CustomerInfo): SubscriptionInfo {
    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_PREMIUM];
    
    if (!entitlement) {
      return {
        isActive: false,
        productIdentifier: null,
        purchaseDate: null,
        expirationDate: null,
        willRenew: false,
        isSandbox: false,
      };
    }

    return {
      isActive: new Date(entitlement.expirationDate) > new Date(),
      productIdentifier: entitlement.productIdentifier,
      purchaseDate: new Date(entitlement.purchaseDate),
      expirationDate: new Date(entitlement.expirationDate),
      willRenew: entitlement.willRenew,
      isSandbox: entitlement.isSandbox,
    };
  }

  /**
   * Sync purchase with server
   * Sends RevenueCat user ID to server for webhook validation
   */
  private async syncPurchaseWithServer(customerInfo: CustomerInfo): Promise<void> {
    try {
      const isPremium = this.checkPremiumEntitlement(customerInfo);
      
      if (!isPremium) {
        console.log('[RevenueCat] Not premium, skipping sync');
        return;
      }

      const appUserId = await Purchases.getAppUserID();
      
      console.log('[RevenueCat] Syncing purchase with server...');
      
      await apiClient.post('/subscriptions/sync', {
        revenueCatCustomerId: appUserId,
      });
      
      console.log('[RevenueCat] Server sync successful');
    } catch (error) {
      console.error('[RevenueCat] Server sync error:', error);
      // Don't throw - server will also get webhook from RevenueCat
    }
  }

  /**
   * Log out user from RevenueCat (call on sign out)
   */
  async logOut(): Promise<void> {
    try {
      console.log('[RevenueCat] Logging out...');
      await Purchases.logOut();
      console.log('[RevenueCat] Logout successful');
    } catch (error) {
      console.error('[RevenueCat] Logout error:', error);
    }
  }

  /**
   * Log in user to RevenueCat (call on sign in)
   * This links purchases to the user's account
   */
  async logIn(userId: string): Promise<CustomerInfo | null> {
    try {
      console.log('[RevenueCat] Logging in user:', userId);
      const { customerInfo } = await Purchases.logIn(userId);
      console.log('[RevenueCat] Login successful');
      return customerInfo;
    } catch (error) {
      console.error('[RevenueCat] Login error:', error);
      return null;
    }
  }
}

// Singleton instance
const revenueCatService = new RevenueCatService();

export default revenueCatService;
