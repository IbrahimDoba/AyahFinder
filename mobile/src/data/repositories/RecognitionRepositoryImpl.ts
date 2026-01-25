/**
 * Recognition Repository Implementation
 * Implements IRecognitionRepository using API data source
 */
import {
  IRecognitionRepository,
  RecognizeAudioParams,
} from '@/domain/repositories/IRecognitionRepository';
import { RecognitionResult, createSuccessResult, createErrorResult } from '@/domain/entities/RecognitionResult';
import { RecognitionApiDataSource } from '../datasources/remote/RecognitionApiDataSource';
import { ERROR_MESSAGES } from '@/constants/errors';

export class RecognitionRepositoryImpl implements IRecognitionRepository {
  constructor(private apiDataSource: RecognitionApiDataSource) {}

  async recognizeAudio(
    params: RecognizeAudioParams
  ): Promise<RecognitionResult> {
    try {
      // Call API
      const response = await this.apiDataSource.recognizeAudio({
        uri: params.audioUri,
        duration: params.duration,
        size: 0,
        format: params.format,
      });

      // Handle unsuccessful recognition
      if (!response.success || !response.best_match) {
        return createErrorResult(
          {
            code: 'NO_MATCH',
            message: response.message || ERROR_MESSAGES.NO_MATCH_FOUND,
            retryable: true,
          },
          response.processing_time_ms
        );
      }

      // Map to domain entities - load actual surah data
      const surahsData = require('@/data/quran/quran-surah-english.json');
      const surahInfo = surahsData.find((s: any) => s.id === response.best_match.surah_number);

      const surah = {
        id: response.best_match.surah_number,
        number: response.best_match.surah_number,
        nameArabic: surahInfo?.name || '',
        nameEnglish: surahInfo?.translation || '',
        nameTransliteration: surahInfo?.transliteration || `Surah ${response.best_match.surah_number}`,
        revelationType: (surahInfo?.type || 'meccan') as 'meccan' | 'medinan',
        ayahCount: surahInfo?.total_verses || 0,
      };

      const ayah = {
        id: 0,
        surahId: response.best_match.surah_number,
        surahNumber: response.best_match.surah_number,
        ayahNumber: response.best_match.ayah_number,
        textArabic: '', // Will be fetched separately if needed
        juzNumber: 0,
        pageNumber: 0,
      };

      const alternatives = response.alternatives?.map(alt => ({
        surah: {
          ...surah,
          number: alt.surah_number,
        },
        ayah: {
          ...ayah,
          surahNumber: alt.surah_number,
          ayahNumber: alt.ayah_number,
        },
        confidence: alt.confidence,
      }));

      return createSuccessResult(
        surah,
        ayah,
        response.confidence,
        response.processing_time_ms,
        alternatives
      );
    } catch (error: any) {
      // Map API errors to domain errors
      return createErrorResult(
        {
          code: 'RECOGNITION_ERROR',
          message: error.message || ERROR_MESSAGES.AUDIO_PROCESSING_FAILED,
          retryable: true,
        },
        0
      );
    }
  }

  async continueListening(
    _sessionId: string,
    _additionalAudioUri: string
  ): Promise<RecognitionResult> {
    // TODO: Implement continue listening logic
    throw new Error('Not implemented yet');
  }
}
