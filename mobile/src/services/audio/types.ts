/**
 * Audio Service Types
 */

export interface AudioRecording {
  uri: string;
  duration: number;
  size: number;
  format: string;
}

export interface RecordingConfig {
  sampleRate: number;
  numberOfChannels: number;
  bitDepth: number;
  minDuration: number;
  maxDuration: number;
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  error: string | null;
}

export type RecordingStatus =
  | 'idle'
  | 'recording'
  | 'paused'
  | 'stopped'
  | 'error';

export interface AudioChunk {
  uri: string;
  duration: number;
  chunkIndex: number;
  startTime: number; // When this chunk started in the overall recording
  format: string;
}

export interface ChunkingConfig {
  chunkInterval: number; // Milliseconds between chunks
  enabled: boolean;
}

export type OnChunkReadyCallback = (chunk: AudioChunk) => void;
