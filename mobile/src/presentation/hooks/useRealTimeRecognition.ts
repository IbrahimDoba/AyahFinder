/**
 * Real-Time Recognition Hook
 * Handles continuous audio recognition with auto-navigation
 * NOTE: Progressive matching temporarily disabled for debugging
 */
import { useState, useRef, useCallback } from 'react';
import { RecognitionResult } from '@/domain/entities/RecognitionResult';
import { RecognizeAudioUseCase } from '@/domain/usecases/RecognizeAudioUseCase';
import { RecognitionRepositoryImpl } from '@/data/repositories/RecognitionRepositoryImpl';
import { RecognitionApiDataSource } from '@/data/datasources/remote/RecognitionApiDataSource';
import { AudioChunk } from '@/services/audio/types';
import { REALTIME_MATCHING_CONFIG } from '@/constants/config';
// import * as Haptics from 'expo-haptics';

interface PartialMatch {
  surahNumber: number;
  ayahNumber: number;
  confidence: number;
  timestamp: number;
}

interface UseRealTimeRecognitionReturn {
  // State
  isMatching: boolean;
  matchingConfidence: number;
  partialMatches: PartialMatch[];
  chunksSent: number;

  // Methods
  startMatching: (onMatch: (result: RecognitionResult) => void) => void;
  stopMatching: () => void;
  processChunk: (chunk: AudioChunk) => Promise<void>;
  reset: () => void;
}

export function useRealTimeRecognition(): UseRealTimeRecognitionReturn {
  const [isMatching, setIsMatching] = useState(false);
  const [matchingConfidence, setMatchingConfidence] = useState(0);
  const [partialMatches, setPartialMatches] = useState<PartialMatch[]>([]);
  const [chunksSent, setChunksSent] = useState(0);

  // Refs for callbacks and API
  const isMatchingRef = useRef(false); // Use ref for immediate updates
  const onMatchCallback = useRef<((result: RecognitionResult) => void) | null>(
    null
  );
  const pendingRequests = useRef<Set<number>>(new Set());
  const recognizeUseCase = useRef(
    new RecognizeAudioUseCase(
      new RecognitionRepositoryImpl(new RecognitionApiDataSource())
    )
  );

  /**
   * Start real-time matching
   */
  const startMatching = useCallback(
    (onMatch: (result: RecognitionResult) => void) => {
      isMatchingRef.current = true; // Set ref immediately
      setIsMatching(true);
      setMatchingConfidence(0);
      setPartialMatches([]);
      setChunksSent(0);
      onMatchCallback.current = onMatch;
      pendingRequests.current.clear();

      console.log('🎙️ Started recognition session');
    },
    []
  );

  /**
   * Stop real-time matching
   * NOTE: We don't clear the callback here - let pending requests finish
   * Callback will be replaced when starting a new session
   */
  const stopMatching = useCallback(() => {
    console.log('🛑 stopMatching called - stopping new chunks only');
    isMatchingRef.current = false; // Clear ref immediately to prevent new chunks
    setIsMatching(false);
    // DON'T clear callback or pending requests - let them complete
    // pendingRequests.current.clear();
  }, []);

  /**
   * Process an audio chunk
   */
  const processChunk = useCallback(
    async (chunk: AudioChunk) => {
      if (!isMatchingRef.current) {
        console.log(`⚠️ Skipping chunk ${chunk.chunkIndex} - not matching (isMatchingRef = false)`);
        return;
      }

      // Check concurrent request limit
      if (
        pendingRequests.current.size >=
        REALTIME_MATCHING_CONFIG.MAX_CONCURRENT_REQUESTS
      ) {
        console.log(
          `Skipping chunk ${chunk.chunkIndex} - too many pending requests`
        );
        return;
      }

      const chunkId = chunk.chunkIndex;
      pendingRequests.current.add(chunkId);
      setChunksSent(prev => prev + 1);

      try {
        console.log(
          `Processing chunk ${chunk.chunkIndex} (${chunk.duration}ms)`
        );

        // Convert AudioChunk to AudioRecording format for the use case
        const audioRecording = {
          audioUri: chunk.uri,
          duration: chunk.duration,
          format: chunk.format,
        };

        // Call recognition API with timeout
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Chunk timeout')),
            REALTIME_MATCHING_CONFIG.REQUEST_TIMEOUT
          )
        );

        const result = (await Promise.race([
          recognizeUseCase.current.execute(audioRecording),
          timeoutPromise,
        ])) as RecognitionResult;

        // Remove from pending
        pendingRequests.current.delete(chunkId);

        if (!result.success || !result.ayah) {
          console.log(`Chunk ${chunk.chunkIndex}: No match`);
          setMatchingConfidence(0);
          return;
        }

        const confidence = result.confidence;
        console.log(
          `Chunk ${chunk.chunkIndex}: Match found - ${result.surah?.nameTransliteration} ${result.ayah?.ayahNumber} (${(confidence * 100).toFixed(1)}%)`
        );

        // Update confidence display
        setMatchingConfidence(Math.round(confidence * 100));

        // Track partial match
        if (confidence >= REALTIME_MATCHING_CONFIG.MIN_CONFIDENCE_TO_SHOW) {
          const partialMatch: PartialMatch = {
            surahNumber: result.surah?.number || 0,
            ayahNumber: result.ayah?.ayahNumber || 0,
            confidence,
            timestamp: Date.now(),
          };

          setPartialMatches(prev => [...prev.slice(-2), partialMatch]); // Keep last 3
        }

        // Check if confidence meets threshold for auto-navigation
        if (confidence >= REALTIME_MATCHING_CONFIG.CONFIDENCE_THRESHOLD) {
          console.log('✅ MATCH FOUND - Auto-navigating!');
          console.log('🔔 Callback exists?', !!onMatchCallback.current);
          console.log('📍 Match details:', {
            surah: result.surah?.number,
            ayah: result.ayah?.ayahNumber,
            confidence: confidence,
          });

          // Haptic feedback
          // if (REALTIME_MATCHING_CONFIG.HAPTIC_FEEDBACK_ON_MATCH) {
          //   Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          // }

          // Trigger callback
          if (onMatchCallback.current) {
            console.log('🚀 Calling onMatchCallback...');
            onMatchCallback.current(result);
            console.log('✅ Callback executed');
          } else {
            console.error('❌ No callback registered!');
          }

          // Stop matching after successful match
          if (REALTIME_MATCHING_CONFIG.AUTO_STOP_ON_MATCH) {
            stopMatching();
          }
        }
      } catch (error) {
        pendingRequests.current.delete(chunkId);
        console.error(`Error processing chunk ${chunk.chunkIndex}:`, error);
        // Continue matching even on error
      }
    },
    [stopMatching]
  );

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setIsMatching(false);
    setMatchingConfidence(0);
    setPartialMatches([]);
    setChunksSent(0);
    onMatchCallback.current = null;
    pendingRequests.current.clear();
  }, []);

  return {
    isMatching,
    matchingConfidence,
    partialMatches,
    chunksSent,
    startMatching,
    stopMatching,
    processChunk,
    reset,
  };
}
