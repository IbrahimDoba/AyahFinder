import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Linking, Modal, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/presentation/components/common/Text';
import { HeroButton } from '@/presentation/components/common/HeroButton';
import { Card } from 'heroui-native';
import { COLORS } from '@/constants/colors';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '@/presentation/store/authStore';
import { useSettingsStore } from '@/presentation/store/settingsStore';
import revenueCatService from '@/services/revenuecat/RevenueCatService';
import { showAlert } from '@/presentation/store/alertStore';
import notificationService from '@/services/notifications/NotificationService';
import { wp, hp, rs, normalize } from '@/utils/responsive';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, isLoading: storeLoading, signOut } = useAuthStore();
  const {
    showTranslation, toggleTranslation,
    ayahOfDayEnabled, setAyahOfDayEnabled,
    readingReminderEnabled, setReadingReminderEnabled,
    readingReminderHour, readingReminderMinute, setReadingReminderTime,
    setHasSeenOnboarding,
  } = useSettingsStore();
  const [localLoading, setLocalLoading] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerHour, setPickerHour] = useState(readingReminderHour);
  const [pickerMinute, setPickerMinute] = useState(readingReminderMinute);

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

  const formatTime = (h: number, m: number) =>
    `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

  const handleEnableReadingReminder = async (value: boolean) => {
    if (value) {
      const granted = await notificationService.requestNotificationPermissions();
      if (!granted) {
        showAlert({
          title: 'Notifications Blocked',
          message: 'Please enable notifications for AyahFinder in your device settings to use reminders.',
          type: 'warning',
          buttons: [{ text: 'OK', style: 'default' }],
        });
        return;
      }
    }
    setReadingReminderEnabled(value);
  };

  const handleEnableAyahOfDay = async (value: boolean) => {
    if (value) {
      const granted = await notificationService.requestNotificationPermissions();
      if (!granted) {
        showAlert({
          title: 'Notifications Blocked',
          message: 'Please enable notifications for AyahFinder in your device settings.',
          type: 'warning',
          buttons: [{ text: 'OK', style: 'default' }],
        });
        return;
      }
    }
    setAyahOfDayEnabled(value);
    // Sync to server so cron job respects this preference
    const { pushToken } = useSettingsStore.getState();
    if (pushToken) {
      notificationService.syncPreferences(pushToken, value).catch(console.error);
    }
  };

  const renderNotificationToggle = (
    icon: string,
    label: string,
    subtitle: string,
    value: boolean,
    onToggle: (v: boolean) => void,
    extra?: React.ReactNode
  ) => (
    <>
      <View style={styles.toggleRow}>
        <View style={styles.toggleIcon}>
          <Ionicons name={icon as any} size={20} color={COLORS.primary[500]} />
        </View>
        <View style={styles.toggleTextContainer}>
          <Text variant="body" style={styles.toggleLabel}>{label}</Text>
          <Text variant="caption" color={COLORS.text.secondary}>{subtitle}</Text>
        </View>
        <Pressable
          style={[styles.toggleButton, value && styles.toggleButtonActive]}
          onPress={() => onToggle(!value)}
        >
          <View style={[styles.toggleKnob, value && styles.toggleKnobActive]} />
        </Pressable>
      </View>
      {extra}
    </>
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

          <Text variant="h3" style={styles.sectionTitle}>
            Notifications
          </Text>
          <Card style={styles.detailsCard}>
            {renderNotificationToggle(
              'book-outline',
              'Ayah of the Day',
              'Sign in to receive daily Quranic verses',
              false,
              () => navigation.navigate('Login' as any)
            )}
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

        <Text variant="h3" style={styles.sectionTitle}>
          Notifications
        </Text>
        <Card style={styles.detailsCard}>
          {renderNotificationToggle(
            'book-outline',
            'Ayah of the Day',
            'Receive a daily Quranic verse each morning',
            ayahOfDayEnabled,
            handleEnableAyahOfDay
          )}
          <View style={styles.divider} />
          {renderNotificationToggle(
            'alarm-outline',
            'Quran Reading Reminder',
            'Get a daily nudge to read the Quran',
            readingReminderEnabled,
            handleEnableReadingReminder,
            readingReminderEnabled ? (
              <Pressable
                style={styles.timePickerRow}
                onPress={() => {
                  setPickerHour(readingReminderHour);
                  setPickerMinute(readingReminderMinute);
                  setShowTimePicker(true);
                }}
              >
                <Ionicons name="time-outline" size={16} color={COLORS.primary[500]} />
                <Text variant="caption" color={COLORS.primary[600]} style={{ marginLeft: rs(6) }}>
                  Reminder time: {formatTime(readingReminderHour, readingReminderMinute)}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={COLORS.primary[500]} style={{ marginLeft: rs(4) }} />
              </Pressable>
            ) : null
          )}
        </Card>

        {/* Time picker modal */}
        <Modal
          visible={showTimePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowTimePicker(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowTimePicker(false)}
          >
            <TouchableOpacity activeOpacity={1} style={styles.timePickerModal}>
              <Text variant="h3" style={styles.timePickerTitle}>Set Reminder Time</Text>
              <View style={styles.timePickerRow2}>
                <View style={styles.timeColumn}>
                  <Text variant="caption" color={COLORS.text.secondary} align="center">Hour</Text>
                  <ScrollView style={styles.timeScroll} showsVerticalScrollIndicator={false}>
                    {Array.from({ length: 24 }, (_, i) => (
                      <Pressable
                        key={i}
                        style={[styles.timeItem, pickerHour === i && styles.timeItemSelected]}
                        onPress={() => setPickerHour(i)}
                      >
                        <Text
                          variant="body"
                          style={pickerHour === i ? styles.timeItemTextSelected : styles.timeItemText}
                        >
                          {String(i).padStart(2, '0')}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
                <Text variant="h2" style={styles.timeSeparator}>:</Text>
                <View style={styles.timeColumn}>
                  <Text variant="caption" color={COLORS.text.secondary} align="center">Minute</Text>
                  <ScrollView style={styles.timeScroll} showsVerticalScrollIndicator={false}>
                    {[0, 15, 30, 45].map((m) => (
                      <Pressable
                        key={m}
                        style={[styles.timeItem, pickerMinute === m && styles.timeItemSelected]}
                        onPress={() => setPickerMinute(m)}
                      >
                        <Text
                          variant="body"
                          style={pickerMinute === m ? styles.timeItemTextSelected : styles.timeItemText}
                        >
                          {String(m).padStart(2, '0')}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </View>
              <HeroButton
                title={`Set to ${formatTime(pickerHour, pickerMinute)}`}
                variant="primary"
                onPress={() => {
                  setReadingReminderTime(pickerHour, pickerMinute);
                  setShowTimePicker(false);
                }}
                style={{ marginTop: rs(16) }}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {__DEV__ && (
          <Pressable
            style={styles.devButton}
            onPress={() => setHasSeenOnboarding(false)}
          >
            <Ionicons name="refresh-outline" size={16} color="#9ca3af" />
            <Text style={styles.devButtonText}>DEV: Reset Onboarding</Text>
          </Pressable>
        )}

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </ScrollView>

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
  devButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(6),
    paddingVertical: rs(10),
    marginBottom: rs(12),
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: rs(8),
    borderStyle: 'dashed',
  },
  devButtonText: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '500',
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
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rs(20),
    paddingBottom: rs(16),
    marginTop: rs(-4),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePickerModal: {
    backgroundColor: '#ffffff',
    borderRadius: rs(16),
    padding: rs(24),
    width: '80%',
  },
  timePickerTitle: {
    color: '#1B5E20',
    marginBottom: rs(20),
    textAlign: 'center',
  },
  timePickerRow2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeColumn: {
    width: rs(80),
    alignItems: 'center',
  },
  timeScroll: {
    height: rs(150),
    marginTop: rs(8),
  },
  timeItem: {
    paddingVertical: rs(10),
    paddingHorizontal: rs(16),
    borderRadius: rs(8),
    marginVertical: rs(2),
  },
  timeItemSelected: {
    backgroundColor: '#E8F5E9',
  },
  timeItemText: {
    color: '#374151',
    fontSize: normalize(18, 0.3),
    textAlign: 'center',
  },
  timeItemTextSelected: {
    color: '#1B5E20',
    fontWeight: '700',
    fontSize: normalize(18, 0.3),
    textAlign: 'center',
  },
  timeSeparator: {
    color: '#1B5E20',
    marginHorizontal: rs(8),
    marginTop: rs(24),
  },
});
