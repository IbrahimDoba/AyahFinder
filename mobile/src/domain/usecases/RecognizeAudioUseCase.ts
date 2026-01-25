/**
 * Recognize Audio Use Case
 * Business logic for audio recognition
 */
import { RecognitionResult } from '../entities/RecognitionResult';
import { IRecognitionRepository } from '../repositories/IRecognitionRepository';

export interface RecognizeAudioInput {
  audioUri: string;
  duration: number;
  format: string;
}

export class RecognizeAudioUseCase {
  constructor(private recognitionRepository: IRecognitionRepository) {}

  async execute(input: RecognizeAudioInput): Promise<RecognitionResult> {
    // Validate input
    if (!input.audioUri) {
      throw new Error('Audio URI is required');
    }

    if (input.duration < 3000) {
      throw new Error('Audio duration must be at least 3 seconds');
    }

    if (input.duration > 30000) {
      throw new Error('Audio duration must be less than 30 seconds');
    }

    // Execute recognition
    const result = await this.recognitionRepository.recognizeAudio({
      audioUri: input.audioUri,
      duration: input.duration,
      format: input.format,
    });

    return result;
  }
}
