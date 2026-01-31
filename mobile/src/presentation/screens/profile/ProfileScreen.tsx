import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/presentation/components/common/Text';
import { HeroButton } from '@/presentation/components/common/HeroButton';
import { Card } from 'heroui-native';
import { COLORS } from '@/constants/colors';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '@/presentation/store/authStore';
import { useSettingsStore } from '@/presentation/store/settingsStore';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, isLoading: storeLoading, signOut } = useAuthStore();
  const { showTranslation, toggleTranslation } = useSettingsStore();
  const [localLoading, setLocalLoading] = useState(false);

  const isLoading = storeLoading || localLoading;
  
  // Render translation toggle row
  const renderTranslationToggle = () => (
    <View style={styles.toggleRow}>
      <View style={styles.toggleIcon}>
        <Ionicons
          name="language-outline"
          size={20}
          color={COLORS.primary[500]}
        />
      </View>
      <View style={styles.toggleTextContainer}>
        <Text variant="body" style={styles.toggleLabel}>
          Show Translation
        </Text>
        <Text variant="caption" color={COLORS.text.secondary}>
          Display English translation below Arabic text
        </Text>
      </View>
      <Pressable
        style={[styles.toggleButton, showTranslation && styles.toggleButtonActive]}
        onPress={toggleTranslation}
      >
        <View
          style={[
            styles.toggleKnob,
            showTranslation && styles.toggleKnobActive,
          ]}
        />
      </Pressable>
    </View>
  );

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          setLocalLoading(true);
          try {
            await signOut();
            // RootNavigator will handle stack change, navigating to Welcome
            navigation.navigate('Welcome' as any);
          } catch (error) {
            console.error('Logout error:', error);
          } finally {
            setLocalLoading(false);
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading profile...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.primary[700]} />
          </Pressable>
          <Text variant="h2" style={styles.headerTitle}>
            Profile
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.authPromptContainer}>
            <View style={styles.iconCircle}>
              <Ionicons
                name="person-outline"
                size={60}
                color={COLORS.primary[500]}
              />
            </View>
            <Text variant="h2" align="center" style={styles.promptTitle}>
              Join AyahFind
            </Text>
            <Text variant="body" align="center" style={styles.promptSubtitle}>
              Create an account to track your usage, unlock premium features,
              and save your favorite verses.
            </Text>

            <HeroButton
              title="Create Account"
              variant="primary"
              onPress={() => navigation.navigate('SignUp' as any)}
              style={styles.guestButton}
            />

            <HeroButton
              title="Sign In"
              variant="secondary"
              onPress={() => navigation.navigate('Login' as any)}
              style={styles.guestButton}
            />
          </View>
          
          {/* Preferences Section */}
          <Text variant="h3" style={[styles.sectionTitle, { marginTop: 40 }]}>
            Preferences
          </Text>
          <Card style={styles.detailsCard}>
            {renderTranslationToggle()}
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.primary[700]} />
        </Pressable>
        <Text variant="h2" style={styles.headerTitle}>
          My Profile
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {user.displayName?.charAt(0) ||
                  user.email.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text variant="h3">{user.displayName || 'User'}</Text>
              <Text variant="body" color={COLORS.text.secondary}>
                {user.email}
              </Text>
            </View>
          </View>
        </Card>

        <Text variant="h3" style={styles.sectionTitle}>
          Account Details
        </Text>
        <Card style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="star" size={20} color={COLORS.secondary[500]} />
            </View>
            <View style={styles.detailTextContainer}>
              <Text variant="body" style={styles.detailLabel}>
                Current Plan
              </Text>
              <Text variant="h3" style={styles.detailValue}>
                {`${user.subscriptionTier.charAt(0).toUpperCase()}${user.subscriptionTier.slice(1)} Plan`}
              </Text>
            </View>
            {user.subscriptionTier === 'free' && (
              <Pressable 
                style={styles.upgradeBadge}
                onPress={() => navigation.navigate('Paywall')}
              >
                <Text style={styles.upgradeBadgeText}>Upgrade</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={COLORS.primary[500]}
              />
            </View>
            <View style={styles.detailTextContainer}>
              <Text variant="body" style={styles.detailLabel}>
                Member Since
              </Text>
              <Text variant="h3" style={styles.detailValue}>
                {new Date(user.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </Card>

        <Text variant="h3" style={styles.sectionTitle}>
          Preferences
        </Text>
        <Card style={styles.detailsCard}>
          {renderTranslationToggle()}
        </Card>

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#1B5E20',
  },
  scrollContent: {
    padding: 20,
  },
  authPromptContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  promptTitle: {
    color: '#1B5E20',
    marginBottom: 12,
  },
  promptSubtitle: {
    color: '#6b7280',
    marginBottom: 40,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  guestButton: {
    width: '80%',
    marginBottom: 16,
  },
  profileCard: {
    padding: 20,
    marginBottom: 32,
    backgroundColor: '#E8F5E9',
    borderColor: '#C8E6C9',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  sectionTitle: {
    color: '#1B5E20',
    marginBottom: 16,
  },
  detailsCard: {
    padding: 0,
    marginBottom: 40,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 2,
  },
  detailValue: {
    color: '#111827',
  },
  upgradeBadge: {
    backgroundColor: '#FFC107',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  upgradeBadgeText: {
    color: '#7B5E00',
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginHorizontal: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 12,
  },
  logoutText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600',
  },
  // Toggle styles
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  toggleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 15,
    color: '#111827',
    marginBottom: 2,
  },
  toggleButton: {
    width: 52,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#d1d5db',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  toggleButtonActive: {
    backgroundColor: '#4CAF50',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    transform: [{ translateX: 0 }],
  },
  toggleKnobActive: {
    transform: [{ translateX: 20 }],
  },
});
