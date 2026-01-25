/**
 * Button Component
 * Reusable button with variants
 */
import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { COLORS, TYPOGRAPHY } from '@/constants';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const buttonStyles = [
    styles.button,
    styles[`button_${variant}`],
    styles[`button_${size}`],
    disabled && styles.button_disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`text_${variant}`],
    styles[`text_${size}`],
    disabled && styles.text_disabled,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? COLORS.neutral[0] : COLORS.primary[500]}
        />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  // Variants
  button_primary: {
    backgroundColor: COLORS.primary[500],
  },
  button_secondary: {
    backgroundColor: COLORS.secondary[500],
  },
  button_outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.primary[500],
  },

  // Sizes
  button_small: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  button_medium: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  button_large: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },

  // States
  button_disabled: {
    opacity: 0.5,
  },

  // Text
  text: {
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  text_primary: {
    color: COLORS.neutral[0],
  },
  text_secondary: {
    color: COLORS.text.primary,
  },
  text_outline: {
    color: COLORS.primary[500],
  },
  text_small: {
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  text_medium: {
    fontSize: TYPOGRAPHY.sizes.md,
  },
  text_large: {
    fontSize: TYPOGRAPHY.sizes.lg,
  },
  text_disabled: {
    opacity: 0.5,
  },
});
