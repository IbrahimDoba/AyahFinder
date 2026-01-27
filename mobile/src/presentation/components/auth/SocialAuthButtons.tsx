/**
 * Social Auth Buttons Component
 * Google and Apple Sign-In buttons
 */
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../common/Text';
import { COLORS } from '../../../constants';
import { useAuthStore } from '../../store/authStore';
import { isSocialAuthConfigured } from '../../../constants/socialAuth';

interface SocialAuthButtonsProps {
  mode?: 'sign-in' | 'sign-up';
}

export function SocialAuthButtons({ mode = 'sign-in' }: SocialAuthButtonsProps) {
  const { signInWithGoogle, signInWithApple, isLoading } = useAuthStore();
  const socialConfig = isSocialAuthConfigured();

  const handleGoogleSignIn = async () => {
    // Check if Google Sign-In is configured
    if (!socialConfig.google) {
      Alert.alert(
        'Configuration Required',
        'Google Sign-In is not configured yet. Please check SOCIAL_AUTH_SETUP.md for instructions.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      await signInWithGoogle();
      // Navigation will be handled automatically by RootNavigator
    } catch (error: any) {
      // Only show alert if it's not a cancellation
      if (error.code !== 'auth/cancelled' && error.code !== 'SIGN_IN_CANCELLED') {
        Alert.alert(
          'Google Sign-In Failed',
          error.message || 'Please try again.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const handleAppleSignIn = async () => {
    // Check if platform is iOS
    if (Platform.OS !== 'ios') {
      Alert.alert(
        'Not Available',
        'Apple Sign-In is only available on iOS devices.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      await signInWithApple();
      // Navigation will be handled automatically by RootNavigator
    } catch (error: any) {
      // Only show alert if it's not a cancellation
      if (error.code !== 'auth/cancelled' && error.code !== 'ERR_CANCELED') {
        Alert.alert(
          'Apple Sign-In Failed',
          error.message || 'Please try again.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const actionText = mode === 'sign-in' ? 'Sign in' : 'Sign up';

  return (
    <View style={styles.container}>
      {/* Google Sign-In Button */}
      <TouchableOpacity
        style={styles.socialButton}
        onPress={handleGoogleSignIn}
        disabled={isLoading}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="logo-google" size={20} color="#EA4335" />
        </View>
        <Text variant="body" style={styles.buttonText}>
          {actionText} with Google
        </Text>
      </TouchableOpacity>

      {/* Apple Sign-In Button (iOS only) */}
      {Platform.OS === 'ios' && (
        <TouchableOpacity
          style={[styles.socialButton, styles.appleButton]}
          onPress={handleAppleSignIn}
          disabled={isLoading}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
          </View>
          <Text variant="body" style={[styles.buttonText, styles.appleButtonText]}>
            {actionText} with Apple
          </Text>
        </TouchableOpacity>
      )}

      {/* Configuration Warning (Dev only) */}
      {__DEV__ && !socialConfig.google && (
        <View style={styles.devWarning}>
          <Ionicons name="warning-outline" size={16} color={COLORS.warning} />
          <Text variant="caption" color={COLORS.warning} style={styles.devWarningText}>
            Google Sign-In not configured (see SOCIAL_AUTH_SETUP.md)
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  appleButton: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  iconContainer: {
    marginRight: 12,
  },
  buttonText: {
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  appleButtonText: {
    color: '#FFFFFF',
  },
  devWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    padding: 12,
    backgroundColor: COLORS.secondary[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  devWarningText: {
    flex: 1,
    fontSize: 12,
  },
});
