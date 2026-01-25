/**
 * API Endpoints
 * Centralized endpoint definitions
 */

export const ENDPOINTS = {
  // Recognition
  RECOGNIZE: '/recognize',

  // Quran data
  SURAHS: '/surahs',
  SURAH_BY_ID: (id: number) => `/surahs/${id}`,
  SURAH_AYAHS: (id: number) => `/surahs/${id}/ayahs`,
  AYAH_BY_ID: (id: number) => `/ayahs/${id}`,

  // Health
  HEALTH: '/health',
  STATS: '/stats',
} as const;
