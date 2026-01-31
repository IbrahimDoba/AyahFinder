/**
 * Paywall Screen
 * Subscription purchase screen using RevenueCat
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { Text } from '../../components/common/Text';
import { HeroButton } from '../../components/common/HeroButton';
import { COLORS } from '../../../constants';
import { RootStackParamList } from '../../navigation/RootNavigator';
import revenueCatService, { TEST_MODE } from '../../../services/revenuecat/RevenueCatService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function PaywallScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      setLoading(true);
      const currentOffering = await revenueCatService.getOfferings();
      setOffering(currentOffering);
    } catch (error) {
      console.error('Error loading offerings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (pkg: PurchasesPackage) => {
    try {
      setPurchasing(true);
      const result = await revenueCatService.purchasePackage(pkg);

      if (result.success) {
        Alert.alert(
          'Subscription Activated!',
          'You now have access to 100 audio searches per month.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else if (result.error) {
        Alert.alert('Purchase Failed', result.error);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Purchase failed. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      setRestoring(true);
      const result = await revenueCatService.restorePurchases();

      if (result.isPremium) {
        Alert.alert(
          'Purchases Restored',
          'Your subscription has been restored successfully.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert(
          'No Purchases Found',
          'We could not find any previous purchases to restore.'
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to restore purchases.');
    } finally {
      setRestoring(false);
    }
  };

  const formatPrice = (pkg: PurchasesPackage): string => {
    return pkg.product.priceString;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary[500]} />
          <Text style={styles.loadingText}>Loading subscription options...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const monthlyPackage = offering 
    ? revenueCatService.getMonthlyPackage(offering) 
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="close" size={28} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text variant="h2" style={styles.headerTitle}>
          Upgrade to Premium
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Test Mode Banner */}
        {TEST_MODE && (
          <View style={styles.testModeBanner}>
            <Ionicons name="bug" size={16} color="#fff" />
            <Text style={styles.testModeText}>
              TEST MODE - No real charges
            </Text>
          </View>
        )}

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.iconContainer}>
            <Ionicons name="crown" size={64} color={COLORS.secondary[500]} />
          </View>
          <Text variant="h1" align="center" style={styles.title}>
            Go Premium
          </Text>
          <Text
            variant="body"
            align="center"
            color={COLORS.text.secondary}
            style={styles.subtitle}
          >
            Unlock unlimited Quran identification with 100 searches per month
          </Text>
        </View>

        {/* Benefits */}
        <View style={styles.benefitsContainer}>
          <Text variant="h3" style={styles.benefitsTitle}>
            Premium Benefits
          </Text>

          <View style={styles.benefitItem}>
            <Ionicons name="infinite" size={24} color={COLORS.primary[500]} />
            <View style={styles.benefitText}>
              <Text variant="body" style={styles.benefitTitle}>
                100 Searches Per Month
              </Text>
              <Text variant="caption" color={COLORS.text.secondary}>
                20x more than the free plan
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <Ionicons name="flash" size={24} color={COLORS.primary[500]} />
            <View style={styles.benefitText}>
              <Text variant="body" style={styles.benefitTitle}>
                Priority Recognition
              </Text>
              <Text variant="caption" color={COLORS.text.secondary}>
                Faster processing for premium users
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <Ionicons name="time" size={24} color={COLORS.primary[500]} />
            <View style={styles.benefitText}>
              <Text variant="body" style={styles.benefitTitle}>
                Longer Audio Support
              </Text>
              <Text variant="caption" color={COLORS.text.secondary}>
                Identify longer recitations
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <Ionicons name="cloud-upload" size={24} color={COLORS.primary[500]} />
            <View style={styles.benefitText}>
              <Text variant="body" style={styles.benefitTitle}>
                Search History
              </Text>
              <Text variant="caption" color={COLORS.text.secondary}>
                Save and revisit your past searches
              </Text>
            </View>
          </View>
        </View>

        {/* Pricing */}
        {monthlyPackage ? (
          <View style={styles.pricingContainer}>
            <View style={styles.priceCard}>
              <Text variant="h2" style={styles.priceText}>
                {formatPrice(monthlyPackage)}
              </Text>
              <Text variant="caption" color={COLORS.text.secondary}>
                per month
              </Text>
            </View>

            <HeroButton
              title={purchasing ? 'Processing...' : 'Subscribe Now'}
              variant="primary"
              onPress={() => handlePurchase(monthlyPackage)}
              disabled={purchasing}
              style={styles.subscribeButton}
            />
          </View>
        ) : (
          <View style={styles.noOfferingContainer}>
            <Text variant="body" color={COLORS.text.secondary}>
              Subscription options are currently unavailable.
            </Text>
            <Text variant="caption" color={COLORS.text.secondary}>
              Please try again later.
            </Text>
          </View>
        )}

        {/* Restore Purchases */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={restoring}
        >
          <Text variant="body" color={COLORS.primary[500]}>
            {restoring ? 'Restoring...' : 'Restore Purchases'}
          </Text>
        </TouchableOpacity>

        {/* Terms */}
        <Text variant="caption" align="center" color={COLORS.text.secondary} style={styles.terms}>
          {TEST_MODE 
            ? 'TEST MODE: This is a simulated purchase. No real money will be charged.'
            : 'Subscription automatically renews monthly. Cancel anytime in Google Play Store.'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: COLORS.text.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: COLORS.primary[900],
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.secondary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
    color: COLORS.primary[900],
  },
  subtitle: {
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  benefitsContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  benefitsTitle: {
    marginBottom: 20,
    color: COLORS.primary[900],
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    fontWeight: '600',
    marginBottom: 2,
  },
  pricingContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  priceCard: {
    backgroundColor: COLORS.primary[50],
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  priceText: {
    color: COLORS.primary[700],
    fontSize: 36,
  },
  subscribeButton: {
    width: '100%',
  },
  noOfferingContainer: {
    alignItems: 'center',
    padding: 24,
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  terms: {
    marginTop: 16,
    paddingHorizontal: 20,
  },
  testModeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  testModeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
