/**
 * useRecognition Hook
 * Handles audio recognition flow using server-based recognition
 */
import { useState, useCallback } from 'react';
import serverRecognitionService, { RecognitionResult } from '@/services/recognition/ServerRecognitionService';
import serverUsageService from '@/services/usage/ServerUsageService';
import type { AudioRecording } from '@/services/audio/types';

interface UseRecognitionReturn {
  result: RecognitionResult | null;
  isProcessing: boolean;
  error: string | null;
  usageExceeded: boolean;
  recognize: (recording: AudioRecording) => Promise<void>;
  reset: () => void;
}

export function useRecognition(): UseRecognitionReturn {
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usageExceeded, setUsageExceeded] = useState(false);

  const recognize = useCallback(async (recording: AudioRecording) => {
    setIsProcessing(true);
    setError(null);
    setResult(null);
    setUsageExceeded(false);

    try {
      // Step 1: Check usage limits before processing
      console.log('[Recognition] Checking usage limits...');
      const usageCheck = await serverUsageService.canPerformSearch();

      if (!usageCheck.allowed) {
        setUsageExceeded(true);
        setError(usageCheck.reason || 'Usage limit exceeded. Please upgrade to premium.');
        setIsProcessing(false);
        return;
      }

      console.log('[Recognition] Usage check passed:', usageCheck);

      // Step 2: Validate audio file
      const validation = serverRecognitionService.validateAudioFile(recording.uri);
      if (!validation.valid) {
        setError(validation.error || 'Invalid audio file');
        setIsProcessing(false);
        return;
      }

      // Step 3: Send to server for recognition
      console.log('[Recognition] Recognizing audio...');
      const recognitionResult = await serverRecognitionService.recognizeAudio(recording.uri);

      setResult(recognitionResult);

      if (!recognitionResult.success) {
        setError(recognitionResult.message || 'Could not find a matching verse');
      }

      console.log('[Recognition] Recognition complete:', recognitionResult);
    } catch (err: any) {
      console.error('[Recognition] Error:', err);

      // Check if it's a usage limit error
      if (err.code === 'recognition/limit-reached') {
        setUsageExceeded(true);
      }

      const errorMessage = serverRecognitionService.getErrorMessage(err);
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setIsProcessing(false);
    setUsageExceeded(false);
  }, []);

  return {
    result,
    isProcessing,
    error,
    usageExceeded,
    recognize,
    reset,
  };
}
