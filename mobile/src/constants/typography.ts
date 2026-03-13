/**
 * Typography Configuration
 * Optimized for Arabic text readability and responsive across devices
 */
import { normalize } from '@/utils/responsive';

export const TYPOGRAPHY = {
  // Font families
  fonts: {
    arabic: {
      regular: 'UthmanicHafs',
    },
    english: {
      regular: 'System',
      medium: 'System',
      bold: 'System',
    },
  },

  // Font sizes - responsive across different screen sizes
  sizes: {
    xs: normalize(12, 0.3),
    sm: normalize(14, 0.3),
    md: normalize(16, 0.3),
    lg: normalize(18, 0.3),
    xl: normalize(20, 0.4),
    '2xl': normalize(24, 0.4),
    '3xl': normalize(28, 0.5),
    '4xl': normalize(32, 0.5),
    '5xl': normalize(36, 0.5),
  },

  // Arabic-specific sizes (larger for readability) - responsive
  arabicSizes: {
    sm: normalize(18, 0.3),
    md: normalize(22, 0.4),
    lg: normalize(26, 0.4),
    xl: normalize(30, 0.5),
    '2xl': normalize(34, 0.5),
  },

  // Line heights
  lineHeights: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2.0,
    arabic: 2.0, // Arabic needs more line height
  },

  // Font weights
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;

export type Typography = typeof TYPOGRAPHY;
