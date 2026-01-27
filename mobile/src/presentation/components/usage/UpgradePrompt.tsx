/**
 * Upgrade Prompt Component
 * Displays when user reaches usage limit
 * Prompts to sign up for more searches
 */
import React from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { Text } from '../common/Text';
import { HeroButton } from '../common/HeroButton';
import type { SubscriptionTier } from '../../../services/usage/UsageValidator';

interface UpgradePromptProps {
  visible: boolean;
  tier: SubscriptionTier;
  remaining: number;
  limit: number;
  reason?: string;
  onUpgrade: () => void;
  onDismiss: () => void;
}

/**
 * Get upgrade message based on current tier
 */
const getUpgradeMessage = (tier: SubscriptionTier): { title: string; message: string; buttonText: string } => {
  switch (tier) {
    case 'anonymous':
      return {
        title: 'Daily Limit Reached',
        message: 'You\'ve used your 2 free searches today. Sign up to get 5 searches per day!',
        buttonText: 'Sign Up for Free',
      };
    case 'free':
      return {
        title: 'Daily Limit Reached',
        message: 'You\'ve used your 5 searches today. Upgrade to Premium for 100 searches per month!',
        buttonText: 'Upgrade to Premium',
      };
    case 'premium':
      return {
        title: 'Monthly Limit Reached',
        message: 'You\'ve used all 100 searches this month. Your limit will reset on your next billing date.',
        buttonText: 'View Account',
      };
    default:
      return {
        title: 'Limit Reached',
        message: 'You\'ve reached your search limit.',
        buttonText: 'OK',
      };
  }
};

export function UpgradePrompt({
  visible,
  tier,
  remaining,
  limit,
  reason,
  onUpgrade,
  onDismiss,
}: UpgradePromptProps) {
  const upgradeInfo = getUpgradeMessage(tier);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text variant="h2" align="center" style={styles.title}>
              {upgradeInfo.title}
            </Text>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Usage Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text variant="caption" align="center" style={styles.statLabel}>
                  Used Today
                </Text>
                <Text variant="h2" align="center" style={styles.statValue}>
                  {limit - remaining}/{limit}
                </Text>
              </View>
            </View>

            {/* Message */}
            <Text variant="body" align="center" style={styles.message}>
              {reason || upgradeInfo.message}
            </Text>

            {/* Benefits (for anonymous users) */}
            {tier === 'anonymous' && (
              <View style={styles.benefits}>
                <Text variant="caption" style={styles.benefitTitle}>
                  Free account benefits:
                </Text>
                <View style={styles.benefitItem}>
                  <Text variant="body" style={styles.benefitText}>
                    • 5 audio searches per day
                  </Text>
                </View>
                <View style={styles.benefitItem}>
                  <Text variant="body" style={styles.benefitText}>
                    • Sync across devices
                  </Text>
                </View>
                <View style={styles.benefitItem}>
                  <Text variant="body" style={styles.benefitText}>
                    • Save search history
                  </Text>
                </View>
              </View>
            )}

            {/* Premium benefits (for free users) */}
            {tier === 'free' && (
              <View style={styles.benefits}>
                <Text variant="caption" style={styles.benefitTitle}>
                  Premium benefits:
                </Text>
                <View style={styles.benefitItem}>
                  <Text variant="body" style={styles.benefitText}>
                    • 100 audio searches per month
                  </Text>
                </View>
                <View style={styles.benefitItem}>
                  <Text variant="body" style={styles.benefitText}>
                    • Priority support
                  </Text>
                </View>
                <View style={styles.benefitItem}>
                  <Text variant="body" style={styles.benefitText}>
                    • Advanced features (coming soon)
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <HeroButton
              title={upgradeInfo.buttonText}
              variant="primary"
              onPress={onUpgrade}
              style={styles.upgradeButton}
            />
            <HeroButton
              title="Maybe Later"
              variant="ghost"
              onPress={onDismiss}
              style={styles.dismissButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    color: '#1F2937',
  },
  content: {
    padding: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    paddingVertical: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#6B7280',
    marginBottom: 4,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    color: '#EF4444',
    fontWeight: 'bold',
  },
  message: {
    color: '#4B5563',
    marginBottom: 20,
    lineHeight: 22,
  },
  benefits: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  benefitTitle: {
    color: '#047857',
    fontWeight: '600',
    marginBottom: 12,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  benefitItem: {
    marginBottom: 8,
  },
  benefitText: {
    color: '#065F46',
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    padding: 24,
    paddingTop: 0,
  },
  upgradeButton: {
    marginBottom: 12,
  },
  dismissButton: {
    // Additional styles if needed
  },
});
