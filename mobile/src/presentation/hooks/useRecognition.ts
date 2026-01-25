/**
 * useRecognition Hook
 * Handles audio recognition flow
 */
import { useState, useCallback } from 'react';
import { RecognitionResult } from '@/domain/entities/RecognitionResult';
import { createSurah } from '@/domain/entities/Surah';
import { createAyah } from '@/domain/entities/Ayah';
import { RecognizeAudioUseCase } from '@/domain/usecases/RecognizeAudioUseCase';
import { RecognitionRepositoryImpl } from '@/data/repositories/RecognitionRepositoryImpl';
import { RecognitionApiDataSource } from '@/data/datasources/remote/RecognitionApiDataSource';
import type { AudioRecording } from '@/services/audio/types';

// MOCK MODE - Set to true to test UI without backend
const ENABLE_MOCK_MODE = true;

// Initialize dependencies
const apiDataSource = new RecognitionApiDataSource();
const repository = new RecognitionRepositoryImpl(apiDataSource);
const useCase = new RecognizeAudioUseCase(repository);

interface UseRecognitionReturn {
  result: RecognitionResult | null;
  isProcessing: boolean;
  error: string | null;
  recognize: (recording: AudioRecording) => Promise<void>;
  reset: () => void;
}

export function useRecognition(): UseRecognitionReturn {
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognize = useCallback(async (recording: AudioRecording) => {
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      if (ENABLE_MOCK_MODE) {
        // Mock delay to simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Mock successful response - Al-Fatiha, Ayah 1
        const mockResult: RecognitionResult = {
          success: true,
          confidence: 0.95,
          isAmbiguous: false,
          processingTimeMs: 1234,
          surah: createSurah({
            number: 1,
            nameArabic: 'الفاتحة',
            nameEnglish: 'Al-Fatiha',
            nameTransliteration: 'Al-Fatiha',
            ayahCount: 7,
          }),
          ayah: createAyah({
            surahId: 1,
            surahNumber: 1,
            ayahNumber: 1,
            textArabic: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
            juzNumber: 1,
            pageNumber: 1,
          }),
        };

        setResult(mockResult);
      } else {
        const recognitionResult = await useCase.execute({
          audioUri: recording.uri,
          duration: recording.duration,
          format: recording.format,
        });

        setResult(recognitionResult);

        if (!recognitionResult.success && recognitionResult.error) {
          setError(recognitionResult.error.message);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Recognition failed');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setIsProcessing(false);
  }, []);

  return {
    result,
    isProcessing,
    error,
    recognize,
    reset,
  };
}
