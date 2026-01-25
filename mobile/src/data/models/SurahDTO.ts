/**
 * Surah Data Transfer Object
 * Matches API response structure
 */
export interface SurahDTO {
  id: number;
  number: number;
  name_arabic: string;
  name_english: string;
  name_transliteration: string;
  revelation_type: 'meccan' | 'medinan';
  ayah_count: number;
}

/**
 * API response for list of surahs
 */
export interface SurahsResponseDTO {
  success: boolean;
  data: SurahDTO[];
  total: number;
}

/**
 * API response for single surah with ayahs
 */
export interface SurahWithAyahsDTO {
  surah: SurahDTO;
  ayahs: AyahDTO[];
}

import { AyahDTO } from './AyahDTO';
