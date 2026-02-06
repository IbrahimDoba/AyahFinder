/**
 * Subscription Modal
 * Beautiful modal for subscription success/error states with confetti
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../common/Text';
import { HeroButton } from '../common/HeroButton';
import { COLORS } from '../../../constants';

const { width, height } = Dimensions.get('window');

interface SubscriptionModalProps {
  visible: boolean;
  type: 'success' | 'error' | 'restore';
  title: string;
  message: string;
  onClose: () => void;
}

export default function SubscriptionModal({
  visible,
  type,
  title,
  message,
  onClose,
}: SubscriptionModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Animate modal entrance
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const getIconConfig = () => {
    switch (type) {
      case 'success':
        return {
          name: 'checkmark-circle' as const,
          color: '#10B981',
          backgroundColor: '#D1FAE5',
        };
      case 'restore':
        return {
          name: 'refresh-circle' as const,
          color: '#3B82F6',
          backgroundColor: '#DBEAFE',
        };
      case 'error':
        return {
          name: 'close-circle' as const,
          color: '#EF4444',
          backgroundColor: '#FEE2E2',
        };
    }
  };

  const iconConfig = getIconConfig();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Modal Card */}
        <Animated.View
          style={[
            styles.modalCard,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Icon */}
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: iconConfig.backgroundColor },
            ]}
          >
            <Ionicons
              name={iconConfig.name}
              size={64}
              color={iconConfig.color}
            />
          </View>

          {/* Title */}
          <Text variant="h2" align="center" style={styles.title}>
            {title}
          </Text>

          {/* Message */}
          <Text
            variant="body"
            align="center"
            color={COLORS.text.secondary}
            style={styles.message}
          >
            {message}
          </Text>

          {/* Success extras */}
          {type === 'success' && (
            <View style={styles.benefitsContainer}>
              <View style={styles.benefitRow}>
                <Ionicons name="checkmark" size={20} color="#10B981" />
                <Text variant="caption" style={styles.benefitText}>
                  100 searches per month activated
                </Text>
              </View>
              <View style={styles.benefitRow}>
                <Ionicons name="checkmark" size={20} color="#10B981" />
                <Text variant="caption" style={styles.benefitText}>
                  Priority recognition enabled
                </Text>
              </View>
              <View style={styles.benefitRow}>
                <Ionicons name="checkmark" size={20} color="#10B981" />
                <Text variant="caption" style={styles.benefitText}>
                  Premium features unlocked
                </Text>
              </View>
            </View>
          )}

          {/* Close Button */}
          <HeroButton
            title="Continue"
            variant="primary"
            onPress={onClose}
            style={styles.button}
          />

          {/* Decorative elements for success */}
          {type === 'success' && (
            <>
              <View style={[styles.sparkle, styles.sparkle1]}>
                <Ionicons name="sparkles" size={24} color="#FBBF24" />
              </View>
              <View style={[styles.sparkle, styles.sparkle2]}>
                <Ionicons name="sparkles" size={20} color="#F59E0B" />
              </View>
              <View style={[styles.sparkle, styles.sparkle3]}>
                <Ionicons name="sparkles" size={16} color="#FBBF24" />
              </View>
            </>
          )}
        </Animated.View>
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
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    marginBottom: 12,
    color: COLORS.text.primary,
  },
  message: {
    marginBottom: 24,
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  benefitsContainer: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitText: {
    flex: 1,
    color: COLORS.text.secondary,
  },
  button: {
    width: '100%',
  },
  sparkle: {
    position: 'absolute',
  },
  sparkle1: {
    top: 20,
    right: 20,
  },
  sparkle2: {
    top: 40,
    left: 30,
  },
  sparkle3: {
    bottom: 80,
    right: 40,
  },
});
