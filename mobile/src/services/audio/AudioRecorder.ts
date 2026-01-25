/**
 * Audio Recorder Service
 * Handles audio recording using expo-av
 */
import { Audio } from 'expo-av';
import { AUDIO_CONFIG } from '@/constants/config';
import type {
  AudioRecording,
  RecordingConfig,
  RecordingStatus,
  AudioChunk,
  ChunkingConfig,
  OnChunkReadyCallback,
} from './types';

export class AudioRecorder {
  private recording: Audio.Recording | null = null;
  private config: RecordingConfig;
  private status: RecordingStatus = 'idle';
  private autoStopTimer: NodeJS.Timeout | null = null;
  private onAutoStop?: () => void;

  // Real-time chunking support
  private chunkingConfig: ChunkingConfig = {
    chunkInterval: 5000, // Default: 5 seconds
    enabled: false,
  };
  private chunkTimer: NodeJS.Timeout | null = null;
  private onChunkReady?: OnChunkReadyCallback;
  private chunkIndex: number = 0;
  private recordingStartTime: number = 0;
  private totalRecordingDuration: number = 0;
  private isStoppingChunks: boolean = false; // Flag to prevent new chunks

  constructor(config?: Partial<RecordingConfig>) {
    this.config = {
      sampleRate: config?.sampleRate ?? AUDIO_CONFIG.SAMPLE_RATE,
      numberOfChannels: config?.numberOfChannels ?? AUDIO_CONFIG.CHANNELS,
      bitDepth: config?.bitDepth ?? AUDIO_CONFIG.BIT_DEPTH,
      minDuration: config?.minDuration ?? AUDIO_CONFIG.MIN_DURATION,
      maxDuration: config?.maxDuration ?? AUDIO_CONFIG.MAX_DURATION,
    };
  }

  /**
   * Request microphone permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }

  /**
   * Set callback for auto-stop
   */
  setOnAutoStop(callback: () => void): void {
    this.onAutoStop = callback;
  }

  /**
   * Start recording audio
   */
  async startRecording(): Promise<void> {
    try {
      // Check permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('MICROPHONE_PERMISSION_DENIED');
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Create recording with config
      const { recording } = await Audio.Recording.createAsync(
        {
          isMeteringEnabled: true,
          android: {
            extension: '.m4a',
            outputFormat: Audio.AndroidOutputFormat.MPEG_4,
            audioEncoder: Audio.AndroidAudioEncoder.AAC,
            sampleRate: this.config.sampleRate,
            numberOfChannels: this.config.numberOfChannels,
            bitRate: 128000,
          },
          ios: {
            extension: '.m4a',
            outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
            audioQuality: Audio.IOSAudioQuality.HIGH,
            sampleRate: this.config.sampleRate,
            numberOfChannels: this.config.numberOfChannels,
            bitRate: 128000,
            linearPCMBitDepth: this.config.bitDepth,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
          },
          web: {
            mimeType: 'audio/wav',
            bitsPerSecond: 128000,
          },
        },
        undefined, // onRecordingStatusUpdate callback
        100 // updateIntervalMillis
      );

      this.recording = recording;
      this.status = 'recording';

      // Auto-stop at max duration (with 1 second buffer for safety)
      this.autoStopTimer = setTimeout(() => {
        if (this.onAutoStop) {
          this.onAutoStop();
        }
      }, this.config.maxDuration - 1000);
    } catch (error) {
      this.status = 'error';
      throw error;
    }
  }

