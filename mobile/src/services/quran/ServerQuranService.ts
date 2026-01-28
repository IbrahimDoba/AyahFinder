/**
 * Quran Service
 * Server-based Quran data fetching
 * Replaces local JSON files
 */
import { apiClient } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache keys
const SURAHS_CACHE_KEY = '@ayahfinder:surahs';
const SURAH_CACHE_PREFIX = '@ayahfinder:surah:';
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface SurahMetadata {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: 'Meccan' | 'Medinan';
}

export interface Ayah {
  id: number;
  surahId: number;
  ayahNumber: number;
  arabicText: string;
  englishTranslation?: string;
  number?: number; // legacy support
  text?: string; // legacy support
}

export interface Surah extends SurahMetadata {
  verses: Ayah[];
  ayahs?: Ayah[]; // legacy support
}

export interface SearchResult {
  surahNumber: number;
  ayahNumber: number;
  surahName: string;
  arabicText: string;
  englishTranslation: string;
  score?: number;
}

interface CachedData<T> {
  data: T;
  timestamp: number;
}

/**
 * Server Quran Service
 * Handles Quran data fetching with caching
 */
class ServerQuranService {
  /**
   * Get all surahs metadata
   */
  async getAllSurahs(): Promise<SurahMetadata[]> {
    try {
      // Try cache first
      const cached = await this.getFromCache<SurahMetadata[]>(SURAHS_CACHE_KEY);
      if (cached) {
        console.log(`[Quran] Returning ${cached.length} cached surahs`);
        if (cached.length > 0) return cached;
        console.log('[Quran] Cache was empty, fetching from server');
      }

      console.log('[Quran] Fetching all surahs from server');
      const response = await apiClient.get<{ surahs: SurahMetadata[] }>(
        'quran/surahs'
      );

      console.log(
        `[Quran] Server returned ${response.surahs?.length || 0} surahs`
      );

      if (response.surahs && response.surahs.length > 0) {
        // Cache the result
        await this.saveToCache(SURAHS_CACHE_KEY, response.surahs);
      }

      return response.surahs || [];
    } catch (error: any) {
      console.error('[Quran] Error fetching surahs:', error);
      throw this.handleQuranError(error);
    }
  }

  /**
   * Get specific surah with all ayahs
   */
  async getSurah(surahNumber: number): Promise<Surah> {
    try {
      // Validate surah number
      if (surahNumber < 1 || surahNumber > 114) {
        throw new Error('Surah number must be between 1 and 114');
      }

      // Try cache first
      const cacheKey = `${SURAH_CACHE_PREFIX}${surahNumber}`;
      const cached = await this.getFromCache<Surah>(cacheKey);
      if (cached) {
        console.log(`[Quran] Returning cached surah ${surahNumber}`);
        return cached;
      }

      console.log(`[Quran] Fetching surah ${surahNumber} from server`);

      const response = await apiClient.get<Surah>(
        `quran/surahs/${surahNumber}`
      );

      // Cache the result
      await this.saveToCache(cacheKey, response);

      return response;
    } catch (error: any) {
      console.error(`[Quran] Error fetching surah ${surahNumber}:`, error);
      throw this.handleQuranError(error);
    }
  }

  /**
   * Get specific ayah
   */
  async getAyah(
    surahNumber: number,
    ayahNumber: number
  ): Promise<Ayah & { surahName: string }> {
    try {
      // Validate numbers
      if (surahNumber < 1 || surahNumber > 114) {
        throw new Error('Surah number must be between 1 and 114');
      }

      console.log(
        `[Quran] Fetching ayah ${surahNumber}:${ayahNumber} from server`
      );

      const response = await apiClient.get<{
        ayah: Ayah;
        surahName: string;
      }>(`quran/ayahs/${surahNumber}/${ayahNumber}`);

      return {
        ...response.ayah,
        surahName: response.surahName,
      };
    } catch (error: any) {
      console.error(
        `[Quran] Error fetching ayah ${surahNumber}:${ayahNumber}:`,
        error
      );
      throw this.handleQuranError(error);
    }
  }

