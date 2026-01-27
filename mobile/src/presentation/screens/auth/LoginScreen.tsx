/**
 * Login Screen
 * Email/password authentication
 */
import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../components/common/Text';
import { HeroButton } from '../../components/common/HeroButton';
import { SocialAuthButtons } from '../../components/auth/SocialAuthButtons';
import { COLORS } from '../../../constants';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useAuthStore } from '../../store/authStore';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { signIn, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

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

  const validatePassword = (password: string): boolean => {
    if (!password) {
      setPasswordError('Password is required');
      return false;
    }
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleSignIn = async () => {
    clearError();

    // Validate inputs
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    try {
      await signIn(email.trim(), password);
      // Navigation will be handled automatically by RootNavigator based on auth state
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert('Login Failed', error.message || 'Please check your credentials and try again.');
    }
  };

  const handleForgotPassword = () => {
    if (!email) {
      Alert.alert('Email Required', 'Please enter your email address to reset your password.');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    // TODO: Implement password reset
    Alert.alert(
      'Password Reset',
      'Password reset functionality will be available soon. Please contact support if you need assistance.',
      [{ text: 'OK' }]
    );
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
              Welcome Back
            </Text>
            <Text variant="body" color={COLORS.text.secondary} style={styles.subtitle}>
              Sign in to your account
            </Text>
          </View>

          {/* Form */}
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
                />
              </View>
              {emailError ? (
                <Text variant="caption" style={styles.errorText}>
                  {emailError}
                </Text>
              ) : null}
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text variant="body" style={styles.label}>
                Password
              </Text>
              <View style={[styles.inputWrapper, passwordError && styles.inputError]}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.text.secondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (passwordError) validatePassword(text);
                  }}
                  onBlur={() => validatePassword(password)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.passwordToggle}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={COLORS.text.secondary}
                  />
                </TouchableOpacity>
              </View>
              {passwordError ? (
                <Text variant="caption" style={styles.errorText}>
                  {passwordError}
                </Text>
              ) : null}
            </View>

            {/* Forgot Password */}
            <TouchableOpacity onPress={handleForgotPassword} disabled={isLoading}>
              <Text variant="caption" color={COLORS.primary[500]} align="right">
                Forgot password?
              </Text>
            </TouchableOpacity>

            {/* Sign In Button */}
            <HeroButton
              title="Sign In"
              variant="primary"
              onPress={handleSignIn}
              loading={isLoading}
              disabled={isLoading}
              style={styles.signInButton}
            />

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text variant="caption" color={COLORS.text.secondary} style={styles.dividerText}>
                OR
              </Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Sign In */}
            <SocialAuthButtons mode="sign-in" />
          </View>

          {/* Sign Up Link */}
          <View style={styles.footer}>
            <Text variant="body" color={COLORS.text.secondary} align="center">
              Don't have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp' as any)} disabled={isLoading}>
              <Text variant="body" color={COLORS.primary[500]} style={styles.link}>
                Sign Up
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
  passwordToggle: {
    padding: 4,
  },
  errorText: {
    color: COLORS.error,
  },
  signInButton: {
    marginTop: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border.light,
  },
  dividerText: {
    paddingHorizontal: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  link: {
    fontWeight: '600',
  },
});
