/**
 * Paywall Screen
 * Uses RevenueCat's remote paywall component from dashboard
 */
import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import RevenueCatUI from 'react-native-purchases-ui';
import { CustomerInfo } from 'react-native-purchases';
import { COLORS } from '../../../constants';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { Text } from '../../components/common/Text';
import SubscriptionModal from '../../components/subscription/SubscriptionModal';
import revenueCatService from '../../../services/revenuecat/RevenueCatService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type ModalState = {
  visible: boolean;
  type: 'success' | 'error' | 'restore';
  title: string;
  message: string;
};

export default function PaywallScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [isSyncing, setIsSyncing] = useState(false);
  const [modal, setModal] = useState<ModalState>({
    visible: false,
    type: 'success',
    title: '',
    message: '',
  });

  const handleDismiss = () => {
    console.log('[RevenueCat UI] Paywall dismissed');
    navigation.goBack();
  };

  const handlePurchaseCompleted = async ({ customerInfo }: { customerInfo: CustomerInfo }) => {
    console.log('[RevenueCat UI] Purchase completed!', customerInfo);

    // Show syncing state
    setIsSyncing(true);

    try {
      // Check if user has premium
      const isPremium = revenueCatService.checkPremiumEntitlement(customerInfo);
      console.log('[Paywall] Premium status:', isPremium);

      if (isPremium) {
        // Sync with backend - this updates the user's subscription tier
        console.log('[Paywall] Syncing purchase with backend...');
        await revenueCatService.syncPurchase(customerInfo);
        console.log('[Paywall] ✅ Backend sync successful');

        // Small delay to ensure everything is propagated
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Show success modal
        setModal({
          visible: true,
          type: 'success',
          title: '🎉 Welcome to Premium!',
          message: 'Your account has been upgraded. Enjoy unlimited searches and premium features!',
        });
      } else {
        // Purchase completed but no premium entitlement
        console.warn('[Paywall] Purchase completed but no premium entitlement found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('[Paywall] Error syncing purchase:', error);
      // Still show success - user has premium in RevenueCat, backend will sync via webhook
      setModal({
        visible: true,
        type: 'success',
        title: 'Purchase Successful',
        message: 'Your purchase is being processed. It may take a few moments to activate. Please restart the app if needed.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestoreCompleted = async ({ customerInfo }: { customerInfo: CustomerInfo }) => {
    console.log('[RevenueCat UI] Restore completed!', customerInfo);

    setIsSyncing(true);

    try {
      const isPremium = revenueCatService.checkPremiumEntitlement(customerInfo);

      if (isPremium) {
        console.log('[Paywall] Syncing restored purchase with backend...');
        await revenueCatService.syncPurchase(customerInfo);

        setModal({
          visible: true,
          type: 'restore',
          title: 'Purchases Restored',
          message: 'Your premium subscription has been restored successfully!',
        });
      } else {
        setModal({
          visible: true,
          type: 'error',
          title: 'No Purchases Found',
          message: 'No active subscriptions were found to restore. If you recently purchased, please wait a few minutes and try again.',
        });
      }
    } catch (error) {
      console.error('[Paywall] Error restoring:', error);
      setModal({
        visible: true,
        type: 'error',
        title: 'Restore Failed',
        message: 'An error occurred while restoring purchases. Please try again later.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePurchaseError = (error: any) => {
    console.error('[RevenueCat UI] Purchase error:', error);
  };

  const handleModalClose = () => {
    setModal({ ...modal, visible: false });
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.paywallContainer}>
        <RevenueCatUI.Paywall
          onDismiss={handleDismiss}
          onPurchaseCompleted={handlePurchaseCompleted}
          onRestoreCompleted={handleRestoreCompleted}
          onPurchaseError={handlePurchaseError}
        />
      </View>

      {/* Loading overlay during backend sync */}
      {isSyncing && (
        <View style={styles.syncingOverlay}>
          <View style={styles.syncingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary.main} />
            <Text style={styles.syncingText}>Activating premium...</Text>
          </View>
        </View>
      )}

      {/* Custom subscription modal */}
      <SubscriptionModal
        visible={modal.visible}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onClose={handleModalClose}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  paywallContainer: {
    flex: 1,
  },
  syncingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncingContainer: {
    backgroundColor: COLORS.background.default,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  syncingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.text.primary,
  },
});
