/**
 * Application Configuration
 * Environment-specific settings
 */

export const API_CONFIG = {
  BASE_URL: __DEV__
    ? 'http://localhost:3000/api'
    : 'https://api.ayahfinder.com/api',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;

export const AUDIO_CONFIG = {
  SAMPLE_RATE: 16000,
  CHANNELS: 1, // Mono
  BIT_DEPTH: 16,
  FORMAT: 'wav',
  MIN_DURATION: 2000, // 2 seconds (reduced for real-time chunks)
  MAX_DURATION: 15000, // 15 seconds
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
} as const;

export const APP_CONFIG = {
  ENABLE_LOGGING: __DEV__,
  ENABLE_ANALYTICS: !__DEV__,
  DEFAULT_LANGUAGE: 'ar',
  SUPPORTED_LANGUAGES: ['ar', 'en'] as const,
} as const;

export const REALTIME_MATCHING_CONFIG = {
  // Audio chunking
  CHUNK_INTERVAL: 10000, // Send chunk every 10 seconds (AI needs more context)
  CHUNK_DURATION: 10000, // 10-second audio chunks

  // Recognition thresholds (AI-based matching is more accurate)
  CONFIDENCE_THRESHOLD: 0.5, // 50% confidence = auto-navigate
  MIN_CONFIDENCE_TO_SHOW: 0.3, // Show partial matches above 30%

  // API settings
  MAX_CONCURRENT_REQUESTS: 2, // Limit simultaneous API calls
  REQUEST_TIMEOUT: 10000, // 10 seconds timeout per chunk (OpenAI can be slower)

  // Behavior
  AUTO_STOP_ON_MATCH: true, // Stop recording when match found
  AUTO_NAVIGATE_ON_MATCH: true, // Navigate to Surah automatically
  MAX_RECORDING_TIME: 15000, // 15 seconds max (safety limit)

  // UI feedback
  SHOW_PARTIAL_MATCHES: true, // Show low-confidence matches in UI
  HAPTIC_FEEDBACK_ON_MATCH: true, // Vibrate when match found
} as const;

export const USAGE_LIMITS = {
  ANONYMOUS: {
    DAILY_SEARCHES: 2,
    TIER: 'anonymous' as const,
  },
  FREE: {
    DAILY_SEARCHES: 5,
    TIER: 'free' as const,
  },
  PREMIUM: {
    MONTHLY_SEARCHES: 100,
    TIER: 'premium' as const,
  },
  // Reset times
  DAILY_RESET_HOUR: 0, // Midnight UTC
  MONTHLY_RESET_DAY: 1, // First day of billing cycle
} as const;

export const FIREBASE_CONFIG = {
  // These will be populated from environment variables or Firebase config files
  // For now, placeholders - will be set up during Firebase project creation
  ENABLE_EMULATOR: __DEV__ && false, // Set to true for local development
  EMULATOR_HOST: 'localhost',
  AUTH_EMULATOR_PORT: 9099,
  FIRESTORE_EMULATOR_PORT: 8080,
  FUNCTIONS_EMULATOR_PORT: 5001,
} as const;
