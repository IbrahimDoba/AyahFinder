/**
 * Ayahfinder Mobile App
 * Entry Point
 */
// import './global.css'; // Temporarily disabled due to metro config issues on Windows + Node 22
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { HeroUINativeProvider } from 'heroui-native';
import RootNavigator from './src/presentation/navigation/RootNavigator';
import { initializeFirebase } from './firebase.config';
import { useAuthStore } from './src/presentation/store/authStore';

export default function App() {
  const initializeAuth = useAuthStore((state) => state.initialize);

  useEffect(() => {
    const init = async () => {
      try {
        // Initialize Firebase first
        initializeFirebase();

        // Then initialize auth store (sets up auth state listener)
        await initializeAuth();
      } catch (error) {
        console.error('Failed to initialize app:', error);
        // App can still run without Firebase (anonymous usage tracking will work)
      }
    };

    init();
  }, [initializeAuth]);

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
