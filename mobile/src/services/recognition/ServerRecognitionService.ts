/**
 * Recognition Service
 * Server-based audio recognition using OpenAI
 * Replaces local OpenAI calls
 */
import { apiClient } from '../api/client';

export interface RecognitionMatch {
  surahNumber: number;
  ayahNumber: number;
  confidence: number;
  explanation: string;
}

export interface VerseDetails {
  arabicText: string;
  englishTranslation: string;
  surahName: string;
  surahNameArabic: string;
  surahTranslation?: string;
  surahType?: string;
}

export interface UsageInfo {
  used: number;
  remaining: number;
  limit: number;
  resetAt?: string;
  subscriptionTier?: string;
}

export interface RecognitionResult {
  success: boolean;
  transcription: string;
  match?: RecognitionMatch;
  verse?: VerseDetails;
  usage?: UsageInfo | null;
  message?: string;
  processingTimeMs: number;
}

export interface RecognitionError {
  code: string;
  message: string;
  details?: any;
}

/**
 * Server Recognition Service
 * Handles audio upload and recognition via server API
 */
class ServerRecognitionService {
  /**
   * Recognize Quran verse from audio file
   */
  async recognizeAudio(audioUri: string): Promise<RecognitionResult> {
    try {
      console.log('[Recognition] Starting audio recognition');
      console.log('[Recognition] Audio URI:', audioUri);

      // Create FormData for file upload
      const formData = new FormData();

      // Extract filename from URI or generate one
      const filename = audioUri.split('/').pop() || 'recording.m4a';

      // Append audio file to FormData
      formData.append('audio', {
        uri: audioUri,
        type: 'audio/m4a',
        name: filename,
      } as any);

      console.log('[Recognition] Uploading audio to server...');

      // Upload and process on server
      const response = await apiClient.postFormData<RecognitionResult>(
        '/recognize',
        formData
      );

      console.log('[Recognition] Recognition result:', response);

      if (response.success) {
        console.log('[Recognition] Match found:', response.match);
      } else {
        console.log('[Recognition] No confident match:', response.message);
      }

      return response;
    } catch (error: any) {
      console.error('[Recognition] Recognition error:', error);
      throw this.handleRecognitionError(error);
    }
  }

  /**
   * Validate audio file before upload
   */
  validateAudioFile(audioUri: string, fileSizeBytes?: number): {
    valid: boolean;
    error?: string;
  } {
    // Check if URI is provided
    if (!audioUri) {
      return {
        valid: false,
        error: 'No audio file provided',
      };
    }

    // Check file size if provided (max 10MB as per server config)
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
    if (fileSizeBytes && fileSizeBytes > maxSizeBytes) {
      return {
        valid: false,
        error: `File too large. Maximum size is ${maxSizeBytes / (1024 * 1024)}MB`,
      };
    }

    return {
      valid: true,
    };
  }

  /**
   * Format confidence percentage for display
   */
  formatConfidence(confidence: number): string {
    return `${Math.round(confidence)}%`;
  }

  /**
   * Get confidence level description
   */
  getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
    if (confidence >= 70) return 'high';
    if (confidence >= 50) return 'medium';
    return 'low';
  }

  /**
   * Format verse reference (e.g., "Al-Fatihah 1:1")
   */
  formatVerseReference(surahName: string, surahNumber: number, ayahNumber: number): string {
    return `${surahName} ${surahNumber}:${ayahNumber}`;
  }

  /**
   * Handle recognition errors
   */
  private handleRecognitionError(error: any): RecognitionError {
    const serverError = error.response?.data?.error;
    const status = error.response?.status;

    let code = 'recognition/unknown';
    let message = 'An unknown error occurred during recognition';
    let details = null;

    if (serverError) {
      message = serverError;

      if (message.includes('limit reached') || message.includes('usage limit')) {
        code = 'recognition/limit-reached';
        message = 'Daily/monthly search limit reached. Please upgrade to premium.';
      } else if (message.includes('audio') || message.includes('file')) {
        code = 'recognition/invalid-audio';
        message = 'Invalid audio file. Please try recording again.';
      } else if (message.includes('transcribe') || message.includes('transcription')) {
        code = 'recognition/transcription-failed';
        message = 'Could not transcribe audio. Please speak more clearly.';
      } else if (message.includes('match') || message.includes('verse')) {
        code = 'recognition/no-match';
        message = 'Could not find a matching verse. Please try again.';
      } else if (message.includes('Unauthorized')) {
        code = 'recognition/unauthorized';
        message = 'Session expired. Please login again.';
      }
    } else if (status === 429) {
      code = 'recognition/too-many-requests';
      message = 'Too many requests. Please wait a moment and try again.';
    } else if (status === 401) {
      code = 'recognition/unauthorized';
      message = 'Session expired. Please login again.';
    } else if (status === 500) {
      code = 'recognition/server-error';
      message = 'Server error. Please try again later.';
    } else if (error.message?.includes('Network Error') || !status) {
      code = 'recognition/network-error';
      message = 'Network error. Please check your connection and try again.';
    } else if (error.message?.includes('timeout')) {
      code = 'recognition/timeout';
      message = 'Recognition timed out. Please try with a shorter recording.';
    }

    return {
      code,
      message,
      details: error.response?.data,
    };
  }

  /**
   * Get user-friendly error message
   */
  getErrorMessage(error: RecognitionError): string {
    return error.message;
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error: RecognitionError): boolean {
    const retryableCodes = [
      'recognition/network-error',
      'recognition/timeout',
      'recognition/server-error',
    ];

    return retryableCodes.includes(error.code);
  }
}

// Singleton instance
const serverRecognitionService = new ServerRecognitionService();

export default serverRecognitionService;
