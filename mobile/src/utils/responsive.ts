/**
 * Responsive utilities for consistent UI across different devices
 * Handles different screen sizes and user font size settings
 */
import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (iPhone 11/12/13 standard)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

/**
 * Width percentage
 * Convert percentage to absolute width based on screen width
 * @param widthPercent - Width as percentage (e.g., 50 for 50%)
 */
export const wp = (widthPercent: number): number => {
  const percent = (widthPercent * SCREEN_WIDTH) / 100;
  return PixelRatio.roundToNearestPixel(percent);
};

/**
 * Height percentage
 * Convert percentage to absolute height based on screen height
 * @param heightPercent - Height as percentage (e.g., 50 for 50%)
 */
export const hp = (heightPercent: number): number => {
  const percent = (heightPercent * SCREEN_HEIGHT) / 100;
  return PixelRatio.roundToNearestPixel(percent);
};

/**
 * Normalize font size based on screen width
 * Ensures text scales appropriately on different screen sizes
 * @param size - Base font size
 * @param factor - Scaling factor (default 0.5)
 */
export const normalize = (size: number, factor: number = 0.5): number => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * scale;

  // Apply factor for more controlled scaling
  const finalSize = size + (newSize - size) * factor;

  return Math.round(PixelRatio.roundToNearestPixel(finalSize));
};

/**
 * Responsive spacing
 * Scale spacing values based on screen size
 * @param size - Base spacing size
 */
export const rs = (size: number): number => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  return Math.round(size * scale);
};

/**
 * Check if device is a small screen (width < 375px)
 */
export const isSmallDevice = (): boolean => {
  return SCREEN_WIDTH < 375;
};

/**
 * Check if device is a large screen (width > 414px)
 */
export const isLargeDevice = (): boolean => {
  return SCREEN_WIDTH > 414;
};

/**
 * Get responsive value based on screen size
 * @param small - Value for small screens
 * @param medium - Value for medium screens
 * @param large - Value for large screens
 */
export const getResponsiveValue = <T,>(small: T, medium: T, large: T): T => {
  if (isSmallDevice()) return small;
  if (isLargeDevice()) return large;
  return medium;
};

/**
 * Clamp a value between min and max
 * Useful for preventing text from becoming too large or small
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Responsive font sizes with min/max constraints
 */
export const responsiveFontSize = (
  size: number,
  minSize?: number,
  maxSize?: number
): number => {
  const normalized = normalize(size);

  if (minSize && maxSize) {
    return clamp(normalized, minSize, maxSize);
  }

  return normalized;
};

// Export screen dimensions for convenience
export const SCREEN_DIMENSIONS = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
};

// Responsive breakpoints
export const BREAKPOINTS = {
  small: 320,
  medium: 375,
  large: 414,
  xlarge: 480,
};
