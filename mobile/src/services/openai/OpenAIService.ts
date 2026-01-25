import { API_KEYS } from '@/constants/apiKeys';

export interface TranscriptionResult {
  text: string;
  language: string;
  duration: number;
}

export class OpenAIService {
  private static instance: OpenAIService;
  private apiKey: string;

  private constructor() {
    this.apiKey = API_KEYS.OPENAI_API_KEY;
    if (!this.apiKey) {
      console.warn('OpenAIService: No API key configured in src/constants/apiKeys.ts');
    } else {
      console.log('OpenAIService: Initialized with API key');
    }
  }

  /**
   * Set the OpenAI API key (optional - can override the default)
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Get the current API key
   */
  getApiKey(): string {
    return this.apiKey;
  }

  static getInstance(): OpenAIService {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService();
    }
    return OpenAIService.instance;
  }

  /**
   * Transcribe audio using OpenAI Whisper API
   * @param audioUri URI of the audio file
   */
  async transcribeAudio(audioUri: string): Promise<TranscriptionResult> {
    try {
      if (!this.apiKey) {
        throw new Error(
          'OpenAI API Key is missing. Please check your .env file.'
        );
      }

      const formData = new FormData();

      console.log('Transcribing audio from URI:', audioUri);

      formData.append('file', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      } as any);
      formData.append('model', 'whisper-1');
      formData.append('language', 'ar'); // Force Arabic for Quran

      console.log('Sending request to OpenAI Whisper API...');

      const response = await fetch(
        'https://api.openai.com/v1/audio/transcriptions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            // Don't set Content-Type for FormData - let the browser set it with boundary
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Transcription successful:', data.text);
      return {
        text: data.text,
        language: 'ar',
        duration: data.duration || 0,
      };
    } catch (error) {
      console.error('OpenAIService Error:', error);
      throw error;
    }
  }
}
