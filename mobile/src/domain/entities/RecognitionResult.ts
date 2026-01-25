import { Surah } from './Surah';
import { Ayah } from './Ayah';

/**
 * Recognition Result Domain Entity
 */
export interface RecognitionResult {
  success: boolean;
  isAmbiguous: boolean;
  surah?: Surah;
  ayah?: Ayah;
  confidence: number;
  processingTimeMs: number;
  alternatives?: AlternativeMatch[];
  error?: RecognitionError;
}

export interface AlternativeMatch {
  surah: Surah;
  ayah: Ayah;
  confidence: number;
}

export interface RecognitionError {
  code: string;
  message: string;
  retryable: boolean;
}

export function createSuccessResult(
  surah: Surah,
  ayah: Ayah,
  confidence: number,
  processingTimeMs: number,
  alternatives?: AlternativeMatch[]
): RecognitionResult {
  return {
    success: true,
    isAmbiguous: (alternatives?.length ?? 0) > 0,
    surah,
    ayah,
    confidence,
    processingTimeMs,
    alternatives,
  };
}

export function createErrorResult(
  error: RecognitionError,
  processingTimeMs: number
): RecognitionResult {
  return {
    success: false,
    isAmbiguous: false,
    confidence: 0,
    processingTimeMs,
    error,
  };
}
