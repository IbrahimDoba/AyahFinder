/**
 * Ayah Data Transfer Object
 * Matches API response structure
 */
export interface AyahDTO {
  id: number;
  surah_id: number;
  surah_number: number;
  ayah_number: number;
  text_arabic: string;
  text_uthmani?: string;
  juz_number: number;
  page_number: number;
  hizb_number?: number;
  sajda_type?: 'obligatory' | 'recommended';
}

/**
 * API response for ayahs
 */
export interface AyahsResponseDTO {
  success: boolean;
  data: AyahDTO[];
  total: number;
}
