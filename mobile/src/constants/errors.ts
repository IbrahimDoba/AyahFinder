/**
 * Error Messages and Codes
 * User-facing error messages
 */

export const ERROR_MESSAGES = {
  // Network errors
  NETWORK_ERROR: 'Unable to connect. Please check your internet connection.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  SERVER_ERROR: 'Something went wrong. Please try again later.',

  // Permission errors
  MICROPHONE_DENIED: 'Microphone access is required to identify recitations.',
  MICROPHONE_UNAVAILABLE: 'Microphone is not available on this device.',

  // Audio errors
  AUDIO_TOO_SHORT: 'Recording is too short. Please record at least 3 seconds.',
  AUDIO_TOO_LONG: 'Recording is too long. Maximum 15 seconds allowed.',
  AUDIO_RECORDING_FAILED: 'Failed to record audio. Please try again.',
  AUDIO_PROCESSING_FAILED: 'Failed to process audio. Please try again.',

  // Recognition errors
  NO_MATCH_FOUND: "Couldn't identify the recitation. Please try again with clearer audio.",
  LOW_CONFIDENCE: 'Match found but confidence is low. Would you like to try again?',
  AMBIGUOUS_MATCH: 'Multiple similar verses detected. Continue listening for better accuracy.',

  // Data errors
  QURAN_DATA_UNAVAILABLE: 'Quran data is not available. Please check your connection.',
  SURAH_NOT_FOUND: 'Surah not found.',
  AYAH_NOT_FOUND: 'Ayah not found.',

  // Generic
  UNKNOWN_ERROR: 'An unexpected error occurred.',
} as const;

export const ERROR_CODES = {
  NETWORK: 'NETWORK',
  TIMEOUT: 'TIMEOUT',
  SERVER: 'SERVER',
  PERMISSION: 'PERMISSION',
  VALIDATION: 'VALIDATION',
  RECOGNITION: 'RECOGNITION',
  NOT_FOUND: 'NOT_FOUND',
  UNKNOWN: 'UNKNOWN',
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;
export type ErrorMessage = keyof typeof ERROR_MESSAGES;