  /**
   * Stop recording and return audio file info
   */
  async stopRecording(): Promise<AudioRecording> {
    try {
      // Clear auto-stop timer
      if (this.autoStopTimer) {
        clearTimeout(this.autoStopTimer);
        this.autoStopTimer = null;
      }

      if (!this.recording) {
        throw new Error('NO_ACTIVE_RECORDING');
      }

      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      const recordingStatus = await this.recording.getStatusAsync();

      if (!uri) {
        throw new Error('RECORDING_URI_NULL');
      }

      // Get file info
      const duration = recordingStatus.durationMillis || 0;

      // Validate duration (with 1.5s buffer for auto-stop timing)
      if (duration < this.config.minDuration) {
        throw new Error('RECORDING_TOO_SHORT');
      }

      if (duration > this.config.maxDuration + 1500) {
        throw new Error('RECORDING_TOO_LONG');
      }

      const result: AudioRecording = {
        uri,
        duration,
        size: 0, // Will be calculated if needed
        format: 'm4a',
      };

      // Reset state
      this.recording = null;
      this.status = 'stopped';

      return result;
    } catch (error) {
      this.status = 'error';
      throw error;
    }
  }

  /**
   * Cancel recording without saving
   */
  async cancelRecording(): Promise<void> {
    // Clear auto-stop timer
    if (this.autoStopTimer) {
      clearTimeout(this.autoStopTimer);
      this.autoStopTimer = null;
    }

    if (this.recording) {
      await this.recording.stopAndUnloadAsync();
      this.recording = null;
    }
    this.status = 'idle';
  }

  /**
   * Get current recording status
   */
  getStatus(): RecordingStatus {
    return this.status;
  }

  /**
   * Get current recording duration
   */
  async getDuration(): Promise<number> {
    if (!this.recording) {
      return 0;
    }

    const status = await this.recording.getStatusAsync();
    return status.durationMillis || 0;
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.status === 'recording';
  }

  /**
   * Enable real-time chunking
   * When enabled, audio will be split into chunks and sent via callback
   */
  enableChunking(
    config: Partial<ChunkingConfig>,
    callback: OnChunkReadyCallback
  ): void {
    this.chunkingConfig = {
      chunkInterval: config.chunkInterval ?? 5000,
      enabled: true,
    };
    this.onChunkReady = callback;
  }

  /**
   * Disable real-time chunking
   */
  disableChunking(): void {
    console.log('🛑 Disabling chunking');
    this.isStoppingChunks = true; // Stop creating new chunks immediately
    this.chunkingConfig.enabled = false;
    this.onChunkReady = undefined;
    if (this.chunkTimer) {
      clearInterval(this.chunkTimer);
      this.chunkTimer = null;
    }
  }

  /**
   * Start chunked recording
   * This will automatically create and emit chunks at the specified interval
   */
  async startChunkedRecording(): Promise<void> {
    if (!this.chunkingConfig.enabled || !this.onChunkReady) {
      throw new Error('Chunking not enabled. Call enableChunking() first.');
    }

    // Reset chunk tracking
    this.chunkIndex = 0;
    this.recordingStartTime = Date.now();
    this.totalRecordingDuration = 0;
    this.isStoppingChunks = false; // Reset stopping flag

    // Start the first chunk
    await this.startRecording();

    // Set up chunk timer
    this.chunkTimer = setInterval(async () => {
      await this.createNextChunk();
    }, this.chunkingConfig.chunkInterval);
  }

