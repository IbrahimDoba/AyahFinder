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
import { useAuthStore } from './src/presentation/store/authStore';

export default function App() {
  const initializeAuth = useAuthStore(state => state.initialize);

  useEffect(() => {
    const init = async () => {
      try {
        // Initialize auth store (checks for existing JWT token)
        await initializeAuth();
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        // App can still run without authentication
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
