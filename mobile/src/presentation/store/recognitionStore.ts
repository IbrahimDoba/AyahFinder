/**
 * Recognition Store
 * Global state for audio recognition
 */
import { create } from 'zustand';
import { RecognitionResult } from '@/domain/entities/RecognitionResult';
import type { AudioRecording } from '@/services/audio/types';

interface RecognitionState {
  // State
  isRecording: boolean;
  isProcessing: boolean;
  result: RecognitionResult | null;
  recording: AudioRecording | null;
  error: string | null;

  // Actions
  setRecording: (isRecording: boolean) => void;
  setProcessing: (isProcessing: boolean) => void;
  setRecordingData: (recording: AudioRecording | null) => void;
  setResult: (result: RecognitionResult | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useRecognitionStore = create<RecognitionState>((set) => ({
  // Initial state
  isRecording: false,
  isProcessing: false,
  result: null,
  recording: null,
  error: null,

  // Actions
  setRecording: (isRecording) => set({ isRecording, error: null }),
  setProcessing: (isProcessing) => set({ isProcessing }),
  setRecordingData: (recording) => set({ recording }),
  setResult: (result) => set({ result, isProcessing: false }),
  setError: (error) => set({ error, isProcessing: false, isRecording: false }),
  reset: () => set({
    isRecording: false,
    isProcessing: false,
    result: null,
    recording: null,
    error: null,
  }),
}));
