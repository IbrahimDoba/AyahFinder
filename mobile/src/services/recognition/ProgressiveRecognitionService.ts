/**
 * Progressive Recognition Service
 * Handles progressive audio accumulation and matching
 * Listens in 5-second increments until a unique match is found
 *
 * NOTE: Currently disabled in favor of AI-based matching
 */
import { OpenAIService } from '../openai/OpenAIService';
// import { QuranMatchingService, QuranMatch } from '../quran/QuranMatchingService';
import { AIQuranMatchingService } from '../quran/AIQuranMatchingService';
import { AudioChunk } from '../audio/types';

// Temporary type for compatibility
export interface QuranMatch {
  surahNumber: number;
  ayahNumber: number;
  text: string;
  translation: string;
  surahName: string;
  similarity: number;
}

export interface ProgressiveMatchResult {
  isUnique: boolean;
  bestMatch: QuranMatch | null;
  allMatches: QuranMatch[];
  transcribedText: string;
  totalDuration: number;
  chunksProcessed: number;
}

export class ProgressiveRecognitionService {
  private static instance: ProgressiveRecognitionService;
  private openAIService: OpenAIService;
  private aiMatchingService: AIQuranMatchingService;

  // State for progressive matching
  private accumulatedChunks: AudioChunk[] = [];
  private accumulatedTranscription: string = '';

  private constructor() {
    this.openAIService = OpenAIService.getInstance();
    this.aiMatchingService = AIQuranMatchingService.getInstance();
  }

  static getInstance(): ProgressiveRecognitionService {
    if (!ProgressiveRecognitionService.instance) {
      ProgressiveRecognitionService.instance = new ProgressiveRecognitionService();
    }
    return ProgressiveRecognitionService.instance;
  }

  /**
   * Reset the service state (call this when starting a new recognition session)
   */
  reset(): void {
    this.accumulatedChunks = [];
    this.accumulatedTranscription = '';
    console.log('ProgressiveRecognitionService: Reset state');
  }

  /**
   * Process a new audio chunk and check for matches
   * Returns whether we found a unique match
   */
  async processChunk(chunk: AudioChunk): Promise<ProgressiveMatchResult> {
    console.log(`Processing chunk ${chunk.chunkIndex} (${chunk.duration}ms)`);

    // Add chunk to accumulated chunks
    this.accumulatedChunks.push(chunk);

    try {
      // Transcribe the new chunk
      const transcription = await this.openAIService.transcribeAudio(chunk.uri);
      console.log(`Chunk ${chunk.chunkIndex} transcription:`, transcription.text);

      // Accumulate transcription (add space between chunks)
      if (this.accumulatedTranscription) {
        this.accumulatedTranscription += ' ' + transcription.text;
      } else {
        this.accumulatedTranscription = transcription.text;
      }

      console.log('Accumulated transcription:', this.accumulatedTranscription);

      // Find all matches for the accumulated transcription
      const allMatches = this.quranMatchingService.findAllMatches(
        this.accumulatedTranscription,
        0.5 // Lower threshold to catch more potential matches
      );

      console.log(`Found ${allMatches.length} potential matches`);

      // Check if we have a unique match
      const isUnique = this.isUniqueMatch(allMatches);
      const bestMatch = allMatches.length > 0 ? allMatches[0] : null;

      const totalDuration = this.accumulatedChunks.reduce(
        (sum, c) => sum + c.duration,
        0
      );

      const result: ProgressiveMatchResult = {
        isUnique,
        bestMatch,
        allMatches,
        transcribedText: this.accumulatedTranscription,
        totalDuration,
        chunksProcessed: this.accumulatedChunks.length,
      };

      if (isUnique && bestMatch) {
        console.log(
          `✅ Unique match found: ${bestMatch.surahName} ${bestMatch.ayahNumber} (${(bestMatch.similarity * 100).toFixed(1)}%)`
        );
      } else if (allMatches.length > 1) {
        console.log(
          `⚠️ Ambiguous - ${allMatches.length} matches found. Need more audio...`
        );
        allMatches.slice(0, 3).forEach((match, i) => {
          console.log(
            `  ${i + 1}. ${match.surahName} ${match.ayahNumber} (${(match.similarity * 100).toFixed(1)}%)`
          );
        });
      } else if (allMatches.length === 0) {
        console.log('❌ No matches found. Need more audio...');
      }

      return result;
    } catch (error) {
      console.error('Error processing chunk:', error);
      throw error;
    }
  }

  /**
   * Check if we have a unique match
   * A match is considered unique if:
   * 1. We have at least one match
   * 2. The top match has significantly higher score than the second match
   */
  private isUniqueMatch(matches: QuranMatch[]): boolean {
    if (matches.length === 0) return false;
    if (matches.length === 1) return matches[0].similarity >= 0.7;

    const topScore = matches[0].similarity;
    const secondScore = matches[1].similarity;

    // Require top match to be at least 0.7 AND significantly better than second
    return topScore >= 0.7 && (topScore - secondScore) >= 0.15;
  }

  /**
   * Get the current accumulated transcription
   */
  getAccumulatedTranscription(): string {
    return this.accumulatedTranscription;
  }

  /**
   * Get the number of chunks processed
   */
  getChunksProcessed(): number {
    return this.accumulatedChunks.length;
  }

  /**
   * Get total duration of accumulated audio
   */
  getTotalDuration(): number {
    return this.accumulatedChunks.reduce((sum, c) => sum + c.duration, 0);
  }
}
