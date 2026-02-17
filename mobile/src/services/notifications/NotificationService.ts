/**
 * Notification Service
 * Handles push token registration, local notification scheduling,
 * and notification preference syncing with the server.
 *
 * Ayah of the Day  → server-driven push notification (via Expo Push API + cron)
 * Reading Reminder → local notification (scheduled on device, exact timing, works offline)
 */
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiClient } from '@/services/api/client';
import { ENDPOINTS } from '@/services/api/endpoints';

// Local notification IDs
const READING_REMINDER_ID = 'reading-reminder-daily';

// Configure how notifications are presented when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions from the user.
 * Returns true if granted.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  // NOTE: Device.isDevice is false on emulators — skip check in dev so we can test
  if (!Device.isDevice && !__DEV__) {
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('ayahfinder', {
      name: 'AyahFinder',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1e7b5f',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Get the Expo push token for this device.
 * Returns null if permissions are not granted or device is unsupported.
 */
export async function getExpoPushToken(): Promise<string | null> {
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) return null;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'e8673c2c-a93e-4518-8248-584f58b24e6b', // from app.json extra.eas.projectId
    });
    return tokenData.data;
  } catch (error) {
    console.error('[Notifications] Failed to get push token:', error);
    return null;
  }
}

/**
 * Register the device push token with the server.
 * Should be called after successful login.
 */
export async function registerPushToken(token: string): Promise<void> {
  try {
    await apiClient.post(ENDPOINTS.NOTIFICATIONS.REGISTER, {
      token,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
    });
    console.log('[Notifications] Push token registered');
  } catch (error) {
    console.error('[Notifications] Failed to register push token:', error);
    // Non-fatal — app works without push notifications
  }
}

/**
 * Unregister the push token from the server (e.g., on logout).
 */
export async function unregisterPushToken(token: string): Promise<void> {
  try {
    await apiClient.delete(ENDPOINTS.NOTIFICATIONS.REGISTER, { token });
    console.log('[Notifications] Push token unregistered');
  } catch (error) {
    console.error('[Notifications] Failed to unregister push token:', error);
  }
}

/**
 * Sync notification preferences (ayahOfDayEnabled) to the server.
 * Only affects server-driven notifications; reading reminders are local only.
 */
export async function syncPreferences(
  token: string,
  ayahOfDayEnabled: boolean
): Promise<void> {
  try {
    await apiClient.patch(ENDPOINTS.NOTIFICATIONS.PREFERENCES, {
      token,
      ayahOfDayEnabled,
    });
  } catch (error) {
    console.error('[Notifications] Failed to sync preferences:', error);
    // Non-fatal
  }
}

/**
 * Schedule a daily local reading reminder.
 * @param hour  - 0-23 in local device time
 * @param minute - 0-59
 */
export async function scheduleReadingReminder(hour: number, minute: number): Promise<void> {
  // Cancel existing reminder first
  await cancelReadingReminder();

  await Notifications.scheduleNotificationAsync({
    identifier: READING_REMINDER_ID,
    content: {
      title: 'Time to Read Quran',
      body: 'Your daily reading reminder — open AyahFind and reflect on the words of Allah.',
      sound: true,
      data: { type: 'reading_reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  console.log(`[Notifications] Reading reminder scheduled for ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
}

/**
 * Cancel the daily reading reminder.
 */
export async function cancelReadingReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(READING_REMINDER_ID);
  } catch {
    // No existing reminder — that's fine
  }
}

/**
 * Initialize notifications on app start:
 * - Request permissions
 * - Get push token
 * - Register with server (if logged in)
 * Returns the push token or null.
 */
export async function initializeNotifications(isLoggedIn: boolean): Promise<string | null> {
  try {
    const token = await getExpoPushToken();
    if (token && isLoggedIn) {
      await registerPushToken(token);
    }
    return token;
  } catch (error) {
    console.error('[Notifications] Initialization failed:', error);
    return null;
  }
}

const notificationService = {
  requestNotificationPermissions,
  getExpoPushToken,
  registerPushToken,
  unregisterPushToken,
  syncPreferences,
  scheduleReadingReminder,
  cancelReadingReminder,
  initializeNotifications,
};

export default notificationService;
