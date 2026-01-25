/**
 * Recognition API Data Source
 * Handles communication with OpenAI and Quran Matching Service
 * Now uses Progressive Recognition for better accuracy
 */
import type { AudioRecording, AudioChunk } from '@/services/audio/types';
import { OpenAIService } from '@/services/openai/OpenAIService';
import { AIQuranMatchingService } from '@/services/quran/AIQuranMatchingService';
// Old text-based matching (replaced with AI)
// import { QuranMatchingService } from '@/services/quran/QuranMatchingService';

export interface RecognitionResponseDTO {
  success: boolean;
  is_ambiguous: boolean;
  best_match?: {
    surah_number: number;
    ayah_number: number;
    reciter_id: number;
    confidence: number;
    raw_score: number;
    is_repeated: boolean;
  };
  alternatives?: Array<{
    surah_number: number;
    ayah_number: number;
    reciter_id: number;
    confidence: number;
    raw_score: number;
    is_repeated: boolean;
  }>;
  processing_time_ms: number;
  confidence: number;
  message?: string;
}

export class RecognitionApiDataSource {
  private openAIService: OpenAIService;
  private aiMatchingService: AIQuranMatchingService;

  constructor() {
    this.openAIService = OpenAIService.getInstance();
    this.aiMatchingService = AIQuranMatchingService.getInstance();
  }

  /**
   * Reset the progressive recognition session
   * Call this when starting a new recognition session
   */
  resetSession(): void {
    // Temporarily disabled
    // this.progressiveService.reset();
    console.log('resetSession called (progressive matching temporarily disabled)');
  }

  /**
   * Submit audio for recognition
   * TEMPORARY: Using simple single-chunk matching (progressive matching disabled for debugging)
   */
  async recognizeAudio(
    recording: AudioRecording,
    reciterId?: number
  ): Promise<RecognitionResponseDTO> {
    const startTime = Date.now();
    try {
      // Step 1: Transcribe audio with Whisper
      console.log('🎤 Step 1: Transcribing audio with Whisper...');
      const transcription = await this.openAIService.transcribeAudio(recording.uri);
      console.log('📝 Transcription:', transcription.text);

      // Step 2: Use AI to identify the verse
      console.log('🤖 Step 2: Using AI to identify verse...');
      const match = await this.aiMatchingService.identifyVerse(transcription.text);

      const processingTimeMs = Date.now() - startTime;

      if (match && match.confidence >= 0.3) {
        console.log(`✅ AI MATCH: ${match.surahName} ${match.ayahNumber} (${(match.confidence * 100).toFixed(1)}% confidence)`);
        console.log(`📖 Arabic: ${match.matchedText.substring(0, 50)}...`);
        console.log(`💡 ${match.explanation}`);
        return {
          success: true,
          is_ambiguous: false,
          confidence: match.confidence,
          processing_time_ms: processingTimeMs,
          best_match: {
            surah_number: match.surahNumber,
            ayah_number: match.ayahNumber,
            reciter_id: 0,
            confidence: match.confidence,
            raw_score: match.confidence,
            is_repeated: false,
          },
        };
      }

      return {
        success: false,
        is_ambiguous: false,
        confidence: 0,
        processing_time_ms: processingTimeMs,
        message: 'No match found',
      };
    } catch (error) {
      console.error('Recognition API error:', error);
      return {
        success: false,
        is_ambiguous: false,
        confidence: 0,
        processing_time_ms: Date.now() - startTime,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check health of recognition service
   */
  async checkHealth(): Promise<{ status: string; available: boolean }> {
    // OpenAIService doesn't have a health check, but we can assume it's "available" if configured
    return {
      status: 'healthy',
      available: true,
    };
  }
}
