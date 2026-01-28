/**
 * API Endpoints
 * Centralized endpoint definitions
 */

export const ENDPOINTS = {
  // Authentication
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    VERIFY: '/auth/verify',
    RESET_PASSWORD: '/auth/reset-password',
    RESET_PASSWORD_CONFIRM: '/auth/reset-password/confirm',
    REFRESH: '/auth/refresh',
    RESEND_VERIFICATION: '/auth/resend-verification',
    ME: '/auth/me',
  },

  // Recognition
  RECOGNIZE: '/recognize',

  // Usage
  USAGE: {
    VALIDATE: '/usage/validate',
    INCREMENT: '/usage/increment',
    STATS: '/usage/stats',
  },

  // Quran data
  QURAN: {
    SURAHS: '/quran/surahs',
    SURAH_BY_ID: (id: number) => `/quran/surahs/${id}`,
    AYAH_BY_ID: (surahId: number, ayahId: number) => `/quran/ayahs/${surahId}/${ayahId}`,
    SEARCH: '/quran/search',
  },

  // Legacy endpoints (for backward compatibility)
  SURAHS: '/quran/surahs',
  SURAH_BY_ID: (id: number) => `/quran/surahs/${id}`,
  SURAH_AYAHS: (id: number) => `/quran/surahs/${id}/ayahs`,
  AYAH_BY_ID: (id: number) => `/quran/ayahs/${id}`,
} as const;
