/**
 * Real-Time Recognition Hook
 * Handles continuous audio recognition with auto-navigation
 * NOTE: Server-based version processes full audio instead of chunks
 */
import { useState, useRef, useCallback } from 'react';
import serverRecognitionService from '@/services/recognition/ServerRecognitionService';
import { RecognitionResult } from '@/domain/entities/RecognitionResult';
import serverUsageService from '@/services/usage/ServerUsageService';
import { AudioChunk } from '@/services/audio/types';
import { REALTIME_MATCHING_CONFIG } from '@/constants/config';

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

  // Refs for callbacks and state
  const isMatchingRef = useRef(false);
  const onMatchCallback = useRef<((result: RecognitionResult) => void) | null>(
    null
  );
  const pendingRequests = useRef<Set<number>>(new Set());
  const lastProcessedChunk = useRef<number>(0);

  /**
   * Start real-time matching
   */
  const startMatching = useCallback(
    (onMatch: (result: RecognitionResult) => void) => {
      isMatchingRef.current = true;
      setIsMatching(true);
      setMatchingConfidence(0);
      setPartialMatches([]);
      setChunksSent(0);
      lastProcessedChunk.current = 0;
      onMatchCallback.current = onMatch;
      pendingRequests.current.clear();

      console.log('🎙️ Started real-time recognition session');
    },
    []
  );

  /**
   * Stop real-time matching
   */
  const stopMatching = useCallback(() => {
    console.log('🛑 Stopping real-time recognition');
    isMatchingRef.current = false;
    setIsMatching(false);
  }, []);

  /**
   * Process an audio chunk
   * Note: Server processes full audio file, not streaming chunks
   */
  const processChunk = useCallback(
    async (chunk: AudioChunk) => {
      if (!isMatchingRef.current) {
        console.log(`⚠️ Skipping chunk ${chunk.chunkIndex} - not matching`);
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

      // Skip if we've already processed a recent chunk (rate limiting)
      const now = Date.now();
      if (
        lastProcessedChunk.current &&
        now - lastProcessedChunk.current < 5000
      ) {
        console.log(`Skipping chunk ${chunk.chunkIndex} - rate limited (5s)`);
        return;
      }

      const chunkId = chunk.chunkIndex;
      pendingRequests.current.add(chunkId);
      setChunksSent(prev => prev + 1);
      lastProcessedChunk.current = now;

      try {
        console.log(
          `Processing chunk ${chunk.chunkIndex} (${chunk.duration}ms)`
        );

        // Check usage before sending
        const usageCheck = await serverUsageService.canPerformSearch();
        if (!usageCheck.allowed) {
          console.log('Usage limit reached');
          pendingRequests.current.delete(chunkId);
          stopMatching();
          return;
        }

        // Send audio to server for recognition
        const result = await serverRecognitionService.recognizeAudio(chunk.uri);

        // Remove from pending
        pendingRequests.current.delete(chunkId);

        if (!result.success || !result.match) {
          console.log(`Chunk ${chunk.chunkIndex}: No match`);
          setMatchingConfidence(0);
          return;
        }

        const confidence = result.match.confidence;
        console.log(
          `Chunk ${chunk.chunkIndex}: Match found - Surah ${result.match.surahNumber}, Ayah ${result.match.ayahNumber} (${confidence}%)`
        );

        // Update confidence display
        setMatchingConfidence(confidence);

        // Track partial match
        if (
          confidence >=
          REALTIME_MATCHING_CONFIG.MIN_CONFIDENCE_TO_SHOW * 100
        ) {
          const partialMatch: PartialMatch = {
            surahNumber: result.match.surahNumber,
            ayahNumber: result.match.ayahNumber,
            confidence: confidence / 100,
            timestamp: Date.now(),
          };

          setPartialMatches(prev => [...prev.slice(-2), partialMatch]); // Keep last 3
        }

        // Check if confidence meets threshold for auto-navigation
        if (confidence >= REALTIME_MATCHING_CONFIG.CONFIDENCE_THRESHOLD * 100) {
          console.log('✅ MATCH FOUND - Mapping to Domain Entity...');

          // Map Server DTO to Domain Entity
          const domainResult = {
            success: true,
            isAmbiguous: false,
            confidence: confidence / 100,
            processingTimeMs: result.processingTimeMs,
            surah: {
              id: result.match.surahNumber,
              number: result.match.surahNumber,
              nameArabic: result.verse?.surahNameArabic || '',
              nameEnglish: result.verse?.surahTranslation || '',
              nameTransliteration: result.verse?.surahName || '',
              revelationType: (result.verse?.surahType?.toLowerCase() ===
              'medinan'
                ? 'medinan'
                : 'meccan') as any,
              ayahCount: 0, // Not provided by recognition API
            },
            ayah: {
              id: 0,
              surahId: result.match.surahNumber,
              surahNumber: result.match.surahNumber,
              ayahNumber: result.match.ayahNumber,
              textArabic: result.verse?.arabicText || '',
              juzNumber: 0,
              pageNumber: 0,
            },
          };

          console.log('📍 Match details:', {
            surah: domainResult.surah.number,
            ayah: domainResult.ayah.ayahNumber,
            confidence: confidence,
          });

          // Trigger callback with mapped domain entity
          if (onMatchCallback.current) {
            console.log('🚀 Calling onMatchCallback...');
            onMatchCallback.current(domainResult as RecognitionResult);
            console.log('✅ Callback executed');
          } else {
            console.error('❌ No callback registered!');
          }

          // Stop matching after successful match
          if (REALTIME_MATCHING_CONFIG.AUTO_STOP_ON_MATCH) {
            stopMatching();
          }
        }
      } catch (error: any) {
        pendingRequests.current.delete(chunkId);
        console.error(`Error processing chunk ${chunk.chunkIndex}:`, error);

        // If usage limit reached, stop matching
        if (error.code === 'recognition/limit-reached') {
          stopMatching();
        }
        // Continue matching on other errors
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
    lastProcessedChunk.current = 0;
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
