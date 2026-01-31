/**
 * Ayahfinder Mobile App
 * Entry Point
 */
// import './global.css'; // Temporarily disabled due to metro config issues on Windows + Node 22
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { HeroUINativeProvider } from 'heroui-native';
// import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import RootNavigator from './src/presentation/navigation/RootNavigator';
import { useAuthStore } from './src/presentation/store/authStore';
import { useSettingsStore } from './src/presentation/store/settingsStore';

// RevenueCat API Keys - TEMPORARILY DISABLED FOR TESTING
// const REVENUECAT_API_KEYS = {
//   ios: 'test_BfoMezKesGhVUoiPplrxZewkGFi',
//   android: 'test_BfoMezKesGhVUoiPplrxZewkGFi',
// };

export default function App() {
  const initializeAuth = useAuthStore(state => state.initialize);
  const loadSettings = useSettingsStore(state => state.loadSettings);

  useEffect(() => {
    const init = async () => {
      try {
        // Initialize auth store (checks for existing JWT token)
        await initializeAuth();
        // Load user settings
        await loadSettings();

        // Initialize RevenueCat - TEMPORARILY DISABLED FOR TESTING
        // Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
        // const apiKey = Platform.OS === 'ios'
        //   ? REVENUECAT_API_KEYS.ios
        //   : REVENUECAT_API_KEYS.android;
        // Purchases.configure({ apiKey });
        // console.log('[RevenueCat] SDK initialized');
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
        </SafeAreaProvider>
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}
