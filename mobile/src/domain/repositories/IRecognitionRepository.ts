/**
 * Recognition Repository Interface
 * Defines contract for audio recognition service
 */
import { RecognitionResult } from '../entities/RecognitionResult';

export interface RecognizeAudioParams {
  audioUri: string;
  duration: number;
  format: string;
}

export interface IRecognitionRepository {
  /**
   * Recognize audio and return matched Ayah
   */
  recognizeAudio(params: RecognizeAudioParams): Promise<RecognitionResult>;

  /**
   * Continue listening for ambiguous matches
   */
  continueListening(
    sessionId: string,
    additionalAudioUri: string
  ): Promise<RecognitionResult>;
}
