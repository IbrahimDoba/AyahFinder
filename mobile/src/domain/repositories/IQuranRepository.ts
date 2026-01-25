/**
 * Quran Repository Interface
 * Defines contract for Quran data access
 * Implementation can be local, remote, or hybrid
 */
import { Surah } from '../entities/Surah';
import { Ayah } from '../entities/Ayah';

export interface IQuranRepository {
  /**
   * Get all Surahs
   */
  getSurahs(): Promise<Surah[]>;

  /**
   * Get a single Surah by ID or number
   */
  getSurah(id: number): Promise<Surah | null>;

  /**
   * Get Ayahs for a specific Surah
   */
  getAyahs(surahId: number): Promise<Ayah[]>;

  /**
   * Get a specific Ayah
   */
  getAyah(surahId: number, ayahNumber: number): Promise<Ayah | null>;

  /**
   * Search Quran text (future feature)
   */
  searchAyahs(query: string): Promise<Ayah[]>;
}
