import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/presentation/components/common/Text';
import { HeroButton } from '@/presentation/components/common/HeroButton';
import { Card } from 'heroui-native';
import { COLORS } from '@/constants/colors';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '@/presentation/store/authStore';
import { useSettingsStore } from '@/presentation/store/settingsStore';
import { useCustomAlert } from '@/presentation/hooks/useCustomAlert';
import revenueCatService from '@/services/revenuecat/RevenueCatService';
import { wp, hp, rs, normalize } from '@/utils/responsive';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, isLoading: storeLoading, signOut } = useAuthStore();
  const { showTranslation, toggleTranslation } = useSettingsStore();
  const [localLoading, setLocalLoading] = useState(false);
  const { showAlert, AlertComponent } = useCustomAlert();

  const isLoading = storeLoading || localLoading;
  
  // Render translation toggle row
  const renderTranslationToggle = () => (
    <View style={styles.toggleRow}>
      <View style={styles.toggleIcon}>
        <Ionicons
          name="language-outline"
          size={20}
          color={COLORS.primary[500]}
        />
      </View>
      <View style={styles.toggleTextContainer}>
        <Text variant="body" style={styles.toggleLabel}>
          Show Translation
        </Text>
        <Text variant="caption" color={COLORS.text.secondary}>
          Display English translation below Arabic text
        </Text>
      </View>
      <Pressable
        style={[styles.toggleButton, showTranslation && styles.toggleButtonActive]}
        onPress={toggleTranslation}
      >
        <View
          style={[
            styles.toggleKnob,
            showTranslation && styles.toggleKnobActive,
          ]}
        />
      </Pressable>
    </View>
  );

  const handleManageSubscription = async () => {
    setLocalLoading(true);
    try {
      const managementURL = await revenueCatService.getManagementURL();

      if (managementURL) {
        const canOpen = await Linking.canOpenURL(managementURL);
        if (canOpen) {
          await Linking.openURL(managementURL);
        } else {
          showAlert({
            title: 'Unable to Open',
            message: 'Could not open subscription management. Please manage your subscription through the App Store or Google Play.',
            type: 'error',
            buttons: [{ text: 'OK', style: 'default' }],
          });
        }
      } else {
        showAlert({
          title: 'Not Available',
          message: 'Subscription management is not available at this time. Please try again later.',
          type: 'error',
          buttons: [{ text: 'OK', style: 'default' }],
        });
      }
    } catch (error) {
      console.error('Manage subscription error:', error);
      showAlert({
        title: 'Error',
        message: 'Failed to open subscription management. Please try again.',
        type: 'error',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    } finally {
      setLocalLoading(false);
    }
  };

  const handleLogout = async () => {
    showAlert({
      title: 'Logout',
      message: 'Are you sure you want to logout?',
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setLocalLoading(true);
            try {
              await signOut();
              // RootNavigator will handle stack change, navigating to Welcome
              navigation.navigate('Welcome' as any);
            } catch (error) {
              console.error('Logout error:', error);
            } finally {
              setLocalLoading(false);
            }
          },
        },
      ],
    });
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading profile...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.primary[700]} />
          </Pressable>
          <Text variant="h2" style={styles.headerTitle}>
            Profile
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.authPromptContainer}>
            <View style={styles.iconCircle}>
              <Ionicons
                name="person-outline"
                size={60}
                color={COLORS.primary[500]}
              />
            </View>
            <Text variant="h2" align="center" style={styles.promptTitle}>
              Join AyahFind
            </Text>
            <Text variant="body" align="center" style={styles.promptSubtitle}>
              Create an account to track your usage, unlock premium features,
              and save your favorite verses.
            </Text>

            <HeroButton
              title="Create Account"
              variant="primary"
              onPress={() => navigation.navigate('SignUp' as any)}
              style={styles.guestButton}
            />

            <HeroButton
              title="Sign In"
              variant="secondary"
              onPress={() => navigation.navigate('Login' as any)}
              style={styles.guestButton}
            />
          </View>
          
          {/* Preferences Section */}
          <Text variant="h3" style={[styles.sectionTitle, { marginTop: 40 }]}>
            Preferences
          </Text>
          <Card style={styles.detailsCard}>
            {renderTranslationToggle()}
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.primary[700]} />
        </Pressable>
        <Text variant="h2" style={styles.headerTitle}>
          My Profile
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {user.displayName?.charAt(0) ||
                  user.email.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text variant="h3">{user.displayName || 'User'}</Text>
              <Text variant="body" color={COLORS.text.secondary}>
                {user.email}
              </Text>
            </View>
          </View>
        </Card>

        <Text variant="h3" style={styles.sectionTitle}>
          Account Details
        </Text>
        <Card style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="star" size={20} color={COLORS.secondary[500]} />
            </View>
            <View style={styles.detailTextContainer}>
              <Text variant="body" style={styles.detailLabel}>
                Current Plan
              </Text>
              <Text variant="h3" style={styles.detailValue}>
                {`${user.subscriptionTier.charAt(0).toUpperCase()}${user.subscriptionTier.slice(1)} Plan`}
              </Text>
            </View>
            {user.subscriptionTier === 'free' && (
              <Pressable
                style={styles.upgradeBadge}
                onPress={() => navigation.navigate('Paywall')}
              >
                <Text style={styles.upgradeBadgeText}>Upgrade</Text>
              </Pressable>
            )}
          </View>

          {user.subscriptionTier === 'premium' && (
            <>
              <View style={styles.divider} />
              <Pressable
                style={styles.manageSubscriptionRow}
                onPress={handleManageSubscription}
                disabled={isLoading}
              >
                <View style={styles.detailIcon}>
                  <Ionicons name="settings-outline" size={20} color={COLORS.primary[500]} />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text variant="body" style={styles.manageSubLabel}>
                    Manage Subscription
                  </Text>
                  <Text variant="caption" color={COLORS.text.secondary}>
                    Cancel or modify your membership
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.text.secondary} />
              </Pressable>
            </>
          )}

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={COLORS.primary[500]}
              />
            </View>
            <View style={styles.detailTextContainer}>
              <Text variant="body" style={styles.detailLabel}>
                Member Since
              </Text>
              <Text variant="h3" style={styles.detailValue}>
                {new Date(user.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </Card>

        <Text variant="h3" style={styles.sectionTitle}>
          Preferences
        </Text>
        <Card style={styles.detailsCard}>
          {renderTranslationToggle()}
        </Card>

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </ScrollView>

      {/* Custom Alert */}
      <AlertComponent />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rs(16),
    paddingVertical: rs(12),
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backButton: {
    padding: rs(8),
  },
  headerTitle: {
    color: '#1B5E20',
  },
  scrollContent: {
    padding: rs(20),
  },
  authPromptContainer: {
    alignItems: 'center',
    paddingTop: hp(5),
  },
  iconCircle: {
    width: wp(30),
    height: wp(30),
    borderRadius: wp(15),
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: rs(24),
  },
  promptTitle: {
    color: '#1B5E20',
    marginBottom: rs(12),
  },
  promptSubtitle: {
    color: '#6b7280',
    marginBottom: rs(40),
    paddingHorizontal: wp(5),
    lineHeight: normalize(22, 0.3),
  },
  guestButton: {
    width: '80%',
    marginBottom: rs(16),
  },
  profileCard: {
    padding: rs(20),
    marginBottom: rs(32),
    backgroundColor: '#E8F5E9',
    borderColor: '#C8E6C9',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: wp(15),
    height: wp(15),
    borderRadius: wp(7.5),
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: rs(16),
  },
  avatarText: {
    color: '#ffffff',
    fontSize: normalize(24, 0.4),
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  sectionTitle: {
    color: '#1B5E20',
    marginBottom: rs(16),
  },
  detailsCard: {
    padding: 0,
    marginBottom: rs(40),
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: rs(20),
  },
  detailIcon: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(20),
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: rs(16),
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: normalize(13, 0.3),
    color: '#9ca3af',
    marginBottom: rs(2),
  },
  detailValue: {
    color: '#111827',
  },
  upgradeBadge: {
    backgroundColor: '#FFC107',
    paddingVertical: rs(4),
    paddingHorizontal: rs(12),
    borderRadius: rs(12),
  },
  upgradeBadgeText: {
    color: '#7B5E00',
    fontSize: normalize(12, 0.3),
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginHorizontal: rs(20),
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(8),
    paddingVertical: rs(16),
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: rs(12),
  },
  logoutText: {
    color: '#F44336',
    fontSize: normalize(16, 0.3),
    fontWeight: '600',
  },
  // Toggle styles
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: rs(20),
  },
  toggleIcon: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(20),
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: rs(16),
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: normalize(15, 0.3),
    color: '#111827',
    marginBottom: rs(2),
  },
  toggleButton: {
    width: rs(52),
    height: rs(32),
    borderRadius: rs(16),
    backgroundColor: '#d1d5db',
    justifyContent: 'center',
    paddingHorizontal: rs(4),
  },
  toggleButtonActive: {
    backgroundColor: '#4CAF50',
  },
  toggleKnob: {
    width: rs(24),
    height: rs(24),
    borderRadius: rs(12),
    backgroundColor: '#ffffff',
    transform: [{ translateX: 0 }],
  },
  toggleKnobActive: {
    transform: [{ translateX: rs(20) }],
  },
  manageSubscriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: rs(20),
  },
  manageSubLabel: {
    fontSize: normalize(15, 0.3),
    color: '#111827',
    marginBottom: rs(2),
  },
});
