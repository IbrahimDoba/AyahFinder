/**
 * Root Navigator
 * Main navigation structure with authentication flow
 */
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { COLORS } from '../../constants';

// Auth Screens
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';

// Main App Screens
import TabNavigator from './TabNavigator';
import ResultScreen from '../screens/result/ResultScreen';
import SurahScreen from '../screens/quran/SurahScreen';
import { Text } from '../components/common/Text';

export type RootStackParamList = {
  // Auth Flow
  Welcome: undefined;
  Login: undefined;
  SignUp: undefined;

  // Main App
  MainApp: undefined;
  Tabs: undefined;
  Result: undefined;
  Surah: {
    surahNumber: number;
    surahName: string;
    highlightAyah?: number;
    fromRecognition?: boolean;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Auth Stack
 * Screens shown when user is not authenticated
 */
function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
}

/**
 * Main App Stack
 * Screens shown when user is authenticated (or using as guest)
 */
function MainAppStack() {
  return (
    <Stack.Navigator
      initialRouteName="Tabs"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen name="Result" component={ResultScreen} />
      <Stack.Screen name="Surah" component={SurahScreen} />
    </Stack.Navigator>
  );
}

/**
 * Loading Screen
 * Shown while checking authentication state
 */
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={COLORS.primary[500]} />
      <Text variant="body" color={COLORS.text.secondary} style={styles.loadingText}>
        Loading...
      </Text>
    </View>
  );
}

export default function RootNavigator() {
  const { user, isInitialized } = useAuthStore();

  return (
    <NavigationContainer>
      {!isInitialized ? (
        // Show loading while checking auth state
        <LoadingScreen />
      ) : (
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'fade',
          }}
        >
          {user ? (
            // User is authenticated - show main app
            <Stack.Screen name="MainApp" component={MainAppStack} />
          ) : (
            // User is not authenticated - show auth flow
            // But also allow access to main app as guest
            <>
              <Stack.Screen name="Welcome" component={WelcomeScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="SignUp" component={SignUpScreen} />
              <Stack.Screen name="MainApp" component={MainAppStack} />
            </>
          )}
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background.default,
  },
  loadingText: {
    marginTop: 16,
  },
});
