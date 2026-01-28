/**
 * Email Verification Screen
 * Handle email verification from deep links
 */
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../components/common/Text';
import { HeroButton } from '../../components/common/HeroButton';
import { COLORS } from '../../../constants';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useAuthStore } from '../../store/authStore';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProp_ = RouteProp<RootStackParamList, 'EmailVerification'>;

type VerificationStatus = 'verifying' | 'success' | 'error';

export default function EmailVerificationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp_>();
  const { verifyEmail, resendVerificationEmail, isLoading } = useAuthStore();

  const [status, setStatus] = useState<VerificationStatus>('verifying');
  const [errorMessage, setErrorMessage] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    handleVerifyEmail();
  }, []);

  const handleVerifyEmail = async () => {
    const token = route.params?.token;

    if (!token) {
      setStatus('error');
      setErrorMessage('Invalid verification link. Please try again or request a new verification email.');
      return;
    }

    try {
      setStatus('verifying');
      await verifyEmail(token);
      setStatus('success');
    } catch (error: any) {
      console.error('Email verification error:', error);
      setStatus('error');
      setErrorMessage(error.message || 'Failed to verify email. The link may have expired.');
    }
  };

  const handleResendEmail = async () => {
    if (!email) {
      setErrorMessage('Please enter your email address');
      return;
    }

    try {
      await resendVerificationEmail(email.trim());
      setErrorMessage('');
      alert('Verification email sent! Please check your inbox.');
    } catch (error: any) {
      console.error('Resend email error:', error);
      setErrorMessage(error.message || 'Failed to resend verification email');
    }
  };

  const handleGoToLogin = () => {
    navigation.navigate('Login' as any);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {status === 'verifying' && (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="large" color={COLORS.primary[500]} />
            <Text variant="h3" style={styles.title}>
              Verifying Email...
            </Text>
            <Text variant="body" color={COLORS.text.secondary} style={styles.message}>
              Please wait while we verify your email address
            </Text>
          </View>
        )}

        {status === 'success' && (
          <View style={styles.statusContainer}>
            <View style={styles.iconContainer}>
              <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
            </View>
            <Text variant="h3" style={styles.title}>
              Email Verified!
            </Text>
            <Text variant="body" color={COLORS.text.secondary} style={styles.message}>
              Your email has been successfully verified. You can now sign in to your account.
            </Text>
            <HeroButton
              title="Go to Login"
              variant="primary"
              onPress={handleGoToLogin}
              style={styles.button}
            />
          </View>
        )}

        {status === 'error' && (
          <View style={styles.statusContainer}>
            <View style={styles.iconContainer}>
              <Ionicons name="close-circle" size={80} color={COLORS.error} />
            </View>
            <Text variant="h3" style={styles.title}>
              Verification Failed
            </Text>
            <Text variant="body" color={COLORS.text.secondary} style={styles.message}>
              {errorMessage}
            </Text>

            <View style={styles.actions}>
              <HeroButton
                title="Try Again"
                variant="primary"
                onPress={handleVerifyEmail}
                loading={isLoading}
                disabled={isLoading}
                style={styles.button}
              />

              <TouchableOpacity onPress={handleGoToLogin} style={styles.linkButton}>
                <Text variant="body" color={COLORS.primary[500]}>
                  Go to Login
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  statusContainer: {
    alignItems: 'center',
    gap: 16,
    maxWidth: 400,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    lineHeight: 24,
  },
  actions: {
    width: '100%',
    gap: 16,
    marginTop: 16,
  },
  button: {
    width: '100%',
  },
  linkButton: {
    padding: 12,
    alignItems: 'center',
  },
});
