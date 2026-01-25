/**
 * Typography Configuration
 * Optimized for Arabic text readability
 */

export const TYPOGRAPHY = {
  // Font families
  fonts: {
    arabic: {
      regular: 'System', // Will use system Arabic font
      // Future: 'Amiri' or 'Scheherazade New'
    },
    english: {
      regular: 'System',
      medium: 'System',
      bold: 'System',
    },
  },

  // Font sizes
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 36,
  },

  // Arabic-specific sizes (larger for readability)
  arabicSizes: {
    sm: 18,
    md: 22,
    lg: 26,
    xl: 30,
    '2xl': 34,
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