  /**
   * Search verses in Arabic or English
   */
  async searchVerses(
    query: string,
    language: 'arabic' | 'english' = 'english'
  ): Promise<SearchResult[]> {
    try {
      // Validate query
      if (!query || query.trim().length < 3) {
        throw new Error('Search query must be at least 3 characters');
      }

      console.log(`[Quran] Searching for "${query}" in ${language}`);

      const response = await apiClient.get<{ results: SearchResult[] }>(
        'quran/search',
        {
          q: query.trim(),
          lang: language,
        }
      );

      console.log(`[Quran] Found ${response.results.length} results`);

      return response.results;
    } catch (error: any) {
      console.error('[Quran] Error searching verses:', error);
      throw this.handleQuranError(error);
    }
  }

  /**
   * Get surah name by number
   */
  async getSurahName(surahNumber: number): Promise<string> {
    try {
      const surahs = await this.getAllSurahs();
      const surah = surahs.find(s => s.number === surahNumber);
      return surah?.name || '';
    } catch (error) {
      console.error('[Quran] Error getting surah name:', error);
      return '';
    }
  }

  /**
   * Get total number of ayahs in a surah
   */
  async getSurahAyahCount(surahNumber: number): Promise<number> {
    try {
      const surahs = await this.getAllSurahs();
      const surah = surahs.find(s => s.number === surahNumber);
      return surah?.numberOfAyahs || 0;
    } catch (error) {
      console.error('[Quran] Error getting ayah count:', error);
      return 0;
    }
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    try {
      console.log('[Quran] Clearing cache');

      // Clear surahs cache
      await AsyncStorage.removeItem(SURAHS_CACHE_KEY);

      // Clear all surah caches (1-114)
      const clearPromises = [];
      for (let i = 1; i <= 114; i++) {
        clearPromises.push(
          AsyncStorage.removeItem(`${SURAH_CACHE_PREFIX}${i}`)
        );
      }
      await Promise.all(clearPromises);

      console.log('[Quran] Cache cleared');
    } catch (error) {
      console.error('[Quran] Error clearing cache:', error);
    }
  }

  /**
   * Preload popular surahs for offline access
   */
  async preloadPopularSurahs(
    surahNumbers: number[] = [1, 2, 18, 36, 67, 112, 113, 114]
  ): Promise<void> {
    try {
      console.log('[Quran] Preloading popular surahs:', surahNumbers);

      const preloadPromises = surahNumbers.map(num => this.getSurah(num));
      await Promise.all(preloadPromises);

      console.log('[Quran] Popular surahs preloaded');
    } catch (error) {
      console.error('[Quran] Error preloading surahs:', error);
      // Don't throw - preloading is optional
    }
  }

  /**
   * Get from cache if not expired
   */
  private async getFromCache<T>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (!cached) {
        return null;
      }

      const { data, timestamp }: CachedData<T> = JSON.parse(cached);

      // Check if cache is expired
      const now = Date.now();
      if (now - timestamp > CACHE_EXPIRY_MS) {
        console.log(`[Quran] Cache expired for ${key}`);
        await AsyncStorage.removeItem(key);
        return null;
      }

      return data;
    } catch (error) {
      console.error(`[Quran] Error reading cache for ${key}:`, error);
      return null;
    }
  }

  /**
   * Save to cache with timestamp
   */
  private async saveToCache<T>(key: string, data: T): Promise<void> {
    try {
      const cachedData: CachedData<T> = {
        data,
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(key, JSON.stringify(cachedData));
    } catch (error) {
      console.error(`[Quran] Error saving cache for ${key}:`, error);
      // Don't throw - caching is optional
    }
  }

  /**
   * Handle Quran service errors
   */
  private handleQuranError(error: any): Error {
    const serverError = error.response?.data?.error;
    const status = error.response?.status;

    let message = 'An error occurred while fetching Quran data';

    if (serverError) {
      message = serverError;
    } else if (status === 404) {
      message = 'Surah or Ayah not found';
    } else if (status === 400) {
      message = error.response?.data?.message || 'Invalid request';
    } else if (status === 500) {
      message = 'Server error. Please try again later.';
    } else if (error.message?.includes('Network Error') || !status) {
      message = 'Network error. Please check your connection.';
    }

    return new Error(message);
  }
}

// Singleton instance
const serverQuranService = new ServerQuranService();

export default serverQuranService;