  /**
   * Create the next chunk by stopping current recording and starting a new one
   * This is called automatically by the chunk timer
   */
  private async createNextChunk(): Promise<void> {
    try {
      // Check if we're being stopped
      if (this.isStoppingChunks) {
        console.log('🛑 Stopping chunks, not creating next chunk');
        return;
      }

      if (!this.recording || !this.onChunkReady) {
        return;
      }

      // Stop current recording and get the chunk
      const status = await this.recording.getStatusAsync();
      const chunkStartTime = this.totalRecordingDuration;

      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();

      if (!uri) {
        console.error('Failed to get chunk URI');
        return;
      }

      const chunkDuration = status.durationMillis || 0;
      this.totalRecordingDuration += chunkDuration;

      // Create chunk object
      const chunk: AudioChunk = {
        uri,
        duration: chunkDuration,
        chunkIndex: this.chunkIndex,
        startTime: chunkStartTime,
        format: 'm4a',
      };

      // Increment chunk index
      this.chunkIndex++;

      // Emit the chunk via callback
      this.onChunkReady(chunk);

      // Check again if we should continue (callback might have stopped us)
      if (this.isStoppingChunks) {
        console.log('🛑 Stopped while processing chunk, not starting next recording');
        return;
      }

      // Start the next recording immediately (if still within max duration)
      if (this.totalRecordingDuration < this.config.maxDuration) {
        await this.startRecording();
      } else {
        // Max duration reached, stop chunking
        this.stopChunkedRecording();
        if (this.onAutoStop) {
          this.onAutoStop();
        }
      }
    } catch (error) {
      console.error('Error creating chunk:', error);
      this.status = 'error';
    }
  }

  /**
   * Stop chunked recording
   */
  async stopChunkedRecording(): Promise<AudioChunk | null> {
    console.log('🛑 stopChunkedRecording called');

    // CRITICAL: Stop creating new chunks IMMEDIATELY
    this.isStoppingChunks = true;

    try {
      // Clear chunk timer first
      if (this.chunkTimer) {
        console.log('⏹️ Clearing chunk timer');
        clearInterval(this.chunkTimer);
        this.chunkTimer = null;
      }

      // Clear auto-stop timer
      if (this.autoStopTimer) {
        console.log('⏹️ Clearing auto-stop timer');
        clearTimeout(this.autoStopTimer);
        this.autoStopTimer = null;
      }

      // Check if already stopped
      if (!this.recording || this.status === 'stopped' || this.status === 'idle') {
        console.log('⚠️ Recording already stopped, cleaning up state');
        this.recording = null;
        this.status = 'stopped';
        this.chunkIndex = 0;
        this.totalRecordingDuration = 0;
        return null;
      }

      // Get the final chunk
      const status = await this.recording.getStatusAsync();
      console.log('📊 Recording status:', {
        isRecording: status.isRecording,
        isDoneRecording: status.isDoneRecording
      });

      // Check if recording is actually active before stopping
      if (!status.isRecording && !status.isDoneRecording) {
        console.log('⚠️ Recording not active, cleaning up');
        this.recording = null;
        this.status = 'stopped';
        this.chunkIndex = 0;
        this.totalRecordingDuration = 0;
        return null;
      }

      const chunkStartTime = this.totalRecordingDuration;

      console.log('🔴 Stopping and unloading recording...');
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();

      if (!uri) {
        console.log('⚠️ No URI found for final chunk');
        this.recording = null;
        this.status = 'stopped';
        this.chunkIndex = 0;
        this.totalRecordingDuration = 0;
        return null;
      }

      const chunkDuration = status.durationMillis || 0;

      const finalChunk: AudioChunk = {
        uri,
        duration: chunkDuration,
        chunkIndex: this.chunkIndex,
        startTime: chunkStartTime,
        format: 'm4a',
      };

      // Reset state
      this.recording = null;
      this.status = 'stopped';
      this.chunkIndex = 0;
      this.totalRecordingDuration = 0;

      console.log('✅ Chunked recording stopped successfully');
      return finalChunk;
    } catch (error) {
      console.error('❌ Error stopping chunked recording:', error);

      // Force cleanup on error
      this.status = 'stopped';
      this.recording = null;
      this.chunkIndex = 0;
      this.totalRecordingDuration = 0;

      if (this.chunkTimer) {
        clearInterval(this.chunkTimer);
        this.chunkTimer = null;
      }
      if (this.autoStopTimer) {
        clearTimeout(this.autoStopTimer);
        this.autoStopTimer = null;
      }

      return null;
    }
  }

  /**
   * Get total recording duration (for chunked recordings)
   */
  getTotalDuration(): number {
    return this.totalRecordingDuration;
  }
}
