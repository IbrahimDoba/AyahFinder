/**
 * Sign Up Screen
 * Create new account with email/password
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

export default function SignUpScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { signUp, isLoading, error, clearError } = useAuthStore();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [displayNameError, setDisplayNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const validateDisplayName = (name: string): boolean => {
    if (!name.trim()) {
      setDisplayNameError('Name is required');
      return false;
    }
    if (name.trim().length < 2) {
      setDisplayNameError('Name must be at least 2 characters');
      return false;
    }
    setDisplayNameError('');
    return true;
  };

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

  const validateConfirmPassword = (confirmPwd: string): boolean => {
    if (!confirmPwd) {
      setConfirmPasswordError('Please confirm your password');
      return false;
    }
    if (confirmPwd !== password) {
      setConfirmPasswordError('Passwords do not match');
      return false;
    }
    setConfirmPasswordError('');
    return true;
  };

  const handleSignUp = async () => {
    clearError();

    // Validate all inputs
    const isNameValid = validateDisplayName(displayName);
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    const isConfirmPasswordValid = validateConfirmPassword(confirmPassword);

    if (!isNameValid || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid) {
      return;
    }

    try {
      await signUp(email.trim(), password, displayName.trim());
      // Show success message
      Alert.alert(
        'Account Created!',
        'Your account has been created successfully. A verification email has been sent to your inbox.',
        [{ text: 'OK' }]
      );
      // Navigation will be handled automatically by RootNavigator based on auth state
    } catch (error: any) {
      console.error('Sign up error:', error);
      Alert.alert('Sign Up Failed', error.message || 'Please try again.');
    }
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
              Create Account
            </Text>
            <Text variant="body" color={COLORS.text.secondary} style={styles.subtitle}>
              Sign up to get 5 free searches per day
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Display Name Input */}
            <View style={styles.inputContainer}>
              <Text variant="body" style={styles.label}>
                Name
              </Text>
              <View style={[styles.inputWrapper, displayNameError && styles.inputError]}>
                <Ionicons name="person-outline" size={20} color={COLORS.text.secondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Your name"
                  value={displayName}
                  onChangeText={(text) => {
                    setDisplayName(text);
                    if (displayNameError) validateDisplayName(text);
                  }}
                  onBlur={() => validateDisplayName(displayName)}
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>
              {displayNameError ? (
                <Text variant="caption" style={styles.errorText}>
                  {displayNameError}
                </Text>
              ) : null}
            </View>

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
                  placeholder="At least 6 characters"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (passwordError) validatePassword(text);
                    if (confirmPassword && confirmPasswordError) {
                      validateConfirmPassword(confirmPassword);
                    }
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

            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <Text variant="body" style={styles.label}>
                Confirm Password
              </Text>
              <View style={[styles.inputWrapper, confirmPasswordError && styles.inputError]}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.text.secondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (confirmPasswordError) validateConfirmPassword(text);
                  }}
                  onBlur={() => validateConfirmPassword(confirmPassword)}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.passwordToggle}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={COLORS.text.secondary}
                  />
                </TouchableOpacity>
              </View>
              {confirmPasswordError ? (
                <Text variant="caption" style={styles.errorText}>
                  {confirmPasswordError}
                </Text>
              ) : null}
            </View>

            {/* Terms and Privacy */}
            <Text variant="caption" color={COLORS.text.secondary} style={styles.terms}>
              By signing up, you agree to our Terms of Service and Privacy Policy
            </Text>

            {/* Sign Up Button */}
            <HeroButton
              title="Create Account"
              variant="primary"
              onPress={handleSignUp}
              loading={isLoading}
              disabled={isLoading}
              style={styles.signUpButton}
            />

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text variant="caption" color={COLORS.text.secondary} style={styles.dividerText}>
                OR
              </Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Sign Up */}
            <SocialAuthButtons mode="sign-up" />
          </View>

          {/* Sign In Link */}
          <View style={styles.footer}>
            <Text variant="body" color={COLORS.text.secondary} align="center">
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login' as any)} disabled={isLoading}>
              <Text variant="body" color={COLORS.primary[500]} style={styles.link}>
                Sign In
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
  terms: {
    lineHeight: 18,
    textAlign: 'center',
  },
  signUpButton: {
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
