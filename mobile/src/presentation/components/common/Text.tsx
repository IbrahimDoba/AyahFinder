/**
 * Text Component
 * Typography component with variants
 */
import React from 'react';
import { Text as RNText, StyleSheet, TextStyle } from 'react-native';
import { COLORS, TYPOGRAPHY } from '@/constants';

interface TextProps {
  children: React.ReactNode;
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'arabic';
  color?: string;
  align?: 'left' | 'center' | 'right';
  style?: TextStyle;
}

export function Text({
  children,
  variant = 'body',
  color = COLORS.text.primary,
  align = 'left',
  style,
}: TextProps) {
  const textStyle = [
    styles.base,
    styles[variant],
    { color, textAlign: align },
    style,
  ];

  return <RNText style={textStyle}>{children}</RNText>;
}

const styles = StyleSheet.create({
  base: {
    color: COLORS.text.primary,
  },

  h1: {
    fontSize: TYPOGRAPHY.sizes['3xl'],
    fontWeight: TYPOGRAPHY.weights.bold,
    lineHeight: TYPOGRAPHY.sizes['3xl'] * TYPOGRAPHY.lineHeights.tight,
  },

  h2: {
    fontSize: TYPOGRAPHY.sizes['2xl'],
    fontWeight: TYPOGRAPHY.weights.bold,
    lineHeight: TYPOGRAPHY.sizes['2xl'] * TYPOGRAPHY.lineHeights.tight,
  },

  h3: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.semibold,
    lineHeight: TYPOGRAPHY.sizes.xl * TYPOGRAPHY.lineHeights.normal,
  },

  body: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.regular,
    lineHeight: TYPOGRAPHY.sizes.md * TYPOGRAPHY.lineHeights.normal,
  },

  caption: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.regular,
    lineHeight: TYPOGRAPHY.sizes.sm * TYPOGRAPHY.lineHeights.normal,
    color: COLORS.text.secondary,
  },

  arabic: {
    fontSize: TYPOGRAPHY.arabicSizes.lg,
    lineHeight: TYPOGRAPHY.arabicSizes.lg * TYPOGRAPHY.lineHeights.arabic,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
