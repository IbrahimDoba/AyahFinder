/**
 * Ayahfinder Mobile App
 * Entry Point
 */
// import './global.css'; // Temporarily disabled due to metro config issues on Windows + Node 22
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { HeroUINativeProvider } from 'heroui-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import revenueCatService from './src/services/revenuecat/RevenueCatService';
import RootNavigator from './src/presentation/navigation/RootNavigator';
import GlobalAlert from './src/presentation/components/common/GlobalAlert';
import { useAuthStore } from './src/presentation/store/authStore';
import { useSettingsStore } from './src/presentation/store/settingsStore';
import { REVENUECAT_ANDROID_API_KEY, REVENUECAT_IOS_API_KEY } from '@env';
import notificationService from './src/services/notifications/NotificationService';

// RevenueCat API Keys
const REVENUECAT_API_KEYS = {
  ios: REVENUECAT_IOS_API_KEY,
  android: REVENUECAT_ANDROID_API_KEY,
};

export default function App() {
  const [fontsLoaded] = useFonts({
    'UthmanicHafs': require('./assets/fonts/UthmanicHafs.otf'),
  });

  const initializeAuth = useAuthStore(state => state.initialize);
  const loadSettings = useSettingsStore(state => state.loadSettings);
  const setPushToken = useSettingsStore(state => state.setPushToken);

  useEffect(() => {
    const init = async () => {
      try {
        // Initialize auth store (checks for existing JWT token)
        await initializeAuth();
        // Load user settings
        await loadSettings();

        // Initialize push notifications
        const { user } = useAuthStore.getState();
        const token = await notificationService.initializeNotifications(!!user);
        if (token) {
          setPushToken(token);
          if (__DEV__) console.log('🔔 PUSH TOKEN:', token);
        }

        // Initialize RevenueCat
        const apiKey = Platform.OS === 'ios'
          ? REVENUECAT_API_KEYS.ios
          : REVENUECAT_API_KEYS.android;

        if (!apiKey) {
          console.error('[RevenueCat] API key not configured. In-app purchases will not work.');
          console.error('[RevenueCat] Please set REVENUECAT_ANDROID_API_KEY and REVENUECAT_IOS_API_KEY in EAS environment.');
        } else {
          Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
          revenueCatService.configure(apiKey);
          console.log('[RevenueCat] SDK initialized with key:', apiKey.substring(0, 10) + '...');
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
        // App can still run without authentication/settings
      }
    };

    init();
  }, [initializeAuth, loadSettings]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeroUINativeProvider>
        <SafeAreaProvider>
          <StatusBar style="auto" />
          <RootNavigator />
          <GlobalAlert />
        </SafeAreaProvider>
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}
