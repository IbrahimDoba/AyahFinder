/**
 * Welcome Screen
 * Entry point for authentication flow
 */
import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../components/common/Text';
import { HeroButton } from '../../components/common/HeroButton';
import { SocialAuthButtons } from '../../components/auth/SocialAuthButtons';
import { COLORS } from '../../../constants';
import { RootStackParamList } from '../../navigation/RootNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function WelcomeScreen() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Logo/Header Section */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="musical-notes" size={64} color={COLORS.primary[500]} />
          </View>

          <Text variant="h1" align="center" style={styles.title}>
            Welcome to Ayahfinder
          </Text>

          <Text variant="body" color={COLORS.text.secondary} align="center" style={styles.subtitle}>
            Identify Quran recitations instantly with audio recognition
          </Text>
        </View>

        {/* Features List */}
        <View style={styles.features}>
          <View style={styles.featureItem}>
            <Ionicons name="mic-outline" size={24} color={COLORS.primary[500]} />
            <View style={styles.featureText}>
              <Text variant="body" style={styles.featureTitle}>
                Audio Recognition
              </Text>
              <Text variant="caption" color={COLORS.text.secondary}>
                Record any Quran recitation and find the exact verse
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Ionicons name="flash-outline" size={24} color={COLORS.primary[500]} />
            <View style={styles.featureText}>
              <Text variant="body" style={styles.featureTitle}>
                Free Daily Searches
              </Text>
              <Text variant="caption" color={COLORS.text.secondary}>
                Get 5 audio searches per day with a free account
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Ionicons name="cloud-outline" size={24} color={COLORS.primary[500]} />
            <View style={styles.featureText}>
              <Text variant="body" style={styles.featureTitle}>
                Sync Across Devices
              </Text>
              <Text variant="caption" color={COLORS.text.secondary}>
                Access your search history from any device
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {/* Social Authentication */}
          <SocialAuthButtons mode="sign-up" />

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text variant="caption" color={COLORS.text.secondary} style={styles.dividerText}>
              OR
            </Text>
            <View style={styles.dividerLine} />
          </View>

          <HeroButton
            title="Create Account with Email"
            variant="primary"
            onPress={() => navigation.navigate('SignUp' as any)}
            style={styles.primaryButton}
          />

          <HeroButton
            title="Sign In"
            variant="ghost"
            onPress={() => navigation.navigate('Login' as any)}
            style={styles.secondaryButton}
          />

          {/* Skip for now */}
          <View style={styles.skipContainer}>
            <Text variant="caption" color={COLORS.text.secondary} align="center">
              Want to try it first?{' '}
            </Text>
            <HeroButton
              title="Continue as Guest"
              variant="ghost"
              size="sm"
              onPress={() => navigation.navigate('MainApp' as any)}
              style={styles.skipButton}
            />
          </View>
        </View>
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
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginTop: 32,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    marginBottom: 12,
  },
  subtitle: {
    paddingHorizontal: 16,
    lineHeight: 22,
  },
  features: {
    gap: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  featureText: {
    flex: 1,
    gap: 4,
  },
  featureTitle: {
    fontWeight: '600',
  },
  actions: {
    gap: 12,
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
  primaryButton: {
    // Additional styles if needed
  },
  secondaryButton: {
    // Additional styles if needed
  },
  skipContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  skipButton: {
    marginTop: 4,
  },
});
