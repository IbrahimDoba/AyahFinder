/**
 * Forgot Password Screen
 * Request password reset email
 */
import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
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
type RouteProp_ = RouteProp<RootStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp_>();
  const { requestPasswordReset, isLoading } = useAuthStore();

  const [email, setEmail] = useState(route.params?.email || '');
  const [emailError, setEmailError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('Email is required');
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleResetPassword = async () => {
    // Validate email
    if (!validateEmail(email)) {
      return;
    }

    try {
      await requestPasswordReset(email.trim());
      setEmailSent(true);

      Alert.alert(
        'Email Sent',
        `Password reset instructions have been sent to ${email.trim()}. Please check your inbox and follow the link to reset your password.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login' as any),
          },
        ]
      );
    } catch (error: any) {
      console.error('Password reset error:', error);
      Alert.alert('Error', error.message || 'Failed to send password reset email. Please try again.');
    }
  };

  const handleResendEmail = async () => {
    setEmailSent(false);
    await handleResetPassword();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
            </TouchableOpacity>

            <Text variant="h2" style={styles.title}>
              Forgot Password?
            </Text>
            <Text variant="body" color={COLORS.text.secondary} style={styles.subtitle}>
              {emailSent
                ? 'Check your email for instructions'
                : 'Enter your email to receive password reset instructions'}
            </Text>
          </View>

          {!emailSent ? (
            /* Form */
            <View style={styles.form}>
              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Text variant="body" style={styles.label}>
                  Email
                </Text>
                <View style={[styles.inputWrapper, emailError && styles.inputError]}>
                  <Ionicons name="mail-outline" size={20} color={COLORS.text.secondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="your@email.com"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (emailError) validateEmail(text);
                    }}
                    onBlur={() => validateEmail(email)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    autoFocus
                  />
                </View>
                {emailError ? (
                  <Text variant="caption" style={styles.errorText}>
                    {emailError}
                  </Text>
                ) : null}
              </View>

              {/* Send Reset Email Button */}
              <HeroButton
                title="Send Reset Email"
                variant="primary"
                onPress={handleResetPassword}
                loading={isLoading}
                disabled={isLoading}
                style={styles.submitButton}
              />

              {/* Info Text */}
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={20} color={COLORS.primary[500]} />
                <Text variant="caption" color={COLORS.text.secondary} style={styles.infoText}>
                  We'll send you an email with a link to reset your password. The link will expire in 1 hour.
                </Text>
              </View>
            </View>
          ) : (
            /* Success State */
            <View style={styles.successContainer}>
              <View style={styles.iconContainer}>
                <Ionicons name="mail" size={64} color={COLORS.primary[500]} />
              </View>

              <Text variant="body" color={COLORS.text.secondary} style={styles.successText}>
                We've sent password reset instructions to:
              </Text>
              <Text variant="body" style={styles.emailText}>
                {email}
              </Text>

              <Text variant="caption" color={COLORS.text.secondary} style={styles.successInfo}>
                Please check your inbox and spam folder. The reset link will expire in 1 hour.
              </Text>

              {/* Resend Email */}
              <TouchableOpacity onPress={handleResendEmail} disabled={isLoading} style={styles.resendButton}>
                <Text variant="body" color={COLORS.primary[500]}>
                  Didn't receive the email? Resend
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Back to Login */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={() => navigation.navigate('Login' as any)} disabled={isLoading}>
              <Text variant="body" color={COLORS.primary[500]} style={styles.link}>
                ← Back to Login
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  header: {
    marginBottom: 32,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    lineHeight: 22,
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    paddingHorizontal: 12,
    height: 50,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text.primary,
  },
  errorText: {
    color: COLORS.error,
  },
  submitButton: {
    marginTop: 8,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary[50],
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    lineHeight: 18,
  },
  successContainer: {
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  successText: {
    textAlign: 'center',
  },
  emailText: {
    textAlign: 'center',
    fontWeight: '600',
  },
  successInfo: {
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
  resendButton: {
    marginTop: 16,
    padding: 8,
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
  },
  link: {
    fontWeight: '600',
  },
});
